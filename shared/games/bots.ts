/** Shared bot helpers — used by server and clients */

export function isBot(playerId: string): boolean {
  return playerId.startsWith('bot-');
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
