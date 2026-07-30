// Procedural City — v2, flat rule-based generation (stage 2 of 5)
// Random placement is replaced by layered rules: an irregular street grid
// with one avenue, a downtown, a density field and zoning. Everything is
// seeded, so a good city can be rebuilt. The view is still a flat map.
// Controls: click / [R] — new city.

let gridSize = 22;
let seed;
let colType = [], rowType = [];   // 0 none, 1 street, 2 avenue
let city = [];

const COLORS = {
  tower: '#5b6676', mid: '#9aa0a8', house: '#c8b49a',
  park: '#7fbf6e', grass: '#9ed08e', road: '#3c4046', avenue: '#33373d'
};

// Deterministic hash: details (like tree spots) stay put between frames
const frac = x => x - floor(x);
const hash = n => frac(sin(n * 127.1) * 43758.5453);

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  regenerate();
}

// Layered, fully seeded generation:
// streets -> downtown -> density field -> zoning
function regenerate(fixedSeed) {
  seed = fixedSeed !== undefined ? fixedSeed : floor(random(100000));
  randomSeed(seed);
  noiseSeed(seed);

  // Irregular street spacing (4-7 cells) reads less mechanical
  colType = roadAxis();
  rowType = roadAxis();
  addAvenue(colType);

  // Downtown near a random intersection, pulled toward the middle
  const ci = colType.findIndex(v => v > 0);
  const cj = rowType.findIndex(v => v > 0);
  const cx = lerp(random([ci, colType.lastIndexOf(1)]), gridSize / 2, 0.25);
  const cy = lerp(random([cj, rowType.lastIndexOf(1)]), gridSize / 2, 0.25);
  const maxD = dist(0, 0, gridSize / 2, gridSize / 2);

  city = [];
  for (let i = 0; i < gridSize; i++) {
    city[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const cell = { t: 'grass', f: 0, r: hash(i * 57 + j * 131 + seed) };

      if (colType[i] || rowType[j]) {
        cell.t = colType[i] === 2 || rowType[j] === 2 ? 'avenue' : 'road';
        city[i][j] = cell;
        continue;
      }

      // Density = closeness to downtown + noise + road-access bonus
      let d = (1 - dist(i, j, cx, cy) / maxD) * 0.62 +
              noise(i * 0.16, j * 0.16) * 0.55;
      if (roadNeighbor(i, j)) d += 0.07;

      if (d > 0.78)      { cell.t = 'tower'; cell.f = 7 + floor(random(6)); }
      else if (d > 0.58) { cell.t = 'mid';   cell.f = 3 + floor(random(4)); }
      else if (d > 0.38) { cell.t = 'house'; cell.f = 1 + floor(random(2)); }
      else cell.t = random() < 0.55 ? 'park' : 'grass';

      city[i][j] = cell;
    }
  }
}

function roadAxis() {
  const t = new Array(gridSize).fill(0);
  let p = 2 + floor(random(3));
  while (p < gridSize - 2) {
    t[p] = 1;
    p += 4 + floor(random(4));
  }
  return t;
}

function addAvenue(axis) {
  const roads = axis.map((v, i) => v ? i : -1).filter(i => i >= 0);
  if (roads.length) axis[random(roads)] = 2;
}

function roadNeighbor(i, j) {
  return (i > 0 && (colType[i - 1] || rowType[j])) ||
         (i < gridSize - 1 && (colType[i + 1] || rowType[j])) ||
         (j > 0 && (colType[i] || rowType[j - 1])) ||
         (j < gridSize - 1 && (colType[i] || rowType[j + 1]));
}

function draw() {
  background(232, 236, 240);
  const cs = min(width, height) * 0.86 / gridSize;
  const ox = (width - cs * gridSize) / 2;
  const oy = (height - cs * gridSize) / 2;

  noStroke();
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const c = city[i][j];
      const x = ox + i * cs;
      const y = oy + j * cs;

      fill(COLORS[c.t]);
      rect(x, y, cs + 0.5, cs + 0.5);

      if (c.t === 'road' || c.t === 'avenue') {
        fill(255, 210, 120, c.t === 'avenue' ? 150 : 70);
        if (colType[i]) rect(x + cs * 0.47, y, cs * 0.06, cs + 0.5);
        if (rowType[j]) rect(x, y + cs * 0.47, cs + 0.5, cs * 0.06);
        fill(COLORS[c.t]);
      }

      if (c.t === 'tower' || c.t === 'mid' || c.t === 'house') {
        // Darker footprint encodes floor count on the flat map
        const k = map(c.f, 1, 12, 0.15, 0.55, true);
        fill(0, 0, 20, 255 * k);
        const m = cs * (c.t === 'house' ? 0.24 : 0.14);
        rect(x + m, y + m, cs - 2 * m, cs - 2 * m, 2);
      }

      if (c.t === 'park' || c.t === 'grass') {
        fill(40, 100, 45);
        const n = c.t === 'park' ? 3 : (c.r < 0.4 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const tx = x + cs * (0.2 + 0.6 * hash(i * 91 + j * 17 + k * 7 + seed));
          const ty = y + cs * (0.2 + 0.6 * hash(i * 31 + j * 77 + k * 13 + seed));
          circle(tx, ty, cs * 0.16);
        }
      }
    }
  }

  fill(40);
  textSize(max(11, min(width, height) * 0.018));
  textAlign(LEFT, BASELINE);
  text('SEED ' + nf(seed, 5) + '   [CLICK/R] new city', 16, height - 16);
}

function mousePressed() {
  regenerate();
}

function keyPressed() {
  if (key.toLowerCase() === 'r') regenerate();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
