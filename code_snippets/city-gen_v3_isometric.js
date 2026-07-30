// Procedural City — v3, isometric view (stage 3 of 5)
// The flat map becomes an isometric scene: cells are drawn strictly back
// to front, buildings gain floors, three shaded faces, deterministic
// windows and roofs. Rendering is direct (no buffers yet), daytime only.
// Controls: click / [R] — new city.

const FACADES = {
  tower: ['#8aa2c0', '#7590b2', '#9db1c9', '#6f87a6'],
  mid:   ['#b8a48e', '#a9938b', '#9aa48e', '#b0a79b'],
  house: ['#c9b299', '#b8a08a', '#c2a9a0', '#a8b39c']
};
const ROOFS = ['#a45a4a', '#8a4a3e', '#7c5a46', '#5f6d5a'];

let gridSize = 22;
let seed;
let colType = [], rowType = [];
let city = [];
let TW, TH, FLOOR_H, OX, OY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  regenerate();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background('#dfeef7');
  TW = min(width * 0.94 / gridSize, (height * 0.60) / (gridSize * 0.5));
  TH = TW / 2;
  FLOOR_H = TW * 0.30;
  OX = width / 2;
  OY = height * 0.96 - gridSize * TH;

  push();
  translate(OX, OY);
  noStroke();
  // Painter's algorithm: cells are drawn by diagonals i + j, back to front
  for (let s = 0; s <= 2 * (gridSize - 1); s++)
    for (let i = max(0, s - gridSize + 1); i <= min(gridSize - 1, s); i++)
      drawCell(i, s - i);
  pop();

  drawHUD();
}

// Layered, fully seeded generation: streets -> river -> downtown ->
// density field -> zoning. One seed, one city.
function regenerate(fixedSeed) {
  seed = fixedSeed !== undefined ? fixedSeed : floor(random(100000));
  randomSeed(seed);
  noiseSeed(seed);

  colType = roadAxis();
  rowType = roadAxis();
  addAvenue();

  const inters = [];
  for (let i = 0; i < gridSize; i++)
    for (let j = 0; j < gridSize; j++)
      if (colType[i] && rowType[j]) inters.push([i, j]);
  let [ci, cj] = inters.length ?
    inters[floor(random(inters.length))] : [gridSize / 2, gridSize / 2];
  ci = round(lerp(ci, gridSize / 2, 0.25));
  cj = round(lerp(cj, gridSize / 2, 0.25));

  city = [];
  const maxD = gridSize * 0.72;
  for (let i = 0; i < gridSize; i++) {
    city[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const cell = { t: 'grass', f: 0, trees: [],
                     r1: random(), r2: random(), r3: random() };
      const road = max(colType[i], rowType[j]);

      if (road) {
        cell.t = road === 2 ? 'avenue' : 'road';
        cell.axis = colType[i] && rowType[j] ? 'x' :
                    (colType[i] ? 'v' : 'h');
      } else {
        let d = (1 - constrain(dist(i, j, ci, cj) / maxD, 0, 1)) * 0.62 +
                noise(i * 0.13 + 50, j * 0.13 + 50) * 0.55;
        if (roadNeighbors(i, j) > 0) d += 0.07;
        cell.d = d;

        if (d > 0.78) {
          cell.t = 'tower';
          cell.f = 7 + floor(map(d, 0.78, 1.15, 0, 8)) + floor(random(3));
        } else if (d > 0.58) {
          cell.t = 'mid';  cell.f = 3 + floor(random(4));
        } else if (d > 0.38) {
          cell.t = 'house'; cell.f = 1 + floor(random(2));
        } else if (noise(i * 0.3 + 99, j * 0.3 + 99) > 0.52) cell.t = 'park';

        cell.ci = floor(random(4));
        cell.roofI = floor(random(4));
      }

      if (cell.t === 'park')
        for (let k = 0; k < 2 + floor(random(3)); k++) cell.trees.push(tree());
      if (cell.t === 'grass' && random() < 0.22) cell.trees.push(tree(0.8));

      city[i][j] = cell;
    }
  }

}

function tree(scaleMax = 1.15) {
  return { ox: random(-0.28, 0.28), oy: random(-0.28, 0.28),
           s: random(0.65, scaleMax) };
}

