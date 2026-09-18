(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MobileUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function placePart(grid, targetIndex, partId, catalog) {
    const part = catalog[partId];
    if (!part || targetIndex < 0 || targetIndex >= grid.length) {
      return { ok: false, reason: "invalid-target", grid };
    }
    if (grid[targetIndex]?.locked) return { ok: false, reason: "locked", grid };
    if (!part.amp && grid.some(item => item?.id === partId)) {
      return { ok: false, reason: "duplicate", grid };
    }
    const next = grid.slice();
    next[targetIndex] = {
      id: partId,
      level: 0,
      rarity: part.amp ? 0 : 7,
      variant: "blue",
      locked: false,
      base: null,
      step: null
    };
    return { ok: true, grid: next };
  }

  function movePart(grid, sourceIndex, targetIndex) {
    if (targetIndex < 0 || targetIndex >= grid.length) {
      return { ok: false, reason: "invalid-target", grid };
    }
    if (!grid[sourceIndex]) return { ok: false, reason: "empty-source", grid };
    if (grid[sourceIndex]?.locked || grid[targetIndex]?.locked) {
      return { ok: false, reason: "locked", grid };
    }
    const next = grid.slice();
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
    return { ok: true, grid: next };
  }

  function cellTapAction(grid, index) {
    if (index < 0 || index >= grid.length) return "none";
    return grid[index] ? "editor" : "picker";
  }

  function clampLevel(level, rarity) {
    const max = Number.isFinite(rarity) ? rarity : 0;
    const wanted = Math.round(Number(level));
    if (!Number.isFinite(wanted)) return 0;
    return Math.max(0, Math.min(max, wanted));
  }

  return { placePart, movePart, cellTapAction, clampLevel };
});
