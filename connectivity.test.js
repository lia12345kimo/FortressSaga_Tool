const test = require('node:test');
const assert = require('node:assert/strict');
const { categoryGroups, allCategoriesConnected } = require('./connectivity.js');

const byId = {
  a1: { cat: 'attack' }, a2: { cat: 'attack' }, a3: { cat: 'attack' },
  s1: { cat: 'support' }, amp: { cat: 'amp', amp: true }
};

test('separated same-category cells are reported as two groups', () => {
  const grid = Array(25).fill(null);
  grid[0] = { id: 'a1' };
  grid[1] = { id: 'a2' };
  grid[24] = { id: 'a3' };
  assert.equal(categoryGroups(grid, byId).attack, 2);
  assert.equal(allCategoriesConnected(grid, byId), false);
});

test('orthogonally connected cells form one group while diagonal does not', () => {
  const grid = Array(25).fill(null);
  grid[0] = { id: 'a1' };
  grid[5] = { id: 'a2' };
  assert.equal(categoryGroups(grid, byId).attack, 1);
  grid[6] = { id: 'a3' };
  grid[5] = null;
  assert.equal(categoryGroups(grid, byId).attack, 2);
});

test('amplifiers and categories with one part do not violate strict connection', () => {
  const grid = Array(25).fill(null);
  grid[0] = { id: 'a1' };
  grid[12] = { id: 's1' };
  grid[24] = { id: 'amp' };
  assert.equal(allCategoriesConnected(grid, byId), true);
});
