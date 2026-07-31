// Weekly Clock v1, baseline prototype (stage 1 of 3)
// A ring of seven day sectors, part-of-day icons and a particle field.

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const PARTS = [
  { h: 6,  icon: '🌅', name: 'Dawn'    },
  { h: 9,  icon: '☕', name: 'Coffee'  },
  { h: 12, icon: '🍽️', name: 'Lunch'   },
  { h: 15, icon: '📊', name: 'Work'    },
  { h: 18, icon: '🏁', name: 'Finish'  },
  { h: 21, icon: '🌙', name: 'Evening' }
];

let particles = [];
let R;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textAlign(CENTER, CENTER);
  R = min(width, height) * 0.33;
  for (let i = 0; i < 40; i++) {
    particles.push(new Particle(random(width), random(height)));
  }
}

function draw() {
  // The background gradient is redrawn line by line on every frame
  for (let y = 0; y < height; y++) {
    const t = y / height;
    stroke(lerp(10, 26, t), lerp(9, 20, t), lerp(18, 40, t));
    line(0, y, width, y);
  }

  // Week progress from hours/minutes/seconds only: the day of the week is
  // ignored, so the value never leaves the first seventh of the circle
  const secondsToday = hour() * 3600 + minute() * 60 + second();
  const weekProgress = secondsToday / (7 * 86400);
  const dayIndex = floor(weekProgress * 7);

  push();
  translate(width / 2, height / 2);

  // Day sectors start at p5's default 0 degrees (3 o'clock)
  for (let i = 0; i < 7; i++) {
    const a0 = i * (360 / 7);
    fill(i < dayIndex ? color(110, 160, 255, 60) : color(255, 18));
    stroke(255, 40);
    strokeWeight(1);
    arc(0, 0, R * 2, R * 2, a0, a0 + 360 / 7, PIE);
  }

  // All 42 icons at once: six parts of the day on each of the seven days
  noStroke();
  for (let i = 0; i < 7; i++) {
    for (const p of PARTS) {
      const a = i * (360 / 7) + (p.h / 24) * (360 / 7);
      const x = cos(a) * (R + 42);
      const y = sin(a) * (R + 42);
      fill(255, 16);
      circle(x, y, 30);
      fill(255);
      textSize(13);
      text(p.icon, x, y - 1);
      fill(255, 120);
      textSize(8);
      text(p.name, x, y + 16);
    }
  }

  textStyle(BOLD);
  textSize(R * 0.09);
  for (let i = 0; i < 7; i++) {
    const mid = i * (360 / 7) + 360 / 14;
    fill(i === dayIndex ? color(255, 195, 115) : color(255, 130));
    text(DAYS[i], cos(mid) * R * 0.78, sin(mid) * R * 0.78);
  }
  // BOLD is never reset and leaks into everything drawn below

  // The hand uses its own -90 offset while the sectors start at 0
  const handAngle = -90 + weekProgress * 360;
  stroke(255, 195, 115);
  strokeWeight(4);
  line(0, 0, cos(handAngle) * (R + 24), sin(handAngle) * (R + 24));
  noStroke();
  fill(255, 195, 115);
  circle(cos(handAngle) * (R + 24), sin(handAngle) * (R + 24), 10);

  fill(255);
  textSize(R * 0.13);
  text(DAYS[dayIndex], 0, -R * 0.07);
  textSize(R * 0.06);
  text('Week ' + nf(weekProgress * 100, 1, 1) + '%', 0, R * 0.06);
  pop();

  // splice() inside for..of skips the element that follows each removal
  for (const p of particles) {
    p.update();
    p.show();
    if (p.life <= 0) particles.splice(particles.indexOf(p), 1);
  }
  if (frameCount % 6 === 0) {
    particles.push(new Particle(random(width), random(height)));
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-0.4, 0.4);
    this.vy = random(-0.4, 0.4);
    this.life = random(120, 360);
    this.size = random(1.5, 3.5);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1;
  }
  show() {
    noStroke();
    fill(110, 160, 255, map(this.life, 0, 360, 0, 90));
    circle(this.x, this.y, this.size);
  }
}

function mousePressed() {
  for (let i = 0; i < 15; i++) {
    const p = new Particle(mouseX, mouseY);
    p.vx = random(-2, 2);
    p.vy = random(-2, 2);
    p.life = random(40, 90);
    particles.push(p);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  R = min(width, height) * 0.33;
}
