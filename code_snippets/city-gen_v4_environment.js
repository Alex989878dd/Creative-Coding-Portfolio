// Procedural City — v4, environment and performance (stage 4 of 5)
// A Perlin-guided river with bridges joins the generation; day, sunset
// and night lighting is applied by one tint function; the heavy scene
// moves into off-screen buffers so the clouds animate at full rate.
// Controls: click / [R] new city, [N] day-sunset-night.

const MODES = ['DAY', 'SUNSET', 'NIGHT'];

const FACADES = {
  tower: ['#8aa2c0', '#7590b2', '#9db1c9', '#6f87a6'],
  mid:   ['#b8a48e', '#a9938b', '#9aa48e', '#b0a79b'],
  house: ['#c9b299', '#b8a08a', '#c2a9a0', '#a8b39c']
};
const ROOFS = ['#a45a4a', '#8a4a3e', '#7c5a46', '#5f6d5a'];

const SKY = [
  { top: '#8ecfec', bot: '#eaf6fb' },
  { top: '#3a2b63', bot: '#ff9b6a' },
  { top: '#05070f', bot: '#1a2340' }
];
const WATER = [
  { hi: '#7cc4e8', lo: '#4f9cc9' },
  { hi: '#e89a6d', lo: '#6b4a63' },
  { hi: '#22314f', lo: '#101a30' }
];

let gridSize = 22;
let seed, mode;
let colType = [], rowType = [];
let city = [];
let clouds = [];
let skyBuf, cityBuf;
let TW, TH, FLOOR_H, OX, OY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  regenerate();
  makeClouds();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  renderAll();
}

function draw() {
  image(skyBuf, 0, 0);
  drawClouds();
  image(cityBuf, 0, 0);
  drawHUD();
}

