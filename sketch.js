/* exported preload, setup, draw, placeTile */

/* global generateGrid drawGrid */

let seed = 0;
let tilesetImage;
let currentGrid = [];
let numRows, numCols;

let gKey = ':',
    dKey = '_'
    len = 2;

let lookupDict = {}

const seasons = 4;
let season = 0;
let seasonRate = 1500;
const gOSeasons = [6, 12, 18, 0]; // F W Su Sp
const dOSeasons = [0, 13, 1,  3]
let gO = gOSeasons[0];
let dO = dOSeasons[0];
let inc = 0.01;

// lookup arrays
// bit order:
// WESN
// 0001 ie refers to northern tile being same
// 
// lookup: describes the tile image offset for the given bit combination -> array index.
//   You can think of the lookup table as a mapping function
//
let g;
let d2g;
let noiseArr = [];

let currentFrame = 0;
let lastFrame = 0;


function preload() {
  tilesetImage = loadImage("./tileset.png");
}

function setup() {
  numCols = select("#asciiBox").attribute("rows") | 0; // iot grab html element named asciiBox.
  // 'float | 0' converts into int
  numRows = select("#asciiBox").attribute("cols") | 0; // 'select()' grabs an html element
  createCanvas(16 * numCols, 16 * numRows).parent("canvasContainer"); // iot set canvas parent to html container
  select("canvas").elt.getContext("2d").imageSmoothingEnabled = false;
  select("#reseedButton").mousePressed(reseed);
  select("#asciiBox").input(reparseGrid); // iot run reparseGrid as a callback to asciiBox's input being changed
  generateLookupDict();
  reseed();
  // generateGrid();
}

function draw() {
  updateSeason();
  randomSeed(seed);
  drawGrid(currentGrid);
}

function updateSeason() {
  currentFrame += millis() - lastFrame;
  // print(currentFrame)
  if(currentFrame > seasonRate){
    currentFrame = 0;
    season++;
    season %= seasons;
    gO = gOSeasons[season];
    dO = dOSeasons[season];
    generateLookupDict();
    print("updated")
  }
  lastFrame = millis();
}

function generateLookupDict() {
  generateLookupArrays();
  lookupDict[gKey] = g;
  lookupDict[dKey] = d2g; 
}

function generateLookupArrays() {
  g = [
    [-3, -3], // same as ":" nowhere around this tile
    [-3, gO], // same just north
    [-3, gO], // same just south
    [-3, gO], // N + S
    [-3, gO], // E
    [-3, gO], // N + E
    [-3, gO], // S + E
    [-3, gO], // - W
    [-3, gO], // W
    [-3, gO], // N + W
    [-3, gO], // S + W
    [-3, gO], // - E
    [-3, gO], // W + E
    [-3, gO], // - S
    [-3, gO], // - N
    [0, gO], // all
  ];

  d2g = [
    [4, gO+2], // same as ":" nowhere around this tile
    [4, gO+2], // N
    [6, gO], // S
    [4, gO+1], // N + S *
    [4, gO+2], // E *
    [4, gO+2], // N + E
    [4, gO], // S + E
    [4, gO+1], // - W
    [6, gO+2], // W *
    [6, gO+2], // N + W
    [6, gO], // S + W
    [6, gO+1], // - E
    [5, gO], // W + E
    [5, gO+2], // - S
    [5, gO], // - N
    [0, dO], // all
  ];
}

// function generateNoise(numCols, numRows) {
//   // https://youtu.be/ikwNrFvnL3g
//   noiseArr = [];
//   let rowOff = 0;
//   let colOff = 0;
//   for (let i = 0; i < numRows; i++) {
//     let row = [];
//     for (let j = 0; j < numCols; j++) {
//       row.push(noise(rowOff, colOff) * 2);
//       colOff += inc;
//     }
//     rowOff += inc;
//     noiseArr.push(row);
//   }
//   return noiseArr;
// }

