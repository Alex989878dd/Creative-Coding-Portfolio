function setup() {//начальные настройки
  createCanvas(400, 400);
  
  rectMode(CENTER)//центрирует квадрат относительно центра
  angleMode(DEGREES)//меняет радианы на градусы
  
  for(i = 0; i < 8; i++)
  {
    matrix[i] = []
    for(j = 0; j < 8; j++)
      {
        matrix[i][j] = random(0, 360) //IMROVE: -> random(200, 1000)
      }
  }
}
let matrix = []
let angle = 0

function draw() //перерисовывается 60р/сек
{
  let rows = 8
  let columns = 8
  
  background("#B7A3E3");
  fill("#61478F")
  stroke("#1D003D")
  strokeWeight(1)
  let w = width / rows //высчитываем ширину ячейки относительно размера канваса
  
  
  for(let i = 0; i < rows; i++){//i каждую итерацию на 1 больше
    for(let j = 0; j < columns; j++)
    {
      //rect(i*w+25, j*w+25, w, w)//ячейки
      push()
        translate(i*w+25, j*w+25)//меняет положение системы координат
       if(angle < matrix[i][j])
        {
          rotate(angle)
          angle+= 0.1 //IMROVE: -> 0.2
        }
        else
        {
          rotate(matrix[i][j])
        }
      rect(0, 0, w/2, w/2, 3)//центрирует квадрат внутри своей системы координат
      pop()
      
      
    } 
  }
}