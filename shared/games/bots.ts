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

/** True when the lobby has at least one bot and no human players. */
export function isBotsOnlyLobby(players: readonly { id: string }[]): boolean {
  let bots = 0;
  let humans = 0;
  for (const p of players) {
    if (isBot(p.id)) bots += 1;
    else humans += 1;
  }
  return bots >= 1 && humans === 0;
}

export function createBotId(): string {
  const suffix = Math.random().toString(36).slice(2, 9);
  return `bot-${suffix}`;
}

const DEFAULT_BOT_NAMES = ['Big Boy', 'Mr Cool', 'Weirdo'] as const;

const BOT_NAMES = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Big Boy',
  'Mr Cool',
  'Juliet',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Weirdo',
  'Papa',
];

export function pickBotName(takenNames: ReadonlySet<string>, botIndex = 0): string {
  if (botIndex < DEFAULT_BOT_NAMES.length) {
    const preferred = DEFAULT_BOT_NAMES[botIndex];
    if (!takenNames.has(preferred.toLowerCase())) {
      return preferred;
    }
  }

  const available = BOT_NAMES.filter((n) => !takenNames.has(n.toLowerCase()));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `Romeo ${Math.floor(Math.random() * 900) + 100}`;
}
