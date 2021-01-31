/* exported preload, setup, draw, placeTile */

/* global generateGrid drawGrid */

let seed = 0;
let tilesetImage;
let currentGrid = [];
let numRows, numCols;
let waterThreshold = 60;
let waterOffset = 0;
let time = 0;
let lastFrame = 0;

let gKey = '_',
    dKey = ':',
    bKey = '=',
    len = 2;

let lookupDict = {}

let gO = 13;
let dO = 21;
let bO = 24;

let  g = [
    [-3, gO], // same as ":" nowhere around this tile
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

let d2g = [
    [4, gO+2], // same as ":" nowhere around this tile
    [15, dO+2], // N
    [17, dO], // S
    [16, dO], // N + S *
    [15, dO], // E *
    [15, dO+2], // N + E
    [15, dO], // S + E
    [15, dO+1], // - W
    [17, dO+2], // W *
    [17, dO+2], // N + W
    [17, dO], // S + W
    [17, dO+1], // - E
    [16, dO], // W + E
    [16, dO+2], // - S
    [16, dO], // - N  16 mid
    // [2, dO], // all
    [1, dO], // all
];

let b = [
    [0, bO], // same as ":" nowhere around this tile
    [-3, bO], // same just north
    [-3, bO], // same just south
    [-3, bO], // N + S
    [-3, bO], // E
    [-3, bO], // N + E
    [-3, bO], // S + E
    [-3, bO], // - W
    [-3, bO], // W
    [-3, bO], // N + W
    [-3, bO], // S + W
    [-3, bO], // - E
    [-3, bO], // W + E
    [-3, bO], // - S
    [-3, bO], // - N
    [15, bO], // all
]

// lookup arrays
// bit order:
// WESN
// 0001 ie refers to northern tile being same
// 
// lookup: describes the tile image offset for the given bit combination -> array index.
//   You can think of the lookup table as a mapping function
//
let noiseArr = [];

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
  randomSeed(seed);
  drawGrid(currentGrid);
}

function generateLookupDict() {
  lookupDict[gKey] = g;
  lookupDict[dKey] = d2g; 
  lookupDict[bKey] = b; 
}

function generateGrid(numCols, numRows) {
  let grid = [];
  let minOff = 3;
  let leftX = random(numCols - minOff);
  leftX = floor((leftX * leftX) / leftX); // skew to left
  let topY = random(numRows - minOff);
  topY = floor(topY * topY / topY);
  let rightX = floor(random(leftX + minOff, numCols));
  let botY = floor(random(topY + minOff, numRows));
  for (let i = 0; i < numRows; i++) {
    let row = [];
    for (let j = 0; j < numCols; j++) {
      if(topY <= j && j <= botY && leftX <= i ) {
        if (i <= rightX ) {
          row.push(dKey);
        }
        else // outside walls
          row.push(bKey);
      }
      else row.push(gKey);
    }
    grid.push(row);
  }
  return grid;
}

function drawGrid(grid) {
  background(128);
  updateWater();
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      let target = grid[i][j];
      drawWithoutCorners(grid, i, j, target, 0);
      drawContext(grid, i, j, target, 0, 0);
    }
  }
}

function drawWithoutCorners(grid, i, j, target, offset) {
    let tiOffset, tjOffset;

    // check if key is in array
    if (Object.keys(lookupDict).includes(target)) {
      [tiOffset, tjOffset] = lookupDict[target][15];
    }
    else [tiOffset, tjOffset] = lookupDict[gKey][0];

    if (target == gKey) {
        offset = floor(random(4));
        offset += waterOffset;
        offset %= 4;
    }
  
    placeTile(i, j, tiOffset + offset, tjOffset); // temp sub 1 so grass is at 0 0
} 

function updateWater() {
    time += millis() - lastFrame;
    if (time > waterThreshold) {
      waterOffset++;
      waterOffset %= 4;
      time = 0;
    }
    lastFrame = millis();
}


function drawContext(grid, i, j, target, ti, tj) {
  let code = gridCode(grid, i, j, target);
  let tiOffset, tjOffset;
  let offset = 0;

  // check if key is in array
  if (Object.keys(lookupDict).includes(target)) {
    [tiOffset, tjOffset] = lookupDict[target][code];}
  else [tiOffset, tjOffset] = lookupDict[gKey][0];

    if (target == gKey) {
      offset = random(4);
      offset = floor(random(4));
      offset += waterOffset;
      offset %= 4;
    }

  placeTile(i, j, ti + tiOffset + offset, tj + tjOffset); // temp sub 1 so grass is at 0 0
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
