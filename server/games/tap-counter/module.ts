import type { PlayerState } from '../../../shared/types.js';
import type { BotTickContext } from '../types.js';
import { tickTapCounterBots } from './gameplay.js';

export const tapCounterServer = {
  id: 'tap-counter',
  tickBots: (players: PlayerState[], _ctx: BotTickContext, dt: number) => {
    tickTapCounterBots(players, dt);
  },
};
