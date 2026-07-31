// Weekly Clock v3, final version (stage 3 of 3)
// coloured day parts, background glow.
// controls: [T] time-lapse, [R] real time, [S] save PNG, [H] hide UI;
// the same actions exist as clickable buttons

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS_FULL  = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
                    'FRIDAY', 'SATURDAY', 'SUNDAY'];
const MONTHS     = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Seven day parts from midnight, each with its own accent color
// Evening (21-24) is followed by Night (0-6) of the next day
const DAY_PARTS = [
  { h: 0,  icon: '🌙', name: 'Night',   col: [125, 125, 230] },
  { h: 6,  icon: '🌅', name: 'Dawn',    col: [255, 150, 120] },
  { h: 9,  icon: '☕', name: 'Coffee',  col: [210, 150,  85] },
  { h: 12, icon: '🍽️', name: 'Lunch',   col: [140, 210, 125] },
  { h: 15, icon: '📊', name: 'Work',    col: [ 90, 195, 235] },
  { h: 18, icon: '🏁', name: 'Finish',  col: [185, 140, 255] },
  { h: 21, icon: '🌆', name: 'Evening', col: [240, 120, 160] }
];

const TOP_ANGLE  = -90;
const DAY_ANGLE  = 360 / 7;
const WEEK_MS    = 7 * 24 * 3600 * 1000;

const C_BLUE = [110, 160, 255];
const C_GOLD = [255, 195, 115];

// Deliberately not a whole number of minutes: a round +5:00 step froze
// the seconds and flipped the minute digit between the same two values
const DEMO_STEP_MS = 307300;

let bgBuffer;
let particles = [];
let lastTickSecond = -1;
let demo = { on: false, t: 0 };
let uiHidden = false;
let uiButtons = [];

let R, RI, R_LABEL, R_ICONS;

class Particle {
  constructor(x, y, col, ambient = false) {
    this.ambient = ambient;
    this.col = col;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.size  = this.ambient ? random(1, 2.5) : random(1.5, 3.5);
    this.speed = this.ambient ? random(0.1, 0.5) : random(0.8, 2.2);
    this.angle = random(360);
    this.life  = this.ambient ? random(200, 400) : random(40, 90);
  }

  update() {
    this.x += cos(this.angle) * this.speed;
    this.y += sin(this.angle) * this.speed;
    this.life--;
    if (!this.ambient) this.size *= 0.97;
    if (this.ambient && (this.life <= 0 || this.offscreen())) {
      this.reset(random(width), random(height));
    }
  }

  offscreen() {
    return this.x < -20 || this.x > width + 20 ||
    this.y < -20 || this.y > height + 20;
  }

  dead() { return !this.ambient && this.life <= 0; }

  show() {
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col),
         alpha(this.col) * (this.ambient ? 1 : this.life / 90));
    circle(this.x, this.y, this.size);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textAlign(CENTER, CENTER);

  computeLayout();
  makeBackground();

  for (let i = 0; i < 70; i++) {
    particles.push(new Particle(random(width), random(height),
      color(C_BLUE[0], C_BLUE[1], C_BLUE[2], random(25, 60)), true));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeLayout();
  makeBackground();
}

function computeLayout() {
  R       = min(width, height) * 0.33;
  RI      = R * 0.60;
  R_LABEL = (R + RI) / 2;
  R_ICONS = R + min(width, height) * 0.085;
}

// The gradient is rendered once into a buffer instead of ~700 line()
// is called on every frame
function makeBackground() {
  if (bgBuffer) bgBuffer.remove();
  bgBuffer = createGraphics(width, height);
  for (let y = 0; y < height; y++) {
    const c = lerpColor(color(8, 9, 18), color(18, 24, 42), y / height);
    bgBuffer.stroke(c);
    bgBuffer.line(0, y, width, y);
  }
}

// Single time source: the real clock or the accelerated virtual one
function getNow() {
  return demo.on ? new Date(demo.t) : new Date();
}

// Week progress in [0,1]: (weekday index + day fraction) / 7 - the single
// source of truth for the hand, the fills and the day name.
function weekProgress(now) {
  const dayIndex = (now.getDay() + 6) % 7;
  const daySec = now.getHours() * 3600 + now.getMinutes() * 60 +
  now.getSeconds() + now.getMilliseconds() / 1000;
  return (dayIndex + daySec / 86400) / 7;
}

function currentPart(now) {
  const h = now.getHours();
  let part = DAY_PARTS[0];
  for (const p of DAY_PARTS) if (h >= p.h) part = p;
  return part;
}