function generateGrid(numCols, numRows) {
  let grid = [];
  let keys = Object.keys(lookupDict)
  // let keys = Object.keys(lookupDict);
  for (let i = 0; i < numRows; i++) {
    let row = [];
    for (let j = 0; j < numCols; j++) {

      // build from noiseArr
      let index = floor(noiseArr[i][j]);
      row.push(keys[index]);

      // if (i & 1) {
      //   row = grid[i-1];
      //   break;
      // }
      // else {
      //   if (j & 1) row.push(row[j-1]);
      //   else {
      //     let val = keys[Math.floor(keys.length * random())];
      //     row.push([val]);
      //   }
      // }
    }
    grid.push(row);
  }
  return grid;
}

function drawGrid(grid) {
  background(128);
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      
      // Growth rate stuff 
      let target = grid[i][j];
      let limit = random(4);
      let rand = (random(0, limit));
      rand = floor(rand * rand / rand);

      let offset = rand;
      drawWithoutCorners(grid, i, j, target, offset);
      drawContext(grid, i, j, target, 0, 0);
    }
  }
}


function drawWithoutCorners(grid, i, j, target, offset) {
    let tiOffset, tjOffset;

    // check if key is in array
    if (Object.keys(lookupDict).includes(target)) {
      [tiOffset, tjOffset] = lookupDict[target][15];
    } else [tiOffset, tjOffset] = lookupDict[gKey][0];
  
    placeTile(i, j, tiOffset + offset, tjOffset); // temp sub 1 so grass is at 0 0
} 


function drawContext(grid, i, j, target, ti, tj) {
  let code = gridCode(grid, i, j, target);
  let tiOffset, tjOffset;

  // check if key is in array
  if (Object.keys(lookupDict).includes(target)) {
    [tiOffset, tjOffset] = lookupDict[target][code];}
  else [tiOffset, tjOffset] = lookupDict[gKey][0];

  placeTile(i, j, ti + tiOffset, tj + tjOffset); // temp sub 1 so grass is at 0 0
}

function gridCode(grid, i, j, target) {
  // i believe target is the tile image to be endoced
  let northBit = gridCheck(grid, i - 1, j, target);
  let southBit = gridCheck(grid, i + 1, j, target);
  let eastBit = gridCheck(grid, i, j + 1, target);
  let westBit = gridCheck(grid, i, j - 1, target);
  // iot create a bit-array, use LSR
  let code =
    (northBit << 0) + (southBit << 1) + (eastBit << 2) + (westBit << 3);
  return code;
}

function gridCheck(grid, i, j, target) {
  if (i < 0 || j < 0 || i > numRows - 1 || j > numCols - 1) return false;
  return grid[i][j] == target ? true : false;
}

function placeTile(i, j, ti, tj) {
  // ti, tj determine selected tile to draw
  // create a grid code to determine tile image
  // the grid code cehcks gridCheck for each neighbour, which also handles when array null
  image(tilesetImage, 16 * j, 16 * i, 16, 16, 8 * ti, 8 * tj, 8, 8); // take offset from lookup(code)
}

function reseed() {
  seed = (seed | 0) + 1109;
  noiseSeed(seed);
  randomSeed(seed);
  select("#seedReport").html("seed " + seed);

  {
    noiseArr = [];
    for (let i = 0; i < numRows; i++) {
      let row = [];
      for (let j = 0; j < numCols; j++) {
        row.push(floor(noise(j/10, i/10) * 2)); // needs work
      }
      noiseArr.push(row);
    }
  }
  
  regenerateGrid();
}

function regenerateGrid() {
  select("#asciiBox").value(gridToString(generateGrid(numCols, numRows)));
  reparseGrid();
}

function reparseGrid() {
  currentGrid = stringToGrid(select("#asciiBox").value());
}

function gridToString(grid) {
  let rows = [];
  for (let i = 0; i < grid.length; i++) {
    rows.push(grid[i].join(""));
  }
  return rows.join("\n");
}

function stringToGrid(str) {
  let grid = [];
  let lines = str.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let row = [];
    let chars = lines[i].split("");
    for (let j = 0; j < chars.length; j++) {
      row.push(chars[j]);
    }
    grid.push(row);
  }
  return grid;
}
