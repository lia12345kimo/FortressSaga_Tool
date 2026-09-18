const test = require('node:test');
const assert = require('node:assert/strict');
const { finalMaximum, amplifierTargets, allAmplifiersUseful } = require('./effect-engine.js');

const byId = {
  attack: { cat: 'attack', amp: false },
  left: { cat: 'amp', amp: true, shape: 'left', stage: 4 },
  right: { cat: 'amp', amp: true, shape: 'right', stage: 4 },
  up: { cat: 'amp', amp: true, shape: 'up', stage: 4 },
  down: { cat: 'amp', amp: true, shape: 'down', stage: 4 },
  row: { cat: 'amp', amp: true, shape: 'row', stage: 2 },
  col: { cat: 'amp', amp: true, shape: 'col', stage: 2 },
  cross: { cat: 'amp', amp: true, shape: 'cross', stage: 1 },
  all: { cat: 'amp', amp: true, shape: 'all', stage: 1 }
};

test('maximum value receives the connection multiplier exactly once', () => {
  assert.equal(finalMaximum(45, 2.2), 99);
});

test('left amplifier on the far-left edge has no target and is invalid', () => {
  const grid = Array(25).fill(null);
  grid[0] = { id: 'left', variant: 'yellow' };
  grid[1] = { id: 'attack' };
  assert.deepEqual(amplifierTargets(grid, 0, byId), []);
  assert.equal(allAmplifiersUseful(grid, byId), false);
});

test('left amplifier targets ordinary parts on its left using blue one-cell range', () => {
  const grid = Array(25).fill(null);
  grid[2] = { id: 'left', variant: 'blue' };
  grid[1] = { id: 'attack' };
  grid[0] = { id: 'attack' };
  assert.deepEqual(amplifierTargets(grid, 2, byId), [1]);
  assert.equal(allAmplifiersUseful(grid, byId), true);
});

test('yellow directional amplifier reaches two cells in the indicated direction', () => {
  const grid = Array(25).fill(null);
  grid[2] = { id: 'left', variant: 'yellow' };
  grid[1] = { id: 'attack' };
  grid[0] = { id: 'attack' };
  assert.deepEqual(amplifierTargets(grid, 2, byId), [0, 1]);
});

test('right, up and down amplifiers only target their indicated side', () => {
  const cases = [
    { id: 'right', at: 12, targets: [13, 14] },
    { id: 'up', at: 12, targets: [2, 7] },
    { id: 'down', at: 12, targets: [17, 22] }
  ];
  for (const item of cases) {
    const grid = Array(25).fill(null);
    grid[item.at] = { id: item.id, variant: 'yellow' };
    item.targets.forEach(index => grid[index] = { id: 'attack' });
    const opposite = item.id === 'right' ? [10, 11] : item.id === 'up' ? [17, 22] : [2, 7];
    opposite.forEach(index => grid[index] = { id: 'attack' });
    assert.deepEqual(amplifierTargets(grid, item.at, byId), item.targets);
  }
});

test('horizontal, vertical, cross and all-around only return occupied in-board cells', () => {
  const expectations = {
    row: [10, 11, 13, 14],
    col: [2, 7, 17, 22],
    cross: [2, 7, 10, 11, 13, 14, 17, 22],
    all: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
  };
  for (const [shape, expected] of Object.entries(expectations)) {
    const grid = Array(25).fill(null).map(() => ({ id: 'attack' }));
    grid[12] = { id: shape, variant: 'yellow' };
    assert.deepEqual(amplifierTargets(grid, 12, byId), expected);
  }
});

test('two copies of the same amplifier keep independent quality ranges', () => {
  const grid = Array(25).fill(null);
  grid[10] = { id: 'right', variant: 'yellow' };
  grid[20] = { id: 'right', variant: 'blue' };
  grid[11] = { id: 'attack' };
  grid[12] = { id: 'attack' };
  grid[21] = { id: 'attack' };
  grid[22] = { id: 'attack' };

  assert.deepEqual(amplifierTargets(grid, 10, byId), [11, 12]);
  assert.deepEqual(amplifierTargets(grid, 20, byId), [21]);
});

test('stage value interpolates between the 0-stage and full-stage numbers', () => {
  const { stageValue } = require('./effect-engine.js');
  assert.equal(stageValue(30, 45, 0, 7), 30);
  assert.equal(stageValue(30, 45, 7, 7), 45);
  assert.equal(stageValue(30, 45, 5, 7), 40.7);
  assert.equal(stageValue(60, 85, 3, 3), 85, '最大階數較低時滿階仍是滿值');
  assert.equal(stageValue(7.5, 10, 9, 7), 10, '超過上限要夾住');
  assert.equal(stageValue(7.5, 10, -2, 7), 7.5, '低於 0 階要夾住');
});
