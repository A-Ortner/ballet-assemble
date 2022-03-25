const index = require('./index.ts');
const {LocationSet, parse, slice} = require("@andrewhead/python-program-analysis");

const activeCell = 'print(c)';
const ctsSplit = ["a = 10", "b = 32", "z = 1", "", "c = a - b", "", "d = a + b +z", "d = d +2", "print(d)", "print(c)"];
const result = ["a = 10", "b = 32", "c = a - b", "print(c)"];
let loc = new Loc();
loc.first_column = 0;
loc.first_line = 10;
loc.last_column = 8;
loc.last_line = 10;
const locSet = new LocationSet(loc);

let ctsJoined = ctsSplit.join('\n');
let tree = parse(ctsJoined);
let slicedLoc = slice(tree, loc);

describe('index', () => {
  test('getLocationFromCurrentCellThrowsErrorWhenActiveCellIsNull', () => {
    let e = new Error('Active cell is null or empty.')
    expect(index.getLocationFromCurrentCell(null, ctsSplit)).toThrowError(e)
  });

  test('getLocationFromCurrentCellThrowsErrorWhenActiveCellIsEmpty', () => {
    let e = new Error('Active cell is null or empty.')
    expect(index.getLocationFromCurrentCell("", ctsSplit)).toThrowError(e)
  });

  test('getLocationFromCurrentCellReturnsLocationSet', () => {
    expect(index.getLocationFromCurrentCell(activeCell, ctsSplit)).toBe(locSet);
  });

  test('getCodeFromSliceThrowsErrorWhenSlicedLocIsNull', () => {
    let e = new Error('Slice not found.')
    expect(index.getCodeFromSlice(null, ctsSplit)).toThrowError(e)
  });

  test('getCodeFromSliceThrowsErrorWhenCtsSplitIsNull', () => {
    let e = new Error('No code found.')
    expect(index.getCodeFromSlice(slicedLoc, null)).toThrowError(e)
  });

  test('getCodeFromSliceThrowsErrorWhenCtsSplitHasLengthZero', () => {
    let e = new Error('No code found.')
    expect(index.getCodeFromSlice(null, [])).toThrowError(e)
  });

  test('getCodeFromSliceReturnsArrayOfCodeLines', () => {
    expect(index.getCodeFromSlice(slicedLoc, ctsSplit)).toBe(result);
  });

});

