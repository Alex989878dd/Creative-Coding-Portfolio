// Weekly Clock — v2, core fixes (stage 2 of 3)
// The time model and geometry are corrected before any styling work:
// one Date-based progress function and one shared angular axis.
// Controls: [T] time-lapse on/off, [R] real time, [S] save PNG.

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS_FULL  = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
                    'FRIDAY', 'SATURDAY', 'SUNDAY'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const PARTS = [
  { h: 6,  icon: '🌅', name: 'Dawn'    },
  { h: 9,  icon: '☕', name: 'Coffee'  },
  { h: 12, icon: '🍽️', name: 'Lunch'   },
  { h: 15, icon: '📊', name: 'Work'    },
  { h: 18, icon: '🏁', name: 'Finish'  },
  { h: 21, icon: '🌙', name: 'Evening' }
];

// One shared axis for sectors, ticks, icons and the hand: Monday at the top
const TOP_ANGLE = -90;
const DAY_ANGLE = 360 / 7;

const C_BLUE = [110, 160, 255];
const C_GOLD = [255, 195, 115];

const DEMO_STEP_MS = 5 * 60 * 1000;   // +5 virtual minutes per frame

let R, RI, R_ICONS;
let bgBuffer;
let particles = [];
let demo = { on: false, t: 0 };
let lastTickSecond = -1;

// Week progress in [0, 1): (weekday index + fraction of the day) / 7.
// The single source of truth for the hand, the fills and the day name.
function weekProgress(now) {
  const dayIndex = (now.getDay() + 6) % 7;
  const dayFrac = (now.getHours() * 3600 + now.getMinutes() * 60 +
                   now.getSeconds()) / 86400;
  return (dayIndex + dayFrac) / 7;
}

function currentPart(now) {
  const h = now.getHours();
  let part = PARTS[PARTS.length - 1];
  for (const p of PARTS) if (h >= p.h) part = p;
  return part;
}

// Single time source: the real clock or the accelerated virtual one
function getNow() {
  return demo.on ? new Date(demo.t) : new Date();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textAlign(CENTER, CENTER);
  computeLayout();
  makeBackground();
  for (let i = 0; i < 45; i++) {
    particles.push(new Particle(random(width), random(height), true));
  }
}

function computeLayout() {
  R = min(width, height) * 0.33;
  RI = R * 0.6;
  R_ICONS = R + min(width, height) * 0.055;
}

// The gradient is rendered once into a buffer instead of hundreds of
// line() calls on every frame
function makeBackground() {
  if (bgBuffer) bgBuffer.remove();
  bgBuffer = createGraphics(width, height);
  for (let y = 0; y < height; y++) {
    const t = y / height;
    bgBuffer.stroke(lerp(9, 22, t), lerp(8, 17, t), lerp(16, 36, t));
    bgBuffer.line(0, y, width, y);
  }
}

function draw() {
  image(bgBuffer, 0, 0);
  if (demo.on) demo.t += DEMO_STEP_MS;

  const now = getNow();
  const progress = weekProgress(now);
  const dayIndex = floor(progress * 7) % 7;

  push();
  translate(width / 2, height / 2);
  drawRing(progress, dayIndex);
  drawTodayIcons(dayIndex, now);
  drawHand(progress);
  drawCenterPanel(now, progress, dayIndex);
  pop();

  updateParticles(now, progress);
  drawHUD();
}

