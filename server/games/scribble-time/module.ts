import type { PlayerState } from '../../../shared/types.js';
import type { BotTickContext } from '../types.js';

export function clearScribbleTimeBots(): void {
  // no-op
}

export const scribbleTimeServer = {
  id: 'scribble-time',
  tickBots: (_bots: PlayerState[], _ctx: BotTickContext) => {
    // Bot prompt + draw handled in tickScribbleTime
  },
};
