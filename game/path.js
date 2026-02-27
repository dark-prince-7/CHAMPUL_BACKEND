const GRID_SIZE = 5;

const HOME_POSITIONS = {
  red: { row: 0, col: 2 },
  green: { row: 2, col: 4 },
  yellow: { row: 4, col: 2 },
  blue: { row: 2, col: 0 }
};

// Entry points to inner path for each color (just before entering home stretch)
const INNER_ENTRY_POINTS = {
  red: { row: 1, col: 3 },    // Entry from right of center
  green: { row: 3, col: 3 },  // Entry from bottom-right
  yellow: { row: 3, col: 1 }, // Entry from left of center
  blue: { row: 1, col: 1 }    // Entry from top-left
};

const SAFE_CELLS = [
  { row: 0, col: 2 },
  { row: 2, col: 4 },
  { row: 4, col: 2 },
  { row: 2, col: 0 }
];

const CENTER = { row: 2, col: 2 };

const outerPath = [
  { row: 0, col: 2 },
  { row: 0, col: 1 },
  { row: 0, col: 0 },
  { row: 1, col: 0 },
  { row: 2, col: 0 },
  { row: 3, col: 0 },
  { row: 4, col: 0 },
  { row: 4, col: 1 },
  { row: 4, col: 2 },
  { row: 4, col: 3 },
  { row: 4, col: 4 },
  { row: 3, col: 4 },
  { row: 2, col: 4 },
  { row: 1, col: 4 },
  { row: 0, col: 4 },
  { row: 0, col: 3 }
];

const innerPath = [
  { row: 1, col: 2 },
  { row: 1, col: 3 },
  { row: 2, col: 3 },
  { row: 3, col: 3 },
  { row: 3, col: 2 },
  { row: 3, col: 1 },
  { row: 2, col: 1 },
  { row: 1, col: 1 }
];

const rotatePath = (path, startIndex) => {
  return path.slice(startIndex).concat(path.slice(0, startIndex));
};

const getStartIndexForColor = (color) => {
  const start = HOME_POSITIONS[color];
  return outerPath.findIndex(p => p.row === start.row && p.col === start.col);
};

const getInnerStartIndexForColor = (color) => {
  const entry = INNER_ENTRY_POINTS[color];
  return innerPath.findIndex(p => p.row === entry.row && p.col === entry.col);
};

const getPlayerPath = (color) => {
  const startIndex = getStartIndexForColor(color);
  const innerStartIndex = getInnerStartIndexForColor(color);
  
  const rotatedOuter = rotatePath(outerPath, startIndex);
  const rotatedInner = rotatePath(innerPath, innerStartIndex);
  
  return rotatedOuter.concat(rotatedInner).concat([CENTER]);
};

const isSafeCell = (row, col) => {
  return SAFE_CELLS.some(cell => cell.row === row && cell.col === col);
};

module.exports = {
  GRID_SIZE,
  HOME_POSITIONS,
  INNER_ENTRY_POINTS,
  SAFE_CELLS,
  CENTER,
  outerPath,
  innerPath,
  getPlayerPath,
  isSafeCell
};