function drawRing(progress, dayIndex) {
  for (let i = 0; i < 7; i++) {
    const a0 = TOP_ANGLE + i * DAY_ANGLE;
    noStroke();
    if (i < dayIndex)       fill(C_BLUE[0], C_BLUE[1], C_BLUE[2], 26);
    else if (i === dayIndex) fill(C_GOLD[0], C_GOLD[1], C_GOLD[2], 14);
    else                    fill(255, 6);
    arc(0, 0, R * 2, R * 2, a0, a0 + DAY_ANGLE, PIE);
  }

  // Solid sweep from the start of the week to the hand
  noStroke();
  fill(C_BLUE[0], C_BLUE[1], C_BLUE[2], 30);
  arc(0, 0, R * 2, R * 2, TOP_ANGLE, TOP_ANGLE + progress * 360, PIE);

  // Current day edge arc
  noFill();
  stroke(C_GOLD[0], C_GOLD[1], C_GOLD[2],
         150 + sin(frameCount * 2) * 40);
  strokeWeight(3);
  const d0 = TOP_ANGLE + dayIndex * DAY_ANGLE;
  arc(0, 0, R * 2, R * 2, d0, d0 + DAY_ANGLE);

  // Day boundaries and 6/12/18 hour ticks
  stroke(255, 46);
  strokeWeight(1);
  for (let i = 0; i < 7; i++) {
    const a = TOP_ANGLE + i * DAY_ANGLE;
    line(cos(a) * RI, sin(a) * RI, cos(a) * (R + 8), sin(a) * (R + 8));
    for (let hTick = 6; hTick < 24; hTick += 6) {
      const t = a + (hTick / 24) * DAY_ANGLE;
      line(cos(t) * R, sin(t) * R, cos(t) * (R + 5), sin(t) * (R + 5));
    }
  }

  const rLabel = (R + RI) / 2;
  for (let i = 0; i < 7; i++) {
    const mid = TOP_ANGLE + i * DAY_ANGLE + DAY_ANGLE / 2;
    noStroke();
    textSize(R * 0.085);
    if (i === dayIndex) {
      fill(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
      textStyle(BOLD);
    } else {
      fill(255, 110);
    }
    text(DAYS_SHORT[i], cos(mid) * rLabel, sin(mid) * rLabel);
    textStyle(NORMAL);
  }
}

function drawTodayIcons(dayIndex, now) {
  const a0 = TOP_ANGLE + dayIndex * DAY_ANGLE;
  const part = currentPart(now);
  for (const p of PARTS) {
    const a = a0 + (p.h / 24) * DAY_ANGLE;
    const x = cos(a) * R_ICONS;
    const y = sin(a) * R_ICONS;
    const isNow = p === part;
    noStroke();
    fill(255, isNow ? 26 : 12);
    circle(x, y, R * 0.17);
    if (isNow) {
      noFill();
      stroke(C_GOLD[0], C_GOLD[1], C_GOLD[2], 170);
      strokeWeight(1.5);
      circle(x, y, R * 0.17);
      noStroke();
    }
    fill(255);
    textSize(isNow ? R * 0.075 : R * 0.06);
    text(p.icon, x, y - 1);
    fill(255, isNow ? 190 : 100);
    textSize(R * 0.034);
    text(p.name, x, y + R * 0.1);
  }
}

function drawHand(progress) {
  const a = TOP_ANGLE + progress * 360;
  stroke(C_GOLD[0], C_GOLD[1], C_GOLD[2], 230);
  strokeWeight(3);
  line(cos(a) * (RI - 4), sin(a) * (RI - 4),
       cos(a) * (R + 14), sin(a) * (R + 14));
  push();
  rotate(a);
  noStroke();
  fill(255, 230, 190);
  triangle(R + 12, -4, R + 12, 4, R + 22, 0);
  fill(C_GOLD[0], C_GOLD[1], C_GOLD[2], 60 + sin(frameCount * 4) * 25);
  circle(R + 16, 0, 15);
  pop();
}

function drawCenterPanel(now, progress, dayIndex) {
  noStroke();
  fill(10, 10, 20, 242);
  circle(0, 0, RI * 2);
  noFill();
  stroke(C_BLUE[0], C_BLUE[1], C_BLUE[2], 60);
  strokeWeight(1);
  circle(0, 0, RI * 2);

  noStroke();
  const part = currentPart(now);
  textSize(R * 0.12);
  text(part.icon, 0, -RI * 0.55);

  fill(255);
  textStyle(BOLD);
  textSize(R * 0.155);
  text(nf(now.getHours(), 2) + ':' + nf(now.getMinutes(), 2) +
       ':' + nf(now.getSeconds(), 2), 0, -RI * 0.16);
  textStyle(NORMAL);

  fill(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
  textSize(R * 0.075);
  text(DAYS_FULL[dayIndex], 0, RI * 0.12);
  fill(255, 150);
  textSize(R * 0.05);
  text(now.getDate() + ' ' + MONTHS[now.getMonth()], 0, RI * 0.3);

  const bw = RI * 1.15;
  const by = RI * 0.5;
  fill(255, 30);
  rect(-bw / 2, by, bw, 5, 3);
  fill(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
  rect(-bw / 2, by, bw * progress, 5, 3);
  stroke(10, 10, 20);
  strokeWeight(1);
  for (let i = 1; i < 7; i++) {
    line(-bw / 2 + (bw / 7) * i, by, -bw / 2 + (bw / 7) * i, by + 5);
  }
  noStroke();
  fill(255, 130);
  textSize(R * 0.042);
  text('WEEK ' + nf(progress * 100, 1, 1) + '%', 0, by + R * 0.07);

  if (demo.on) {
    fill(C_GOLD[0], C_GOLD[1], C_GOLD[2], 190);
    textSize(R * 0.036);
    text('TIME-LAPSE · [R] REAL TIME', 0, by + R * 0.13);
  }
}

function updateParticles(now, progress) {
  // Reverse iteration so removal never skips elements
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.show();
    if (p.life <= 0) {
      if (p.ambient) p.reset(random(width), random(height));
      else particles.splice(i, 1);
    }
  }
  const sec = now.getSeconds();
  if (sec !== lastTickSecond && (!demo.on || frameCount % 5 === 0)) {
    lastTickSecond = sec;
    const a = TOP_ANGLE + progress * 360;
    for (let i = 0; i < 3; i++) {
      const s = new Particle(width / 2 + cos(a) * (R + 16),
                             height / 2 + sin(a) * (R + 16), false);
      s.vx = random(-1.2, 1.2);
      s.vy = random(-1.2, 1.2);
      s.life = random(25, 55);
      s.gold = true;
      particles.push(s);
    }
  }
}

function drawHUD() {
  noStroke();
  fill(255, 80);
  textSize(max(10, min(width, height) * 0.016));
  text('[T] time-lapse   [S] save PNG   click — particles',
       width / 2, height - 16);
}

class Particle {
  constructor(x, y, ambient) {
    this.ambient = ambient;
    this.gold = false;
    this.reset(x, y);
  }
  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-0.35, 0.35);
    this.vy = random(-0.35, 0.35);
    this.life = this.maxLife = random(180, 420);
    this.size = random(1.5, 3.2);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1;
  }
  show() {
    noStroke();
    const c = this.gold ? C_GOLD : C_BLUE;
    fill(c[0], c[1], c[2], map(this.life, 0, this.maxLife, 0, 95));
    circle(this.x, this.y, this.size);
  }
}

function mousePressed() {
  for (let i = 0; i < 20; i++) {
    const p = new Particle(mouseX, mouseY, false);
    p.vx = random(-2, 2);
    p.vy = random(-2, 2);
    p.life = p.maxLife = random(40, 90);
    particles.push(p);
  }
}

function keyPressed() {
  const k = key.toLowerCase();
  if (k === 't') {
    demo.on = !demo.on;
    if (demo.on) demo.t = Date.now();
  }
  if (k === 'r') demo.on = false;
  if (k === 's') saveCanvas('weekly_clock', 'png');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeLayout();
  makeBackground();
}
