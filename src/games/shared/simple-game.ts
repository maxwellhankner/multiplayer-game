import { SIMPLE_GAME_ROUND_MS } from '../../../shared/games/simple';

export function getSecondsLeft(gameTime: number): number {
  return Math.max(0, Math.ceil((SIMPLE_GAME_ROUND_MS - gameTime) / 1000));
}

export function formatHoldMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
