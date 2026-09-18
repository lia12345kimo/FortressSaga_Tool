'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { feasibilityCost, repair } = require('./optimizer.js');

// 使用者回報的配置：7 顆增幅零件，全方位共振器鎖在正中央，18 顆普通零件分成攻擊 7、輔助 6、弱化 5。
const CATEGORIES = {
  taken: 'weaken', slow: 'weaken', weakcrit: 'weaken', defdown: 'weaken', atkdown: 'weaken',
  cool: 'support', cc: 'support', recover: 'support', buff: 'support', move: 'support', exp: 'support',
  dmg: 'attack', as: 'attack', boss: 'attack', atk: 'attack', skill: 'attack', crit: 'attack', cdmg: 'attack'
};
const SHAPES = { 'amp-down': ['down', 4], 'amp-col': ['col', 2], 'amp-all': ['all', 1], 'amp-right': ['right', 4], 'amp-left': ['left', 4], 'amp-up': ['up', 4], 'amp-row': ['row', 2] };
const byId = {};
for (const [id, cat] of Object.entries(CATEGORIES)) byId[id] = { cat, amp: false };
for (const [id, [shape, stage]] of Object.entries(SHAPES)) byId[id] = { cat: 'amp', amp: true, shape, stage };

const REPORTED = ['taken', 'slow', 'weakcrit', 'cool', 'cc', 'defdown', 'amp-down', 'recover', 'amp-col', 'buff', 'atkdown', 'as', 'amp-all', 'dmg', 'move', 'amp-right', 'boss', 'atk', 'skill', 'amp-left', 'exp', 'amp-up', 'amp-row', 'crit', 'cdmg'];
const makeGrid = () => REPORTED.map(id => ({ id, variant: 'yellow', locked: id === 'amp-all' }));
const seeded = seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

test('feasibility is graded, not a cliff', () => {
  const grid = makeGrid();
  const reported = feasibilityCost(grid, byId, true);
  assert.equal(reported.split, 2, '回報的配置把輔助拆成 3 組');
  assert.ok(reported.cost > 0);

  const worse = makeGrid();
  [worse[0], worse[7]] = [worse[7], worse[0]];
  assert.notEqual(feasibilityCost(worse, byId, true).cost, reported.cost, '不同程度的違規必須給出不同分數');
});

test('repair reaches a fully legal layout for the reported 7-amplifier build', () => {
  const grid = makeGrid();
  const free = grid.map((cell, index) => cell.locked ? null : index).filter(index => index !== null);
  const cost = repair(grid, free, 80000, byId, true, seeded(7));

  assert.equal(cost, 0, '應該要找得到完整連接且增幅方向有效的配置');
  const after = feasibilityCost(grid, byId, true);
  assert.equal(after.split, 0);
  assert.equal(after.useless, 0);
  assert.equal(grid[12].id, 'amp-all', '鎖定的格子不可以被移動');
  assert.deepEqual([...grid].map(c => c.id).sort(), [...REPORTED].sort(), '零件只能重排，不能增減');
});

test('ignoring the connection rule only leaves the useless-amplifier cost', () => {
  const grid = makeGrid();
  const strict = feasibilityCost(grid, byId, true);
  const loose = feasibilityCost(grid, byId, false);
  assert.equal(loose.cost, strict.useless);
});
