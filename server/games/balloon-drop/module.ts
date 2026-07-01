import type { PlayerState } from '../../../shared/types.js';
import { getBalloonArenaId, getPlayerXBounds } from '../../../shared/games/balloon-drop/teams.js';
import type { BotTickContext } from '../types.js';

const STUTTER_CHANCE_PER_TICK = 0.025;
const STUTTER_MS_MIN = 240;
const STUTTER_MS_MAX = 520;
const STUTTER_COOLDOWN_MS = 550;

interface BotMoveState {
  pauseMsLeft: number;
  cooldownMsLeft: number;
}

const botMoveState = new Map<string, BotMoveState>();

export function clearBalloonDropBots(): void {
  botMoveState.clear();
}

function tickBalloonDropBots(bots: PlayerState[], ctx: BotTickContext, dt: number): void {
  if (ctx.room.phase !== 'playing' || ctx.room.activeGameId !== 'balloon-drop') return;
  const balloons = ctx.room.balloons ?? [];
  const playerCount = ctx.room.playerCount;

  for (const bot of bots) {
    if (bot.eliminated) {
      ctx.setBalloonInput?.(bot.id, { moveX: 0 });
      botMoveState.delete(bot.id);
      continue;
    }

    const arenaId = getBalloonArenaId(bot.lane, bot.id, playerCount);
    const balloon = balloons.find((b) => b.arenaId === arenaId);
    if (!balloon) {
      ctx.setBalloonInput?.(bot.id, { moveX: 0 });
      continue;
    }

    let state = botMoveState.get(bot.id);
    if (!state) {
      state = { pauseMsLeft: 0, cooldownMsLeft: 0 };
      botMoveState.set(bot.id, state);
    }

    state.pauseMsLeft = Math.max(0, state.pauseMsLeft - dt);
    state.cooldownMsLeft = Math.max(0, state.cooldownMsLeft - dt);

    const { min, max } = getPlayerXBounds(bot.lane, playerCount);
    const targetX = Math.max(min, Math.min(max, balloon.x));
    const dx = targetX - bot.px;

    if (state.pauseMsLeft > 0) {
      ctx.setBalloonInput?.(bot.id, { moveX: 0 });
      continue;
    }

    if (
      Math.abs(dx) > 3 &&
      state.cooldownMsLeft <= 0 &&
      Math.random() < STUTTER_CHANCE_PER_TICK
    ) {
      state.pauseMsLeft =
        STUTTER_MS_MIN + Math.random() * (STUTTER_MS_MAX - STUTTER_MS_MIN);
      state.cooldownMsLeft = STUTTER_COOLDOWN_MS + state.pauseMsLeft;
      ctx.setBalloonInput?.(bot.id, { moveX: 0 });
      continue;
    }

    const moveX = Math.abs(dx) < 1.5 ? 0 : dx > 0 ? 1 : -1;
    ctx.setBalloonInput?.(bot.id, { moveX });
  }
}

export const balloonDropServer = {
  id: 'balloon-drop',
  tickBots: (players: PlayerState[], ctx: BotTickContext, dt: number) => {
    tickBalloonDropBots(players, ctx, dt);
  },
};
