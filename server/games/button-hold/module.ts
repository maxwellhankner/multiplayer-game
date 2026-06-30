import type { PlayerState } from '../../../shared/types.js';
import type { BotTickContext } from '../types.js';
import { tickButtonHoldBots } from './gameplay.js';

export const buttonHoldServer = {
  id: 'button-hold',
  tickBots: (players: PlayerState[], _ctx: BotTickContext, dt: number) => {
    tickButtonHoldBots(players, dt, Date.now());
  },
};
