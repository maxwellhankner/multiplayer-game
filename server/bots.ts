/** Set TEST_MODE=true to enable bot players for solo development */
export const TEST_MODE = process.env.TEST_MODE === 'true';

export const BOT_PLAYERS = [
  { id: 'bot-dick', name: 'DICK' },
  { id: 'bot-sally', name: 'SALLY' },
  { id: 'bot-tom', name: 'TOM' },
] as const;

export function isBot(id: string): boolean {
  return id.startsWith('bot-');
}

/** Jump when obstacle is this many px ahead of the horse (screen space) */
export const BOT_JUMP_DISTANCE = 168;
