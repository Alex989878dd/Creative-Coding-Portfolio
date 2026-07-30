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
  w = width/rows; //calculate the width of the cell relative to the size of the canvas
  background("#B7A3E3");

  //this nested loop creates 8x8 matrix and filles it out with random numbers in given range
  for (i = 0; i < 8; i++) {
    matrix[i] = [];
    for (j = 0; j < 8; j++) {
      matrix[i][j] = random(0, 360);
    }
  }
  //this nested loop creates 8x8 matrix and filles it out with cirles in random sizes but in specific range 
  for (i = 0; i < 8; i++) {
    circleSize[i] = [];
    for (j = 0; j < 8; j++) {
      circleSize[i][j] = random(w/2, w/4);
    }
  }

  rectBG = color(0, 0, 0);
  bg = color(255, 255, 255);
  circleColour = color(random(0, 255), random(0, 255), random(0, 255));
}

function draw() {
  background(bg);
  strokeWeight(1);
  fill(rectBG);
  stroke("#383838");

  //this nested loop creates pattern grid 
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      //rect(i*w+25, j*w+25, w, w) //cells
      push();
      //strokeWeight(random(0.5, 3)) //gives an interesting pulsation effect due to the sharp change between different stroke weights
      translate(i*w+25, j*w+25); 
      if (angle < matrix[i][j]) {
        rotate(angle);
        angle += 0.1;
      } else {
        rotate(matrix[i][j]);
      }
      rect(0, 0, mouseX/10, mouseY/7, 3); //draws a tile in the centre of its coordinate system (cell)
      //rect(0, 0, w/2, w/2, 3); //comment previous line, uncomment this to see previous version of pattern 
      fill(circleColour);
      ellipse(0, 0, circleSize[i][j]);
      pop();
    }
  }
}

function mousePressed() {
  //every new mouse click colours of background, square and circle tiles will be picked randomly
  bg = color(random(0, 255), random(0, 255), random(0, 255));
  rectBG = color(random(0, 255), random(0, 255), random(0, 255));
  circleColour = color(random(0, 255), random(0, 255), random(0, 255));

  //every new mouse click this nested loop creates 8x8 matrix with random size circles 
  for (i = 0; i < 8; i++) {
    circleSize[i] = [];
    for (j = 0; j < 8; j++) {
      circleSize[i][j] = random(w/6, w/2.5);
    }
  }
}
