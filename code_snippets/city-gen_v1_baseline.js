// Procedural City — v1, baseline (stage 1 of 5)
// The original starting point, preserved as-is: a 10x10 grid where every
// cell gets a random type, a flat top view, and noLoop() freezing the
// sketch after the first frame. It runs, but it reads as noise.

let cityGrid = [];

function setup() {
  createCanvas(600, 600);
  noStroke();

  let cols = 10;
  let rows = 10;
  for (let i = 0; i < cols; i++) {
    cityGrid[i] = [];
    for (let j = 0; j < rows; j++) {
      cityGrid[i][j] = floor(random(3)); // 0, 1 or 2
    }
  }
}

function draw() {
  background(220);
  let cols = 10;
  let rows = 10;
  let cellSize = width / cols; // 600 / 10 = 60
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = i * cellSize;
      let y = j * cellSize;
      let type = cityGrid[i][j];

      if (type === 0) {
        // Skyscraper
        fill(50);
        rect(x + cellSize * 0.1, y + cellSize * 0.2, cellSize * 0.8, cellSize * 0.8);
      }
      else if (type === 1) {
        // Single-storey building
        fill(180);
        rect(x + cellSize * 0.1, y + cellSize * 0.5, cellSize * 0.8, cellSize * 0.4);
      }
      else {
        // Vacant lot / park
        fill(100, 200, 100);
        rect(x, y, cellSize, cellSize);
        // A few "tree dots", always at the same spots
        fill(34, 139, 34);
        ellipse(x + cellSize * 0.3, y + cellSize * 0.3, 10);
        ellipse(x + cellSize * 0.7, y + cellSize * 0.5, 10);
        ellipse(x + cellSize * 0.5, y + cellSize * 0.7, 10);
      }
    }
  }
  noLoop();
}
