'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { feasibilityCost, repair, objective, summarise } = require('./optimizer.js');

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

const calc = (rows, amps = []) => [
  ...rows.map(r => ({ amp: false, p: { cat: r.cat || 'attack', stage: 0 }, g: { level: r.own ?? 0 }, level: r.level ?? 0, group: { length: r.group ?? 1 }, final: r.final ?? 0 })),
  ...amps.map(a => ({ amp: true, p: { stage: a.stage }, targets: new Array(a.targets).fill(0) }))
];

test('amp strategy ranks stage gain above connection length, link strategy the reverse', () => {
  const ampHeavy = calc([{ level: 7, own: 0, group: 2, final: 40 }, { level: 7, own: 0, group: 2, final: 40 }]);
  const linkHeavy = calc([{ level: 1, own: 0, group: 7, final: 60 }, { level: 1, own: 0, group: 7, final: 60 }]);

  assert.ok(objective(ampHeavy, 'amp') > objective(linkHeavy, 'amp'), 'amp 策略要選階數多的');
  assert.ok(objective(linkHeavy, 'link') > objective(ampHeavy, 'link'), 'link 策略要選連接長的');
});

test('stage gain counts only what the amplifiers actually added', () => {
  const alreadyMaxed = calc([{ level: 7, own: 7, group: 3, final: 45 }]);
  assert.equal(summarise(alreadyMaxed).stageGain, 0, '自身就已經滿階時，增幅器沒有貢獻');
  assert.equal(summarise(calc([{ level: 7, own: 3, group: 3, final: 45 }])).stageGain, 4);
});

test('value strategy scores the build weighting only, not raw amplifier coverage', () => {
  const weights = { attack: 1, defense: 0.12, support: 0.12, weaken: 0.12 };
  const withAmp = calc([{ cat: 'attack', final: 100, group: 1 }], [{ targets: 3, stage: 4 }]);
  const without = calc([{ cat: 'attack', final: 100, group: 1 }]);
  assert.equal(objective(without, 'value', weights), 100);
  assert.equal(objective(withAmp, 'value', weights), 100, '照到幾顆不算分，只算實際打出來的數值');
  const offBuild = calc([{ cat: 'support', final: 100, group: 1 }]);
  assert.equal(objective(offBuild, 'value', weights), 12, '非本命流派只給 0.12 權重');
});

test('lexicographic strategies fall back to ability when the primary ties', () => {
  const weights = { attack: 1 };
  const lowValue = calc([{ cat: 'attack', level: 4, own: 0, group: 5, final: 50 }]);
  const highValue = calc([{ cat: 'attack', level: 4, own: 0, group: 5, final: 90 }]);
  assert.ok(objective(highValue, 'amp', weights) > objective(lowValue, 'amp', weights));
  assert.ok(objective(highValue, 'link', weights) > objective(lowValue, 'link', weights));

  // 但主要目標永遠壓過能力值
  const moreStage = calc([{ cat: 'attack', level: 5, own: 0, group: 5, final: 50 }]);
  assert.ok(objective(moreStage, 'amp', weights) > objective(highValue, 'amp', weights));
});
