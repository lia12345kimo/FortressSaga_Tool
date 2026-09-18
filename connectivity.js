(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Connectivity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const categories = ['attack', 'defense', 'support', 'weaken'];

  function categoryGroups(grid, byId) {
    const result = Object.fromEntries(categories.map(category => [category, 0]));
    const seen = new Set();
    for (let start = 0; start < 25; start++) {
      const part = byId[grid[start]?.id];
      if (!part || part.amp || seen.has(start)) continue;
      result[part.cat] = (result[part.cat] || 0) + 1;
      const queue = [start];
      seen.add(start);
      while (queue.length) {
        const current = queue.shift();
        const row = Math.floor(current / 5);
        const col = current % 5;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nextRow = row + dr;
          const nextCol = col + dc;
          if (nextRow < 0 || nextRow >= 5 || nextCol < 0 || nextCol >= 5) continue;
          const next = nextRow * 5 + nextCol;
          const nextPart = byId[grid[next]?.id];
          if (!seen.has(next) && nextPart && !nextPart.amp && nextPart.cat === part.cat) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
    }
    return result;
  }

  function allCategoriesConnected(grid, byId) {
    return Object.values(categoryGroups(grid, byId)).every(count => count <= 1);
  }

  return { categoryGroups, allCategoriesConnected };
});
