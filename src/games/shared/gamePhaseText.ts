/** e.g. "Alice wins!", "Alice and Bob win!", "Alice, Bob, and Charlie win!" */
export function formatWinnerTitle(names: readonly string[]): string {
  if (names.length === 0) return 'Round over';
  if (names.length === 1) return `${names[0]} wins!`;
  if (names.length === 2) return `${names[0]} and ${names[1]} win!`;
  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(', ');
  return `${rest}, and ${last} win!`;
}

export function formatWinCount(wins: number): string {
  return `${wins} win${wins === 1 ? '' : 's'}`;
}
