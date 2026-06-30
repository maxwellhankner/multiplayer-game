import type { PlayerState } from '../../../shared/types.js';

export interface ScoreGameRoom {
  gameTime: number;
  players: Map<string, PlayerState>;
  winnerId: string | null;
  phase: string;
}

export function resetScoreGamePlayers(players: Map<string, PlayerState>): void {
  for (const p of players.values()) {
    p.score = 0;
    p.holding = false;
    p.holdStart = 0;
    p.eliminated = false;
  }
}

export function finalizeScoreWinner(room: ScoreGameRoom): void {
  const players = [...room.players.values()];
  if (players.length === 0) {
    room.phase = 'winner';
    room.winnerId = null;
    return;
  }

  const maxScore = Math.max(...players.map((p) => p.score));
  const winners = players.filter((p) => p.score === maxScore);
  room.phase = 'winner';
  room.winnerId = winners.length === 1 ? winners[0].id : null;
}

export function secondsLeft(gameTime: number, roundMs: number): number {
  return Math.max(0, Math.ceil((roundMs - gameTime) / 1000));
}
