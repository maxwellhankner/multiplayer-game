import type { SessionMode } from '../session.js';

export type GameStatus = 'playable' | 'placeholder';

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  /** Lobby types where this game appears in the host game picker */
  supportedModes: SessionMode[];
  minPlayers: number;
  maxPlayers: number;
  /** Max bot slots the host can fill for solo / testing */
  maxBots: number;
  status: GameStatus;
}

export function isGamePlayable(game: GameDefinition): boolean {
  return game.status === 'playable';
}
