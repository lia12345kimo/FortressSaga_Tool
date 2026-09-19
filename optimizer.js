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

  // 三種優化重點。amp/link 是字典序：先把主要目標拉滿，再用次要目標分高下。
  const STRATEGIES = ['value', 'amp', 'link'];

  function parts(calculated) {
    const normal = calculated.filter(x => x && !x.amp);
    const amps = calculated.filter(x => x && x.amp);
    return {
      ability: normal.reduce((sum, x) => sum + x.final, 0),
      stageGain: normal.reduce((sum, x) => sum + x.level, 0),
      linkSum: normal.reduce((sum, x) => sum + x.group.length, 0),
      coverage: amps.reduce((sum, x) => sum + x.targets.length * x.p.stage, 0)
    };
  }

  // amp/link 是字典序：主要目標的權重必須大於次要目標的最大值，才不會被換掉。
  // 能力值永遠是最後的比較基準，所以同樣階數／同樣連接的排法裡會挑數值最高的。
  function objective(calculated, strategy, weights) {
    const totals = parts(calculated);
    const weighted = calculated.reduce((sum, x) => sum + (x && !x.amp ? x.final * (weights?.[x.p.cat] ?? 0) : 0), 0);
    if (strategy === 'amp') return totals.stageGain * 200000 + totals.linkSum * 1000 + weighted;
    if (strategy === 'link') return totals.linkSum * 200000 + totals.stageGain * 1000 + weighted;
    // 原本這裡還加了 coverage * 2，但那是用「增幅器照到幾顆」計分，會獎勵照在已經滿階
    // 零件上的增幅器。實測 6 次平均：均衡 645.3 → 660.8，攻擊 439.3 → 441.5。
    return weighted;
  }

  return { feasibilityCost, repair, objective, summarise: parts, STRATEGIES };
});