function draw() {
  if (demo.on) demo.t += DEMO_STEP_MS;

  const now      = getNow();
  const progress = weekProgress(now);
  const dayIndex = floor(progress * 7) % 7;
  const handAng  = TOP_ANGLE + progress * 360;
  const hovered  = hoveredDay();

  image(bgBuffer, 0, 0);
  updateParticles(now);

  push();
  translate(width / 2, height / 2);

  drawPartBackdrop(now);
  drawGlowRings();
  drawWeekRing(progress, dayIndex, handAng, hovered);
  drawDayLabels(dayIndex, hovered);
  drawTodayIcons(dayIndex, now);
  drawHand(handAng);
  drawCenterPanel(now, progress, dayIndex);
  pop();

  drawHUD();
}

// Reverse iteration so removal never skips elements, 
// ambient particles are reused, sparks and click bursts die out.
function updateParticles(now) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.show();
    if (p.dead()) particles.splice(i, 1);
  }

  const sec = now.getSeconds();
  if (sec !== lastTickSecond && (!demo.on || frameCount % 5 === 0)) {
    lastTickSecond = sec;
    const a = TOP_ANGLE + weekProgress(now) * 360;
    const tx = width / 2 + cos(a) * (R + 16);
    const ty = height / 2 + sin(a) * (R + 16);
    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(tx + random(-3, 3), ty + random(-3, 3),
        color(C_GOLD[0], C_GOLD[1], C_GOLD[2], 200)));
    }
  }
}

