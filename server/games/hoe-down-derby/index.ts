import type { PlayerState } from '../../../shared/types.js';
import { GAME_CONSTANTS, GAMEPLAY } from '../../../shared/constants.js';
import type { BotTickContext } from '../types.js';

const BOT_JUMP_DISTANCE = 168;
/** Hesitant bots wait until the obstacle is this close — often too late to clear. */
const BOT_LATE_JUMP_DISTANCE = 92;
const BOT_HESITATE_CHANCE = 0.2;
const BOT_EXTRA_DELAY_MS_MIN = 60;
const BOT_EXTRA_DELAY_MS_MAX = 180;

interface BotJumpPlan {
  obstacleKey: string;
  hesitate: boolean;
  delayMsLeft: number;
}

const botJumpPlans = new Map<string, BotJumpPlan>();

function obstacleKey(lane: number, worldX: number): string {
  return `${lane}:${Math.round(worldX)}`;
}

function tickHoeDownBots(players: PlayerState[], ctx: BotTickContext, dt: number): void {
  const horseX = ctx.getHorseScreenX(ctx.room.trackWidth);

  for (const player of players) {
    if (player.eliminated || player.isJumping) continue;

    const upcoming = ctx.room.obstacles
      .filter((o) => o.lane === player.lane)
      .map((o) => ({ o, screenX: o.worldX - ctx.room.scrollX }))
      .filter(({ screenX }) => screenX > horseX - 30 && screenX < horseX + 320)
      .sort((a, b) => a.screenX - b.screenX)[0];

    if (!upcoming) {
      botJumpPlans.delete(player.id);
      continue;
    }

    const distance = upcoming.screenX - horseX;
    if (distance <= 0) {
      botJumpPlans.delete(player.id);
      continue;
    }
    if (distance > BOT_JUMP_DISTANCE) continue;

    const key = obstacleKey(upcoming.o.lane, upcoming.o.worldX);
    let plan = botJumpPlans.get(player.id);
    if (!plan || plan.obstacleKey !== key) {
      const hesitate = Math.random() < BOT_HESITATE_CHANCE;
      plan = {
        obstacleKey: key,
        hesitate,
        delayMsLeft: hesitate
          ? BOT_EXTRA_DELAY_MS_MIN +
            Math.random() * (BOT_EXTRA_DELAY_MS_MAX - BOT_EXTRA_DELAY_MS_MIN)
          : 0,
      };
      botJumpPlans.set(player.id, plan);
    }

    if (plan.hesitate) {
      plan.delayMsLeft = Math.max(0, plan.delayMsLeft - dt);
      if (plan.delayMsLeft === 0 && distance <= BOT_LATE_JUMP_DISTANCE) {
        ctx.triggerJump(player.id);
        botJumpPlans.delete(player.id);
      }
    } else {
      ctx.triggerJump(player.id);
      botJumpPlans.delete(player.id);
    }
  }
}

export function clearHoeDownBotJumpPlans(): void {
  botJumpPlans.clear();
}

export const hoeDownDerbyServer = {
  id: 'hoe-down-derby',
  tickBots: (players: PlayerState[], ctx: BotTickContext, dt: number) => {
    tickHoeDownBots(players, ctx, dt);
  },
};

export { GAME_CONSTANTS, GAMEPLAY };
