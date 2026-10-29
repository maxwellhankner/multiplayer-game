import type { PlayerState } from '../../../shared/types.js';
import type { BotTickContext } from '../types.js';
import { angleToTarget, nearestEnemy, normalizeAngle } from './gameplay.js';

const LOOK_GAIN = 3.2;
const WALK_SPEED = 0.55;
const ALIGN_RAD = 0.28;
const SHOOT_ALIGN_RAD = 0.22;
const SHOOT_RANGE = 28;

function clampStick(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function tickShootersShootBots(bots: PlayerState[], ctx: BotTickContext, dt: number): void {
  if (ctx.room.phase !== 'playing' || ctx.room.activeGameId !== 'shooters-shoot') return;

  for (const bot of bots) {
    if (bot.eliminated) {
      ctx.setShootersShootInput?.(bot.id, { moveX: 0, moveY: 0, lookX: 0, lookY: 0 });
      continue;
    }

    const target = nearestEnemy(bot, ctx.room.players ?? []);
    if (!target) {
      ctx.setShootersShootInput?.(bot.id, { moveX: 0, moveY: 0, lookX: 0, lookY: 0 });
      continue;
    }

    const desiredYaw = angleToTarget(bot.px, bot.pz, target.px, target.pz);
    const delta = normalizeAngle(desiredYaw - bot.yaw);
    const lookX = clampStick(delta * LOOK_GAIN);
    const dist = Math.hypot(target.px - bot.px, target.pz - bot.pz);
    const aligned = Math.abs(delta) < ALIGN_RAD;
    const moveY = aligned && dist > 6 ? WALK_SPEED : aligned && dist < 4 ? -WALK_SPEED * 0.4 : 0;
    const strafe = !aligned ? clampStick(delta * 0.35) : (Math.sin(bot.px * 0.7 + bot.pz) > 0 ? 0.25 : -0.25);

    ctx.setShootersShootInput?.(bot.id, {
      moveX: strafe,
      moveY,
      lookX,
      lookY: 0,
      sprint: aligned && dist > 9,
    });

    if ((bot.bullets ?? 0) <= 0) {
      ctx.triggerShootersShootReload?.(bot.id);
      continue;
    }

    if (Math.abs(delta) < SHOOT_ALIGN_RAD && dist < SHOOT_RANGE && Math.random() < 0.04 * (dt / 16.67)) {
      if (dist < 2.5) {
        ctx.triggerShootersShootMelee?.(bot.id);
      } else {
        ctx.triggerShootersShootShoot?.(bot.id);
      }
    }
  }
}

export const shootersShootServer = {
  id: 'shooters-shoot',
  tickBots: (players: PlayerState[], ctx: BotTickContext, dt: number) => {
    tickShootersShootBots(players, ctx, dt);
  },
};
