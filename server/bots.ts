/** Set TEST_MODE=false to disable bot players */
export const TEST_MODE = process.env.TEST_MODE !== 'false';

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
