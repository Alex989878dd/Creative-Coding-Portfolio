// Pattern v1 (stage 1 of 2)

function setup() {
  createCanvas(400, 400);
  
  rectMode(CENTER);
  angleMode(DEGREES);
  
  // Store a random target rotation for each tile.
  for (i = 0; i < 8; i++) {
    matrix[i] = [];
    for (j = 0; j < 8; j++) {
      matrix[i][j] = random(0, 360);
    }
  }
}

let matrix = [];
let angle = 0;

function draw() {
  let rows = 8;
  let columns = 8;
  
  background("#B7A3E3");
  fill("#61478F");
  stroke("#1D003D");
  strokeWeight(1);
  
  // Calculate the size of each grid cell.
  let w = width / rows;
  
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
      
      // Draw the tile around its local origin.
      rect(0, 0, w / 2, w / 2, 3);
      pop();
    } 
  }
}