// Irregular street spacing (4-7 cells): a uniform grid read as mechanical.
function roadAxis() {
  const t = new Array(gridSize).fill(0);
  let p = floor(random(2, 4));
  while (p < gridSize - 2) { t[p] = 1; p += floor(random(4, 8)); }
  if (!t.includes(1)) t[floor(gridSize / 2)] = 1;
  return t;
}

function addAvenue() {
  const axis = random() < 0.5 ? colType : rowType;
  const idx = axis.map((v, k) => v ? k : -1).filter(k => k >= 0);
  if (!idx.length) return;
  const a = idx[floor(random(idx.length))];
  axis[a] = 2;
  if (a + 1 < gridSize) axis[a + 1] = 2;
}

function roadNeighbors(i, j) {
  let n = 0;
  const isRoad = (a, b) => a >= 0 && b >= 0 && a < gridSize && b < gridSize &&
                           (colType[a] > 0 || rowType[b] > 0);
  if (isRoad(i - 1, j)) n++;
  if (isRoad(i + 1, j)) n++;
  if (isRoad(i, j - 1)) n++;
  if (isRoad(i, j + 1)) n++;
  return n;
}

const light = c => color(c);
const lighten = (c, k) => lerpColor(color(c), color(255), k);
const darken  = (c, k) => lerpColor(color(c), color(0), k);
// Deterministic hash: window and detail states never flicker.
const hash    = n => frac(sin(n * 127.1) * 43758.5453);
const frac   = x => x - floor(x);

function winColor(h) {
  return lerpColor(color('#dcedff'), color('#b9d2ea'), h);
}

function drawCell(i, j) {
  const cx = (i - j) * TW / 2;
  const cy = (i + j) * TH / 2;
  const c  = city[i][j];

  switch (c.t) {
    case 'grass':  ground(cx, cy, vary('#8bb56f', c.r1)); break;
    case 'park':   ground(cx, cy, vary('#6ca25b', c.r1)); break;
    case 'road':
    case 'avenue': roadTile(cx, cy, c); break;
    default:       ground(cx, cy, vary('#9aa0ab', c.r1));
                   building(cx, cy, i, j, c);
  }
  for (const t of c.trees) drawTree(cx, cy, t);
}

function vary(hex, r) {
  return light(lerpColor(darken(hex, 0.07), lighten(hex, 0.09), r));
}

function ground(cx, cy, col) {
  fill(col);
  diamond(cx, cy, TW, TH);
}

function diamond(cx, cy, w, h) {
  quad(cx, cy, cx + w / 2, cy + h / 2, cx, cy + h, cx - w / 2, cy + h / 2);
}

function roadTile(cx, cy, c) {
  ground(cx, cy, light(c.t === 'avenue' ? '#4a4f5a' : '#41454f'));
  stroke(light('#2e323b')); strokeWeight(1);
  noFill();
  diamond(cx, cy, TW, TH);
  noStroke();
  if (c.axis === 'x') return;
  const d = c.axis === 'v' ? [-TW / 4, TH / 4] : [TW / 4, TH / 4];
  const mx = cx, my = cy + TH / 2;
  stroke(light('#c9ced8'));
  strokeWeight(c.t === 'avenue' ? 2 : 1);
  for (const f of [-0.55, 0.55]) {
    line(mx + d[0] * (f - 0.28), my + d[1] * (f - 0.28),
           mx + d[0] * (f + 0.28), my + d[1] * (f + 0.28));
  }
  noStroke();
}

