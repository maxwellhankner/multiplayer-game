import type { PlayerState } from '../../../shared/types.js';
import type { BotTickContext } from '../types.js';
import { angleToTarget, nearestCoin, normalizeAngle } from './gameplay.js';

const LOOK_GAIN = 3;
const WALK_SPEED = 0.6;
const ALIGN_RAD = 0.38;

function clampStick(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

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

    const desiredYaw = angleToTarget(bot.px, bot.pz, target.x, target.z);
    const delta = normalizeAngle(desiredYaw - bot.yaw);
    const lookX = clampStick(delta * LOOK_GAIN);
    const moveY = Math.abs(delta) < ALIGN_RAD ? WALK_SPEED : 0;

    ctx.setCoinInput?.(bot.id, { moveX: 0, moveY, lookX, lookY: 0 });
  }
}

export const coinRushServer = {
  id: 'coin-rush',
  tickBots: (players: PlayerState[], ctx: BotTickContext) => {
    tickCoinRushBots(players, ctx);
  },
};
