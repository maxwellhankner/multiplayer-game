import type { PlayerState } from '../../../shared/types.js';
import { GAME_CONSTANTS, GAMEPLAY } from '../../../shared/constants.js';
import type { BotTickContext } from '../types.js';

const BOT_JUMP_DISTANCE = 168;

function tickHoeDownBots(players: PlayerState[], ctx: BotTickContext): void {
  const horseX = ctx.getHorseScreenX(ctx.room.trackWidth);

  for (const player of players) {
    if (player.eliminated || player.isJumping) continue;

    const upcoming = ctx.room.obstacles
      .filter((o) => o.lane === player.lane)
      .map((o) => ({ o, screenX: o.worldX - ctx.room.scrollX }))
      .filter(({ screenX }) => screenX > horseX - 30 && screenX < horseX + 320)
      .sort((a, b) => a.screenX - b.screenX)[0];

    if (!upcoming) continue;

    const distance = upcoming.screenX - horseX;
    if (distance > 0 && distance <= BOT_JUMP_DISTANCE) {
      ctx.triggerJump(player.id);
    }
  }
}

export const hoeDownDerbyServer = {
  id: 'hoe-down-derby',
  tickBots: (players: PlayerState[], ctx: BotTickContext) => {
    tickHoeDownBots(players, ctx);
  },
};

export { GAME_CONSTANTS, GAMEPLAY };
