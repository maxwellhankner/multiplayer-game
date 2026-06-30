import type { PlayerState } from '../../../shared/types.js';
import { SIMPLE_GAME_ROUND_MS } from '../../../shared/games/simple.js';
import { finalizeScoreWinner, type ScoreGameRoom } from '../score-game.js';

const BOT_TAP_MIN_MS = 180;
const BOT_TAP_MAX_MS = 420;

const botTapTimers = new Map<string, number>();

export function tickTapCounter(room: ScoreGameRoom, dt: number): void {
  room.gameTime += dt;
  if (room.gameTime >= SIMPLE_GAME_ROUND_MS) {
    finalizeScoreWinner(room);
  }
}

export function triggerTap(room: ScoreGameRoom, playerId: string): boolean {
  const player = room.players.get(playerId);
  if (!player || room.phase !== 'playing') return false;
  player.score += 1;
  return true;
}

export function tickTapCounterBots(bots: PlayerState[], dt: number): void {
  for (const bot of bots) {
    let remaining = botTapTimers.get(bot.id) ?? randomTapDelay();
    remaining -= dt;
    if (remaining <= 0) {
      bot.score += 1;
      remaining = randomTapDelay();
    }
    botTapTimers.set(bot.id, remaining);
  }
}

export function clearTapCounterBots(): void {
  botTapTimers.clear();
}

function randomTapDelay(): number {
  return BOT_TAP_MIN_MS + Math.random() * (BOT_TAP_MAX_MS - BOT_TAP_MIN_MS);
}
