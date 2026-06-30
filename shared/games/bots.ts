/** Shared bot helpers — used by server and clients */

export function isBot(playerId: string): boolean {
  return playerId.startsWith('bot-');
}

/** Bots always appear ready in lobby UI; humans use their actual ready flag. */
export function showsAsReady(player: { id: string; ready: boolean }): boolean {
  return isBot(player.id) || player.ready;
}

/** Bots count as landscape-ready automatically in Coin Rush orient phase. */
export function showsAsLandscapeReady(player: { id: string; landscapeReady: boolean }): boolean {
  return isBot(player.id) || player.landscapeReady;
}

/** Game start / lobby return only requires every human player to be ready. */
export function allHumansReady(players: Iterable<{ id: string; ready: boolean }>): boolean {
  const humans = [...players].filter((p) => !isBot(p.id));
  if (humans.length === 0) return false;
  return humans.every((p) => p.ready);
}

export function createBotId(): string {
  const suffix = Math.random().toString(36).slice(2, 9);
  return `bot-${suffix}`;
}

const BOT_NAMES = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliet',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Oscar',
  'Papa',
];

export function pickBotName(takenNames: ReadonlySet<string>): string {
  const available = BOT_NAMES.filter((n) => !takenNames.has(n.toLowerCase()));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `Romeo ${Math.floor(Math.random() * 900) + 100}`;
}
