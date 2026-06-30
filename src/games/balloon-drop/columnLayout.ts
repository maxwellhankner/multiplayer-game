/** Side-by-side columns — one per arena (not per player). */
export function getColumnSplitPanes(arenaCount: number) {
  const n = Math.max(0, Math.min(arenaCount, 8));
  if (n === 0) return [];
  const colW = 1 / n;
  return Array.from({ length: n }, (_, i) => ({
    left: i * colW,
    top: 0,
    width: colW,
    height: 1,
  }));
}
