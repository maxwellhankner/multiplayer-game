import type { PlayerState } from '../../../shared/types.js';
import type { BotTickContext } from '../types.js';
import { setDrunkDriverInput } from './gameplay.js';

export function clearDrunkDriverBots(): void {
  // Inputs cleared with room.drunkInputs on reset.
}

function tickDrunkDriverBots(bots: PlayerState[], ctx: BotTickContext): void {
  if (ctx.room.phase !== 'playing' || ctx.room.activeGameId !== 'drunk-driver') return;

  for (const bot of bots) {
    if (bot.eliminated) {
      ctx.setDrunkInput?.(bot.id, { gas: false, steer: 0 });
      continue;
    }

    let steer = 0;
    if (bot.px > 0.8) steer += 0.75;
    else if (bot.px < -0.8) steer -= 0.75;
    if (bot.yaw > 0.3) steer -= 0.45;
    else if (bot.yaw < -0.3) steer += 0.45;
    steer = Math.max(-1, Math.min(1, steer));

    ctx.setDrunkInput?.(bot.id, { gas: true, steer });
  }
}

export const drunkDriverServer = {
  id: 'drunk-driver',
  tickBots: (players: PlayerState[], ctx: BotTickContext) => {
    tickDrunkDriverBots(players, ctx);
  },
};
