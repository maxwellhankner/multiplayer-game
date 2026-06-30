import type { PlayerState } from '../../../shared/types.js';
import type { BotTickContext } from '../types.js';
import { angleToTarget, nearestCoin, normalizeAngle } from './gameplay.js';

export function clearCoinRushBots(): void {
  // Bot inputs are cleared with room.coinInputs on reset.
}

function tickCoinRushBots(bots: PlayerState[], ctx: BotTickContext): void {
  if (ctx.room.phase !== 'playing' || ctx.room.activeGameId !== 'coin-rush') return;
  const coins = ctx.room.coins ?? [];

  for (const bot of bots) {
    const target = nearestCoin(bot, coins);
    if (!target) {
      ctx.setCoinInput?.(bot.id, { moveX: 0, moveY: 0, lookX: 0, lookY: 0 });
      continue;
    }

    const desired = angleToTarget(bot.px, bot.pz, target.x, target.z);
    const delta = normalizeAngle(desired - bot.yaw);
    const lookX = Math.max(-1, Math.min(1, delta * 2.2));
    const moveY = Math.abs(delta) < 0.45 ? 1 : 0;

    ctx.setCoinInput?.(bot.id, { moveX: 0, moveY, lookX, lookY: 0 });
  }
}

export const coinRushServer = {
  id: 'coin-rush',
  tickBots: (players: PlayerState[], ctx: BotTickContext) => {
    tickCoinRushBots(players, ctx);
  },
};
