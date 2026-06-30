/** Normalized pane rect (0–1), origin top-left — matches CSS overlay positioning. */
export interface SplitPane {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Split-screen layout for 1–8 players on the host display. */
export function getSplitPanes(playerCount: number): SplitPane[] {
  const n = Math.max(0, Math.min(playerCount, 8));
  if (n === 0) return [];
  if (n === 1) return [{ left: 0, top: 0, width: 1, height: 1 }];
  if (n === 2) {
    return [
      { left: 0, top: 0, width: 1, height: 0.5 },
      { left: 0, top: 0.5, width: 1, height: 0.5 },
    ];
  }

  const cols = n <= 4 ? 2 : n <= 6 ? 3 : 4;
  const rows = 2;
  const cellW = 1 / cols;
  const cellH = 1 / rows;
  const panes: SplitPane[] = [];

  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    panes.push({
      left: col * cellW,
      top: row * cellH,
      width: cellW,
      height: cellH,
    });
  }

  return panes;
}
