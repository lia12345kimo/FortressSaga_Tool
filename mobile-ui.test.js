"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const MobileUI = require("./mobile-ui.js");

const catalog = {
  attack: { id: "attack", amp: false },
  support: { id: "support", amp: false },
  amplifier: { id: "amplifier", amp: true }
};

const cell = (id, locked = false) => id ? { id, locked } : null;

test("placing from the mobile picker fills the selected empty cell", () => {
  const grid = Array(25).fill(null);
  const result = MobileUI.placePart(grid, 6, "attack", catalog);

  assert.equal(result.ok, true);
  assert.equal(result.grid[6].id, "attack");
  assert.equal(grid[6], null, "placement must not mutate the previous grid");
});

test("mobile picker rejects a duplicate ordinary part but allows duplicate amplifiers", () => {
  const grid = Array(25).fill(null);
  grid[0] = cell("attack");
  grid[1] = cell("amplifier");

  assert.deepEqual(MobileUI.placePart(grid, 2, "attack", catalog), {
    ok: false,
    reason: "duplicate",
    grid
  });
  const amplifier = MobileUI.placePart(grid, 2, "amplifier", catalog);
  assert.equal(amplifier.ok, true);
  assert.equal(amplifier.grid[2].id, "amplifier");
});

test("long-press drop swaps placed parts and respects locked cells", () => {
  const grid = Array(25).fill(null);
  grid[0] = cell("attack");
  grid[1] = cell("support");

  const moved = MobileUI.movePart(grid, 0, 1);
  assert.equal(moved.ok, true);
  assert.equal(moved.grid[0].id, "support");
  assert.equal(moved.grid[1].id, "attack");

  grid[1].locked = true;
  assert.deepEqual(MobileUI.movePart(grid, 0, 1), {
    ok: false,
    reason: "locked",
    grid
  });
});

test("moving requires a placed source and a valid board destination", () => {
  const grid = Array(25).fill(null);
  grid[4] = cell("attack");

  assert.equal(MobileUI.movePart(grid, 3, 4).reason, "empty-source");
  assert.equal(MobileUI.movePart(grid, 4, 25).reason, "invalid-target");
});

test("tapping a cell opens the picker when empty and the settings sheet when filled", () => {
  const grid = Array(25).fill(null);
  grid[7] = cell("attack");

  assert.equal(MobileUI.cellTapAction(grid, 7), "editor");
  assert.equal(MobileUI.cellTapAction(grid, 8), "picker");
  assert.equal(MobileUI.cellTapAction(grid, 25), "none");
});
