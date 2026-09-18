(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./connectivity.js') : root.Connectivity,
    typeof module === 'object' && module.exports ? require('./effect-engine.js') : root.EffectEngine
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Optimizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Connectivity, EffectEngine) {
  'use strict';

  // 不合法的程度，而不是「是否合法」。退火需要梯度才爬得回合法區，
  // 一律給同一個極差分數會讓所有壞解看起來一樣好。
  function feasibilityCost(grid, byId, strictConnected) {
    const groups = Connectivity.categoryGroups(grid, byId);
    const split = Object.values(groups).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    const useless = grid.reduce((sum, cell, index) => {
      const part = byId[cell?.id];
      return sum + (part?.amp && EffectEngine.amplifierTargets(grid, index, byId).length === 0 ? 1 : 0);
    }, 0);
    return { split, useless, cost: (strictConnected ? split * 10 : 0) + useless };
  }

  // 先把配置換到合法，再交給主要的能力值退火。就地交換 grid。
  function repair(grid, freeIndexes, rounds, byId, strictConnected, random = Math.random) {
    let cost = feasibilityCost(grid, byId, strictConnected).cost;
    for (let n = 0; n < rounds && cost > 0; n++) {
      const a = freeIndexes[Math.floor(random() * freeIndexes.length)];
      const b = freeIndexes[Math.floor(random() * freeIndexes.length)];
      [grid[a], grid[b]] = [grid[b], grid[a]];
      const next = feasibilityCost(grid, byId, strictConnected).cost;
      const temperature = 1 - n / rounds;
      if (next <= cost || random() < Math.exp((cost - next) / (0.5 + 4 * temperature))) cost = next;
      else [grid[a], grid[b]] = [grid[b], grid[a]];
    }
    return cost;
  }

  return { feasibilityCost, repair };
});