// Layered, fully seeded generation: streets -> river -> downtown ->
// density field -> zoning. One seed, one city.
function regenerate(fixedSeed) {
  seed = fixedSeed !== undefined ? fixedSeed : floor(random(100000));
  randomSeed(seed);
  noiseSeed(seed);
  mode = floor(random(3));

  colType = roadAxis();
  rowType = roadAxis();
  addAvenue();

  const water = makeRiver();

  const inters = [];
  for (let i = 0; i < gridSize; i++)
    for (let j = 0; j < gridSize; j++)
      if (colType[i] && rowType[j] && !water[i][j]) inters.push([i, j]);
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

      if (water[i][j] && road) {
        cell.t = 'bridge';
        cell.axis = colType[i] && rowType[j] ? 'x' :
                    (colType[i] ? 'v' : 'h');
      }
      else if (water[i][j])         cell.t = 'water';
      else if (road) {
        cell.t = road === 2 ? 'avenue' : 'road';
        cell.axis = colType[i] && rowType[j] ? 'x' :
                    (colType[i] ? 'v' : 'h');
      } else {
        let d = (1 - constrain(dist(i, j, ci, cj) / maxD, 0, 1)) * 0.62 +
                noise(i * 0.13 + 50, j * 0.13 + 50) * 0.55;
        if (roadNeighbors(i, j) > 0) d += 0.07;
        const nearWat = nearWater(i, j, water);
        if (nearWat) d -= 0.04;
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

  renderAll();
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

// A Perlin-guided river in ~45% of cities; where it crosses a road the
// cell becomes a bridge, keeping the city connected.
function makeRiver() {
  const w = Array.from({ length: gridSize }, () => new Array(gridSize).fill(false));
  if (random() < 0.45) {
    const vert = random() < 0.5;
    const base = floor(random(gridSize * 0.25, gridSize * 0.7));
    for (let k = 0; k < gridSize; k++) {
      const off = floor(map(noise(k * 0.15 + 7.3), 0, 1,
                            -gridSize * 0.18, gridSize * 0.18));
      const c = constrain(base + off, 1, gridSize - 3);
      if (vert) { w[c][k] = true; w[c + 1][k] = true; }
      else      { w[k][c] = true; w[k][c + 1] = true; }
    }
  }
  return w;
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

function nearWater(i, j, w) {
  const at = (a, b) => a >= 0 && b >= 0 && a < gridSize && b < gridSize && w[a][b];
  return at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1);
}

// One tint function relights every material for day / sunset / night
// without regenerating the city.
function light(c) {
  c = color(c);
  if (mode === 1) c = lerpColor(c, color('#ff9a5c'), 0.24);
  if (mode === 2) c = lerpColor(c, color('#0d1330'), 0.68);
  return c;
}
const lighten = (c, k) => lerpColor(color(c), color(255), k);
const darken  = (c, k) => lerpColor(color(c), color(0), k);
// Deterministic hash: window and detail states never flicker.
const hash    = n => frac(sin(n * 127.1) * 43758.5453);
const frac   = x => x - floor(x);

function winColor(h) {
  if (mode === 0) return lerpColor(color('#dcedff'), color('#b9d2ea'), h);
  if (mode === 1) return h < 0.16 ? color('#ffd9a0') : color('#d8916b');
  return h < 0.5 ? color('#ffd27a') : color('#141c2f');
}

// The heavy scene is rendered once into buffers; draw() only composites
// them and animates the clouds and the beacon.
function renderAll() {
  TW = min(width * 0.94 / gridSize, (height * 0.60) / (gridSize * 0.5));
  TH = TW / 2;
  FLOOR_H = TW * 0.30;
  OX = width / 2;
  OY = height * 0.96 - gridSize * TH;
  renderSky();
  renderCity();
}

function renderSky() {
  if (skyBuf) skyBuf.remove();
  skyBuf = createGraphics(width, height);
  const top = color(SKY[mode].top), bot = color(SKY[mode].bot);
  for (let y = 0; y < height; y++) {
    skyBuf.stroke(lerpColor(top, bot, y / height));
    skyBuf.line(0, y, width, y);
  }
  skyBuf.noStroke();
  randomSeed(seed * 3 + mode * 17 + 11);

  if (mode === 2) {
    for (let k = 0; k < 130; k++) {
      skyBuf.fill(255, random(60, 200));
      skyBuf.circle(random(width), random(height * 0.65), random(1, 2.5));
    }
    const mx = width * 0.78, my = height * 0.16;
    skyBuf.fill(232, 236, 245, 40); skyBuf.circle(mx, my, 74);
    skyBuf.fill('#e8ecf5');         skyBuf.circle(mx, my, 46);
    skyBuf.fill(200, 206, 220);     skyBuf.circle(mx - 8, my + 6, 7);
    skyBuf.circle(mx + 10, my - 5, 5);
  } else {
    const sx = mode === 0 ? width * 0.8 : width * 0.24;
    const sy = mode === 0 ? height * 0.16 : height * 0.34;
    const sc = mode === 0 ? color('#fff3c4') : color('#ffd98a');
    for (let r = 5; r > 0; r--) {
      skyBuf.fill(red(sc), green(sc), blue(sc), 22);
      skyBuf.circle(sx, sy, 40 + r * 26);
    }
    skyBuf.fill(sc); skyBuf.circle(sx, sy, mode === 0 ? 46 : 62);
  }
}

// Painter's algorithm: cells are drawn by diagonals i + j, back to front.
function renderCity() {
  if (cityBuf) cityBuf.remove();
  cityBuf = createGraphics(width, height);
  cityBuf.clear();
  const g = cityBuf;
  g.push();
  g.translate(OX, OY);
  g.noStroke();

  for (let s = 0; s <= 2 * (gridSize - 1); s++)
    for (let i = max(0, s - gridSize + 1); i <= min(gridSize - 1, s); i++)
      drawCell(g, i, s - i);

  g.pop();
}

function drawCell(g, i, j) {
  const cx = (i - j) * TW / 2;
  const cy = (i + j) * TH / 2;
  const c  = city[i][j];

  switch (c.t) {
    case 'grass':  ground(g, cx, cy, vary('#8bb56f', c.r1)); break;
    case 'park':   ground(g, cx, cy, vary('#6ca25b', c.r1)); break;
    case 'water':  waterTile(g, cx, cy, c); break;
    case 'bridge': waterTile(g, cx, cy, c); bridge(g, cx, cy, c); break;
    case 'road':
    case 'avenue': roadTile(g, cx, cy, c); break;
    default:       ground(g, cx, cy, vary('#9aa0ab', c.r1));
                   building(g, cx, cy, i, j, c);
  }
  for (const t of c.trees) drawTree(g, cx, cy, t);
}

function vary(hex, r) {
  return light(lerpColor(darken(hex, 0.07), lighten(hex, 0.09), r));
}

function ground(g, cx, cy, col) {
  g.fill(col);
  diamond(g, cx, cy, TW, TH);
}

function diamond(g, cx, cy, w, h) {
  g.quad(cx, cy, cx + w / 2, cy + h / 2, cx, cy + h, cx - w / 2, cy + h / 2);
}

function roadTile(g, cx, cy, c) {
  ground(g, cx, cy, light(c.t === 'avenue' ? '#4a4f5a' : '#41454f'));
  g.stroke(light('#2e323b')); g.strokeWeight(1);
  g.noFill();
  diamond(g, cx, cy, TW, TH);
  g.noStroke();
  if (c.axis === 'x') return;
  const d = c.axis === 'v' ? [-TW / 4, TH / 4] : [TW / 4, TH / 4];
  const mx = cx, my = cy + TH / 2;
  g.stroke(light('#c9ced8'));
  g.strokeWeight(c.t === 'avenue' ? 2 : 1);
  for (const f of [-0.55, 0.55]) {
    g.line(mx + d[0] * (f - 0.28), my + d[1] * (f - 0.28),
           mx + d[0] * (f + 0.28), my + d[1] * (f + 0.28));
  }
  g.noStroke();
}

function waterTile(g, cx, cy, c) {
  ground(g, cx, cy, color(WATER[mode].lo));
  g.stroke(color(WATER[mode].hi));
  g.strokeWeight(1);
  const wy = cy + TH * (0.35 + c.r2 * 0.3);
  g.line(cx - TW * 0.22, wy, cx - TW * 0.05, wy);
  g.line(cx + TW * 0.05, wy + 2, cx + TW * 0.22, wy + 2);
  g.noStroke();
}

function bridge(g, cx, cy, c) {
  const lift = TH * 0.28;
  g.fill(light('#33373f'));
  g.quad(cx - TW / 2, cy + TH / 2 - lift, cx, cy + TH - lift,
         cx, cy + TH, cx - TW / 2, cy + TH / 2);
  g.quad(cx + TW / 2, cy + TH / 2 - lift, cx, cy + TH - lift,
         cx, cy + TH, cx + TW / 2, cy + TH / 2);
  g.push(); g.translate(0, -lift);
  roadTile(g, cx, cy, { t: 'road', axis: c.axis || 'v' });
  g.pop();
}

function building(g, cx, cy, i, j, c) {
  const cyc = cy + TH / 2;
  const wf = (c.t === 'house' ? 0.62 : 0.74) + c.r1 * 0.14;
  const bw = TW * wf, bh = bw / 2;
  const hpx = c.f * FLOOR_H;
  const base = FACADES[c.t][c.ci];

  const N = [cx, cyc - bh / 2], E = [cx + bw / 2, cyc],
        S = [cx, cyc + bh / 2], W = [cx - bw / 2, cyc];

  g.fill(light(darken(base, 0.30)));
  g.quad(W[0], W[1], S[0], S[1], S[0], S[1] - hpx, W[0], W[1] - hpx);
  g.fill(light(color(base)));
  g.quad(S[0], S[1], E[0], E[1], E[0], E[1] - hpx, S[0], S[1] - hpx);

  windowsOnFace(g, W, S, hpx, c, i, j, 0);
  windowsOnFace(g, S, E, hpx, c, i, j, 1);

  if (c.t === 'house') {
    const rh = FLOOR_H * 0.9;
    const A = [cx, cyc - hpx - rh];
    g.fill(light(darken(ROOFS[c.roofI], 0.25)));
    g.triangle(W[0], W[1] - hpx, S[0], S[1] - hpx, A[0], A[1]);
    g.fill(light(color(ROOFS[c.roofI])));
    g.triangle(S[0], S[1] - hpx, E[0], E[1] - hpx, A[0], A[1]);
  } else {
    g.fill(light(lighten(base, 0.30)));
    g.quad(N[0], N[1] - hpx, E[0], E[1] - hpx,
           S[0], S[1] - hpx, W[0], W[1] - hpx);
    if (c.t === 'tower') roofUnit(g, cx, cyc, bw, hpx, base, c);
  }
}

function windowsOnFace(g, P, Q, hpx, c, i, j, face) {
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
      g.fill(winColor(hash(i * 57 + j * 131 + fl * 7 + k * 997 +
                           face * 401 + seed)));
      g.quad(px - ux * ww, py - uy * ww, px + ux * ww, py + uy * ww,
             px + ux * ww, py + uy * ww - wh, px - ux * ww, py - uy * ww - wh);
    }
  }
}

