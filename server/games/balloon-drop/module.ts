import type { PlayerState } from '../../../shared/types.js';
import { getBalloonArenaId, getPlayerXBounds } from '../../../shared/games/balloon-drop/teams.js';
import type { BotTickContext } from '../types.js';

export function clearBalloonDropBots(): void {
  // Inputs cleared with room.balloonInputs on reset.
}

function tickBalloonDropBots(bots: PlayerState[], ctx: BotTickContext): void {
  if (ctx.room.phase !== 'playing' || ctx.room.activeGameId !== 'balloon-drop') return;
  const balloons = ctx.room.balloons ?? [];
  const playerCount = ctx.room.playerCount;

  for (const bot of bots) {
    if (bot.eliminated) {
      ctx.setBalloonInput?.(bot.id, { moveX: 0 });
      continue;
    }

    const arenaId = getBalloonArenaId(bot.lane, bot.id, playerCount);
    const balloon = balloons.find((b) => b.arenaId === arenaId);
    if (!balloon) {
      ctx.setBalloonInput?.(bot.id, { moveX: 0 });
      continue;
    }

    const { min, max } = getPlayerXBounds(bot.lane, playerCount);
    const targetX = Math.max(min, Math.min(max, balloon.x));
    const dx = targetX - bot.px;
    const moveX = Math.abs(dx) < 1.5 ? 0 : dx > 0 ? 1 : -1;
    ctx.setBalloonInput?.(bot.id, { moveX });
  }
}

export const balloonDropServer = {
  id: 'balloon-drop',
  tickBots: (players: PlayerState[], ctx: BotTickContext) => {
    tickBalloonDropBots(players, ctx);
  },
};
