(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EffectEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function finalMaximum(maximum, multiplier) {
    return Math.round(maximum * multiplier * 10) / 10;
  }

  // 截圖上的「+30.0~45.0%」＝0 階值到滿階值，階數在兩端之間等距內插。
  function stageValue(minimum, maximum, level, maxLevel) {
    const lo = Number(minimum), hi = Number(maximum);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return Number.isFinite(hi) ? hi : 0;
    if (!Number.isFinite(maxLevel) || maxLevel <= 0) return hi;
    const step = Math.max(0, Math.min(maxLevel, Number(level) || 0)) / maxLevel;
    return Math.round((lo + (hi - lo) * step) * 10) / 10;
  }

  function amplifierTargets(grid, index, byId) {
    const amplifier = byId[grid[index]?.id];
    if (!amplifier?.amp) return [];
    const [row, col] = [Math.floor(index / 5), index % 5];
    const distance = grid[index].variant === 'blue' ? 1 : 2;
    const result = [];
    for (let targetRow = 0; targetRow < 5; targetRow++) {
      for (let targetCol = 0; targetCol < 5; targetCol++) {
        const dr = targetRow - row;
        const dc = targetCol - col;
        const nonSelf = dr !== 0 || dc !== 0;
        const shape = amplifier.shape;
        const covered =
          shape === 'all' ? nonSelf && Math.max(Math.abs(dr), Math.abs(dc)) <= distance :
          shape === 'cross' ? nonSelf && (dr === 0 || dc === 0) && Math.max(Math.abs(dr), Math.abs(dc)) <= distance :
          shape === 'row' ? dr === 0 && dc !== 0 && Math.abs(dc) <= distance :
          shape === 'col' ? dc === 0 && dr !== 0 && Math.abs(dr) <= distance :
          shape === 'up' ? dc === 0 && dr < 0 && -dr <= distance :
          shape === 'down' ? dc === 0 && dr > 0 && dr <= distance :
          shape === 'left' ? dr === 0 && dc < 0 && -dc <= distance :
          shape === 'right' ? dr === 0 && dc > 0 && dc <= distance : false;
        if (!covered) continue;
        const targetIndex = targetRow * 5 + targetCol;
        const target = byId[grid[targetIndex]?.id];
        if (target && !target.amp) result.push(targetIndex);
      }
    }
    return result;
  }

  function allAmplifiersUseful(grid, byId) {
    return grid.every((cell, index) => {
      const part = byId[cell?.id];
      return !part?.amp || amplifierTargets(grid, index, byId).length > 0;
    });
  }

  return { finalMaximum, stageValue, amplifierTargets, allAmplifiersUseful };
});
