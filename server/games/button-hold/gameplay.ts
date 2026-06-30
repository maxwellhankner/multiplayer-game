import type { PlayerState } from '../../../shared/types.js';
import { SIMPLE_GAME_ROUND_MS } from '../../../shared/games/simple.js';
import { finalizeScoreWinner, type ScoreGameRoom } from '../score-game.js';

const BOT_HOLD_MIN_MS = 900;
const BOT_HOLD_MAX_MS = 2800;
const BOT_REST_MIN_MS = 400;
const BOT_REST_MAX_MS = 900;

type BotHoldState = 'holding' | 'resting';
const botHoldState = new Map<string, { mode: BotHoldState; timer: number }>();

export function tickButtonHold(room: ScoreGameRoom, dt: number, now: number): void {
  room.gameTime += dt;

  for (const player of room.players.values()) {
    if (player.holding && player.holdStart > 0) {
      const current = now - player.holdStart;
      if (current > player.score) {
        player.score = current;
      }
    }
  }

  if (room.gameTime >= SIMPLE_GAME_ROUND_MS) {
    finalizeActiveHolds(room, now);
    finalizeScoreWinner(room);
  }
}

export function triggerHoldStart(room: ScoreGameRoom, playerId: string, now: number): boolean {
  const player = room.players.get(playerId);
  if (!player || room.phase !== 'playing' || player.holding) return false;
  player.holding = true;
  player.holdStart = now;
  return true;
}

export function triggerHoldEnd(room: ScoreGameRoom, playerId: string, now: number): boolean {
  const player = room.players.get(playerId);
  if (!player || room.phase !== 'playing' || !player.holding) return false;

  const duration = now - player.holdStart;
  if (duration > player.score) {
    player.score = duration;
  }
  player.holding = false;
  player.holdStart = 0;
  return true;
}

export function tickButtonHoldBots(bots: PlayerState[], dt: number, now: number): void {
  for (const bot of bots) {
    let state = botHoldState.get(bot.id);
    if (!state) {
      state = { mode: 'resting', timer: randomRestDelay() };
      botHoldState.set(bot.id, state);
    }

    state.timer -= dt;

    if (state.mode === 'resting') {
      if (state.timer <= 0) {
        bot.holding = true;
        bot.holdStart = now;
        state.mode = 'holding';
        state.timer = randomHoldDelay();
      }
      continue;
    }

    if (state.timer <= 0) {
      if (bot.holding) {
        const duration = now - bot.holdStart;
        if (duration > bot.score) {
          bot.score = duration;
        }
        bot.holding = false;
        bot.holdStart = 0;
      }
      state.mode = 'resting';
      state.timer = randomRestDelay();
    } else if (bot.holding && bot.holdStart > 0) {
      const current = now - bot.holdStart;
      if (current > bot.score) {
        bot.score = current;
      }
    }
  }
}

export function clearButtonHoldBots(): void {
  botHoldState.clear();
}

function finalizeActiveHolds(room: ScoreGameRoom, now: number): void {
  for (const player of room.players.values()) {
    if (!player.holding || player.holdStart <= 0) continue;
    const duration = now - player.holdStart;
    if (duration > player.score) {
      player.score = duration;
    }
    player.holding = false;
    player.holdStart = 0;
  }
}

function randomHoldDelay(): number {
  return BOT_HOLD_MIN_MS + Math.random() * (BOT_HOLD_MAX_MS - BOT_HOLD_MIN_MS);
}

function randomRestDelay(): number {
  return BOT_REST_MIN_MS + Math.random() * (BOT_REST_MAX_MS - BOT_REST_MIN_MS);
}
