/** Shared bot helpers — used by server and clients */

export function isBot(playerId: string): boolean {
  return playerId.startsWith('bot-');
}

export function createBotId(): string {
  const suffix = Math.random().toString(36).slice(2, 9);
  return `bot-${suffix}`;
}

const BOT_NAMES = [
  'Bot Alpha',
  'Bot Bravo',
  'Bot Charlie',
  'Bot Delta',
  'Bot Echo',
  'Bot Foxtrot',
  'Bot Golf',
  'Bot Hotel',
];

export function pickBotName(takenNames: ReadonlySet<string>): string {
  const available = BOT_NAMES.filter((n) => !takenNames.has(n.toLowerCase()));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `Bot ${Math.floor(Math.random() * 900) + 100}`;
}
