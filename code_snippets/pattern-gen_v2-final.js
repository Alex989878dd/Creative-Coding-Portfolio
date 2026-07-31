// Pattern v2 (stage 2 of 2)

let matrix = [];
let circleSize = [];
let angle = 0;
let bg = null;
let rectBG = null;
let circleColour = null;
let w = 0;
let rows = 8;
let columns = 8;

function setup() {
  createCanvas(400, 400);
  rectMode(CENTER);
  angleMode(DEGREES);
  
  // Calculate the size of each grid cell.
  w = width / rows;
  background("#B7A3E3");

  // Store a random target rotation for each tile.
  for (i = 0; i < 8; i++) {
    matrix[i] = [];
    for (j = 0; j < 8; j++) {
      matrix[i][j] = random(0, 360);
    }
  }

  // Store a random circle size for each tile.
  for (i = 0; i < 8; i++) {
    circleSize[i] = [];
    for (j = 0; j < 8; j++) {
      circleSize[i][j] = random(w / 2, w / 4);
    }
  }

  rectBG = color(0, 0, 0);
  bg = color(255, 255, 255);
  circleColour = color(
    random(0, 255),
    random(0, 255),
    random(0, 255)
  );
}

function draw() {
  background(bg);
  strokeWeight(1);
  fill(rectBG);
  stroke("#383838");

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      push();

      // Move the origin to the centre of the current cell.
      translate(i * w + 25, j * w + 25);
      
      if (angle < matrix[i][j]) {
        rotate(angle);
        angle += 0.1;
      } else {
        rotate(matrix[i][j]);
      }

      // Change the tile dimensions using the mouse position.
      rect(0, 0, mouseX / 10, mouseY / 7, 3);
      
      fill(circleColour);
      ellipse(0, 0, circleSize[i][j]);
      pop();
    }
  }
}

function mousePressed() {
  // Generate new colours whenever the mouse is clicked.
  bg = color(
    random(0, 255),
    random(0, 255),
    random(0, 255)
  );
  rectBG = color(
    random(0, 255),
    random(0, 255),
    random(0, 255)
  );
  circleColour = color(
    random(0, 255),
    random(0, 255),
    random(0, 255)
  );

  // Generate a new set of circle sizes.
  for (i = 0; i < 8; i++) {
    circleSize[i] = [];
    for (j = 0; j < 8; j++) {
      circleSize[i][j] = random(w / 6, w / 2.5);
    }
  }
}