function building(cx, cy, i, j, c) {
  const cyc = cy + TH / 2;
  const wf = (c.t === 'house' ? 0.62 : 0.74) + c.r1 * 0.14;
  const bw = TW * wf, bh = bw / 2;
  const hpx = c.f * FLOOR_H;
  const base = FACADES[c.t][c.ci];

  const N = [cx, cyc - bh / 2], E = [cx + bw / 2, cyc],
        S = [cx, cyc + bh / 2], W = [cx - bw / 2, cyc];

  fill(light(darken(base, 0.30)));
  quad(W[0], W[1], S[0], S[1], S[0], S[1] - hpx, W[0], W[1] - hpx);
  fill(light(color(base)));
  quad(S[0], S[1], E[0], E[1], E[0], E[1] - hpx, S[0], S[1] - hpx);

  windowsOnFace(W, S, hpx, c, i, j, 0);
  windowsOnFace(S, E, hpx, c, i, j, 1);

  if (c.t === 'house') {
    const rh = FLOOR_H * 0.9;
    const A = [cx, cyc - hpx - rh];
    fill(light(darken(ROOFS[c.roofI], 0.25)));
    triangle(W[0], W[1] - hpx, S[0], S[1] - hpx, A[0], A[1]);
    fill(light(color(ROOFS[c.roofI])));
    triangle(S[0], S[1] - hpx, E[0], E[1] - hpx, A[0], A[1]);
  } else {
    fill(light(lighten(base, 0.30)));
    quad(N[0], N[1] - hpx, E[0], E[1] - hpx,
           S[0], S[1] - hpx, W[0], W[1] - hpx);
    if (c.t === 'tower') roofUnit(cx, cyc, bw, hpx, base, c);
  }
}

function windowsOnFace(P, Q, hpx, c, i, j, face) {
  if (c.f <= 0) return;
  const dx = Q[0] - P[0], dy = Q[1] - P[1];
  const len = sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const cols = c.t === 'tower' ? 3 : 2;
  const ww = len * (cols === 3 ? 0.075 : 0.09);
  const wh = FLOOR_H * 0.45;

  for (let fl = 0; fl < c.f; fl++) {
    const yo = -fl * FLOOR_H - FLOOR_H * 0.55;
    for (let k = 0; k < cols; k++) {
      const f = (k + 1) / (cols + 1);
      const px = P[0] + dx * f, py = P[1] + dy * f + yo;
      fill(winColor(hash(i * 57 + j * 131 + fl * 7 + k * 997 +
                           face * 401 + seed)));
      quad(px - ux * ww, py - uy * ww, px + ux * ww, py + uy * ww,
             px + ux * ww, py + uy * ww - wh, px - ux * ww, py - uy * ww - wh);
    }
  }
}

function roofUnit(cx, cyc, bw, hpx, base, c) {
  const uw = bw * 0.4, uh2 = uw / 2, uH = FLOOR_H * 0.6;
  const ty = cyc - hpx;
  fill(light(darken(base, 0.38)));
  quad(cx - uw / 2, ty, cx, ty + uh2 / 2, cx, ty + uh2 / 2 - uH,
         cx - uw / 2, ty - uH);
  fill(light(darken(base, 0.15)));
  quad(cx, ty + uh2 / 2, cx + uw / 2, ty, cx + uw / 2, ty - uH,
         cx, ty + uh2 / 2 - uH);
  fill(light(lighten(base, 0.2)));
  quad(cx, ty - uh2 / 2 - uH, cx + uw / 2, ty - uH,
         cx, ty + uh2 / 2 - uH, cx - uw / 2, ty - uH);
}

function drawTree(cx, cy, t) {
  const px = cx + t.ox * TW;
  const py = cy + TH / 2 + t.oy * TH;
  const s = t.s * TW * 0.16;
  stroke(light('#6b4a33')); strokeWeight(2);
  line(px, py, px, py - s * 1.3);
  noStroke();
  fill(light('#3a6d38')); circle(px, py - s * 1.6, s * 2);
  fill(light('#4c8a48')); circle(px - s * 0.3, py - s * 1.8, s * 1.4);
}

function drawHUD() {
  const l1 = 'SEED ' + nf(seed, 5) + '   ' + gridSize + '\u00d7' + gridSize;
  const l2 = '[CLICK/R] new city';
  textSize(max(11, min(width, height) * 0.017));
  textAlign(LEFT, BASELINE);
  noStroke();
  fill(0, 130);
  text(l1, 15, height - 33); text(l2, 15, height - 13);
  fill(255, 235);
  text(l1, 14, height - 34); text(l2, 14, height - 14);
}

function mousePressed() { regenerate(); }

function keyPressed() {
  const k = key.toLowerCase();
  if (k === 'r') regenerate();
}