function roofUnit(g, cx, cyc, bw, hpx, base, c) {
  const uw = bw * 0.4, uh2 = uw / 2, uH = FLOOR_H * 0.6;
  const ty = cyc - hpx;
  g.fill(light(darken(base, 0.38)));
  g.quad(cx - uw / 2, ty, cx, ty + uh2 / 2, cx, ty + uh2 / 2 - uH,
         cx - uw / 2, ty - uH);
  g.fill(light(darken(base, 0.15)));
  g.quad(cx, ty + uh2 / 2, cx + uw / 2, ty, cx + uw / 2, ty - uH,
         cx, ty + uh2 / 2 - uH);
  g.fill(light(lighten(base, 0.2)));
  g.quad(cx, ty - uh2 / 2 - uH, cx + uw / 2, ty - uH,
         cx, ty + uh2 / 2 - uH, cx - uw / 2, ty - uH);
}

function drawTree(g, cx, cy, t) {
  const px = cx + t.ox * TW;
  const py = cy + TH / 2 + t.oy * TH;
  const s = t.s * TW * 0.16;
  g.stroke(light('#6b4a33')); g.strokeWeight(2);
  g.line(px, py, px, py - s * 1.3);
  g.noStroke();
  g.fill(light('#3a6d38')); g.circle(px, py - s * 1.6, s * 2);
  g.fill(light('#4c8a48')); g.circle(px - s * 0.3, py - s * 1.8, s * 1.4);
}

function makeClouds() {
  clouds = [];
  const n = 3 + floor(random(3));
  for (let k = 0; k < n; k++) {
    clouds.push({ x: random(width), y: random(height * 0.05, height * 0.3),
                  s: random(0.7, 1.5), sp: random(0.15, 0.45) });
  }
}

function drawClouds() {
  noStroke();
  const col = [color(255, 255, 255, 215), color(255, 195, 165, 190),
               color(64, 76, 112, 110)][mode];
  for (const c of clouds) {
    c.x += c.sp * c.s;
    if (c.x > width + 120) c.x = -120;
    fill(col);
    ellipse(c.x, c.y, 95 * c.s, 26 * c.s);
    ellipse(c.x + 32 * c.s, c.y + 7 * c.s, 70 * c.s, 21 * c.s);
    ellipse(c.x - 36 * c.s, c.y + 6 * c.s, 62 * c.s, 19 * c.s);
  }
}

function drawHUD() {
  const l1 = 'SEED ' + nf(seed, 5) + '   ' + MODES[mode];
  const l2 = '[CLICK/R] new city  [N] light';
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
  if (k === 'n') { mode = (mode + 1) % 3; renderAll(); }
}