// One smooth radial gradient tinted by the current part of the day
function drawPartBackdrop(now) {
  const [cr, cg, cb] = currentPart(now).col;
  const grad = drawingContext.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 2.1);
  grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.13)`);
  grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
  drawingContext.fillStyle = grad;
  drawingContext.fillRect(-width / 2, -height / 2, width, height);
}

function drawGlowRings() {
  noFill();
  stroke(C_BLUE[0], C_BLUE[1], C_BLUE[2], 22);
  strokeWeight(1.5);
  const r = R + 18 + sin(frameCount * 1.3) * 4;
  circle(0, 0, r * 2);
}

function drawWeekRing(progress, dayIndex, handAng, hovered) {
  noStroke();

  for (let i = 0; i < 7; i++) {
    const a0 = TOP_ANGLE + i * DAY_ANGLE;
    const a1 = a0 + DAY_ANGLE;
    if (i < dayIndex)      fill(C_BLUE[0], C_BLUE[1], C_BLUE[2], 26);
    else if (i === dayIndex) fill(C_GOLD[0], C_GOLD[1], C_GOLD[2], 22);
    else                   fill(255, 255, 255, 6);
    if (i === hovered)     fill(C_BLUE[0], C_BLUE[1], C_BLUE[2], 55);
    arc(0, 0, R * 2, R * 2, a0, a1, PIE);
  }

  if (progress > 0.001) {
    fill(C_BLUE[0], C_BLUE[1], C_BLUE[2], 30);
    arc(0, 0, R * 2, R * 2, TOP_ANGLE, handAng, PIE);
  }

  const d0 = TOP_ANGLE + dayIndex * DAY_ANGLE;
  noFill();
  stroke(C_GOLD[0], C_GOLD[1], C_GOLD[2], 120 + sin(frameCount * 2) * 50);
  strokeWeight(3);
  arc(0, 0, R * 2, R * 2, d0, d0 + DAY_ANGLE);

  for (let i = 0; i < 7; i++) {
    const a0 = TOP_ANGLE + i * DAY_ANGLE;
    stroke(255, i === 0 ? 90 : 45);
    strokeWeight(i === 0 ? 2 : 1);
    line(cos(a0) * RI, sin(a0) * RI, cos(a0) * (R + 8), sin(a0) * (R + 8));

    stroke(255, 40);
    strokeWeight(1);
    for (const h of [6, 12, 18]) {
      const a = a0 + (h / 24) * DAY_ANGLE;
      line(cos(a) * R, sin(a) * R, cos(a) * (R + 5), sin(a) * (R + 5));
    }
  }

  noStroke();
  fill(10, 12, 22, 242);
  circle(0, 0, RI * 2);
  noFill();
  stroke(C_BLUE[0], C_BLUE[1], C_BLUE[2], 60);
  strokeWeight(1.5);
  circle(0, 0, RI * 2);
}

function drawDayLabels(dayIndex, hovered) {
  noStroke();
  for (let i = 0; i < 7; i++) {
    const mid = TOP_ANGLE + i * DAY_ANGLE + DAY_ANGLE / 2;
    const x = cos(mid) * R_LABEL;
    const y = sin(mid) * R_LABEL;

    const active = i === dayIndex;
    textStyle(active ? BOLD : NORMAL);
    textSize(active ? R * 0.085 : R * 0.066);

    fill(0, 120);
    text(DAYS_SHORT[i], x + 1.5, y + 1.5);
    if (active)            fill(C_GOLD[0], C_GOLD[1], C_GOLD[2], 255);
    else if (i === hovered) fill(255, 230);
    else                   fill(255, 130);
    text(DAYS_SHORT[i], x, y);
  }
  textStyle(NORMAL);
}

// Color ribbon of the seven day ranges: the active range is brighter and
// thicker, so the hand is inside it by construction. Icons sit at the
// true centers of their ranges; the active label goes radially outward
function drawTodayIcons(dayIndex, now) {
  const a0 = TOP_ANGLE + dayIndex * DAY_ANGLE;
  const hourAng = h => a0 + (h / 24) * DAY_ANGLE;
  const part = currentPart(now);

  for (let i = 0; i < DAY_PARTS.length; i++) {
    const p  = DAY_PARTS[i];
    const h1 = p.h;
    const h2 = i < DAY_PARTS.length - 1 ? DAY_PARTS[i + 1].h : 24;
    const isNow = p === part;
    const [cr, cg, cb] = p.col;

    noFill();
    strokeCap(SQUARE);
    stroke(cr, cg, cb, isNow ? 185 + sin(frameCount * 2) * 30 : 60);
    strokeWeight(isNow ? 10 : 6);
    arc(0, 0, (R + 8) * 2, (R + 8) * 2, hourAng(h1) + 0.4, hourAng(h2) - 0.4);
    strokeCap(ROUND);

    const a = hourAng((h1 + h2) / 2);
    const x = cos(a) * R_ICONS;
    const y = sin(a) * R_ICONS;

    noStroke();
    if (isNow) {
      const pulse = sin(frameCount * 3) * 2;
      fill(cr, cg, cb, 60);
      circle(x, y, R * 0.125 + pulse);
      noFill();
      stroke(cr, cg, cb, 220);
      strokeWeight(1.5);
      circle(x, y, R * 0.125 + pulse);
      noStroke();
      fill(255);
      textSize(R * 0.07);
      text(p.icon, x, y - 1);
      fill(cr, cg, cb);
      textStyle(BOLD);
      textSize(R * 0.034);
      text(p.name, cos(a) * (R_ICONS + R * 0.155),
                   sin(a) * (R_ICONS + R * 0.155));
      textStyle(NORMAL);
    } else {
      fill(cr, cg, cb, 26);
      circle(x, y, R * 0.08);
      fill(255, 175);
      textSize(R * 0.05);
      text(p.icon, x, y);
    }
  }
}

function drawHand(handAng) {
  push();
  rotate(handAng);

  for (let i = 0; i < 3; i++) {
    stroke(C_GOLD[0], C_GOLD[1] - i * 15, C_GOLD[2], 210 - i * 65);
    strokeWeight(3 - i);
    line(RI - 4, 0, R + 14, 0);
  }
  noStroke();
  fill(255, 230, 190);
  triangle(R + 12, -5, R + 12, 5, R + 22, 0);
  fill(C_GOLD[0], C_GOLD[1], C_GOLD[2], 90);
  circle(R + 16, 0, 14 + sin(frameCount * 4) * 3);
  fill(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
  circle(RI - 4, 0, 7);
  pop();
}

function drawCenterPanel(now, progress, dayIndex) {
  noStroke();

  const part = currentPart(now);
  textSize(R * 0.12);
  text(part.icon, 0, -RI * 0.58);
  fill(part.col[0], part.col[1], part.col[2]);
  textStyle(BOLD);
  textSize(R * 0.052);
  text(part.name.toUpperCase(), 0, -RI * 0.37);
  textStyle(NORMAL);

  const t = nf(now.getHours(), 2) + ':' + nf(now.getMinutes(), 2) +
            ':' + nf(now.getSeconds(), 2);
  fill(255);
  textStyle(BOLD);
  textSize(R * 0.155);

  // Fixed-width digit slots keep the clock from wobbling as glyph
  // widths change with the seconds.
  const slot = textWidth('8') * 1.06;
  const x0 = -slot * (t.length - 1) / 2;
  for (let i = 0; i < t.length; i++) {
    text(t[i], x0 + i * slot, -RI * 0.18);
  }
  textStyle(NORMAL);

  fill(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
  textSize(R * 0.068);
  text(DAYS_FULL[dayIndex], 0, RI * 0.14);
  fill(255, 140);
  textSize(R * 0.05);
  text(now.getDate() + ' ' + MONTHS[now.getMonth()], 0, RI * 0.30);

  const bw = RI * 1.3, bh = R * 0.022, by = RI * 0.52;
  fill(255, 28);
  rect(-bw / 2, by, bw, bh, bh / 2);
  fill(C_BLUE[0], C_BLUE[1], C_BLUE[2], 190);
  rect(-bw / 2, by, bw * progress, bh, bh / 2);
  stroke(10, 12, 22);
  strokeWeight(1);
  for (let i = 1; i < 7; i++) {
    const x = -bw / 2 + (bw / 7) * i;
    line(x, by, x, by + bh);
  }
  noStroke();
  fill(255, 170);
  textSize(R * 0.045);
  text('WEEK ' + nf(progress * 100, 1, 1) + '%', 0, by + R * 0.075);

  if (demo.on) {
    fill(C_GOLD[0], C_GOLD[1], C_GOLD[2], 150 + sin(frameCount * 5) * 60);
    textSize(R * 0.042);
    text('TIME-LAPSE  ·  [R] REAL TIME', 0, by + R * 0.14);
  }
}

// Clickable buttons: when the UI is hidden, a faint
// eye button brings it back
function drawHUD() {
  uiButtons = [];
  const fs = max(11, min(width, height) * 0.017);
  const m = 14;

  if (uiHidden) {
    const s = fs * 2.1;
    const b = { x: m, y: height - m - s, w: s, h: s,
                action: () => uiHidden = false };
    const hov = overButton(b);
    noStroke();
    fill(255, hov ? 26 : 8);
    rect(b.x, b.y, b.w, b.h, 8);
    fill(255, hov ? 160 : 34);
    textSize(fs * 1.1);
    text('👁️', b.x + b.w / 2, b.y + b.h / 2);
    uiButtons.push(b);
    cursor(hov ? HAND : ARROW);
    return;
  }

  const defs = [
    { label: demo.on ? 'REAL TIME [R]' : 'TIME-LAPSE [T]', action: toggleDemo },
    { label: 'SAVE PNG [S]', action: () => saveCanvas('weekly_clock', 'png') },
    { label: 'HIDE UI [H]',  action: () => uiHidden = true }
  ];

  textSize(fs);
  const bh = fs * 2.2;
  const y = height - m - bh;
  let x = m;
  let anyHover = false;

  for (const d of defs) {
    const bw = textWidth(d.label) + fs * 1.8;
    const b = { x, y, w: bw, h: bh, action: d.action };
    const hov = overButton(b);
    anyHover = anyHover || hov;

    stroke(255, hov ? 90 : 40);
    strokeWeight(1);
    fill(255, hov ? 30 : 12);
    rect(b.x, b.y, b.w, b.h, 9);
    noStroke();
    fill(255, hov ? 230 : 130);
    text(d.label, b.x + b.w / 2, b.y + b.h / 2);

    uiButtons.push(b);
    x += bw + 8;
  }

  fill(255, 60);
  textSize(fs * 0.9);
  textAlign(LEFT, BOTTOM);
  text('click — particles', m + 2, y - 6);
  textAlign(CENTER, CENTER);

  cursor(anyHover ? HAND : ARROW);
}

const overButton = b => mouseX >= b.x && mouseX <= b.x + b.w &&
                        mouseY >= b.y && mouseY <= b.y + b.h;

function toggleDemo() {
  demo.on = !demo.on;
  if (demo.on) demo.t = Date.now();
}

function hoveredDay() {
  const dx = mouseX - width / 2;
  const dy = mouseY - height / 2;
  const d = sqrt(dx * dx + dy * dy);
  if (d < RI || d > R + 55) return -1;
  const rel = ((atan2(dy, dx) - TOP_ANGLE) % 360 + 360) % 360;
  return floor(rel / DAY_ANGLE);
}

function mousePressed() {
  for (const b of uiButtons) {
    if (overButton(b)) { b.action(); return; }
  }
  for (let i = 0; i < 22; i++) {
    particles.push(new Particle(mouseX, mouseY,
      color(C_BLUE[0], C_BLUE[1], C_BLUE[2], random(90, 180))));
  }
}

function keyPressed() {
  const k = key.toLowerCase();
  if (k === 't') toggleDemo();
  if (k === 'r') demo.on = false;
  if (k === 's') saveCanvas('weekly_clock', 'png');
  if (k === 'h') uiHidden = !uiHidden;
}
