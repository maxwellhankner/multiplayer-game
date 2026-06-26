export type GamePhase = 'lobby' | 'countdown' | 'playing' | 'winner';

export interface PlayerState {
  id: string;
  name: string;
  ready: boolean;
  lives: number;
  lane: number;
  jumpPhase: number;
  isJumping: boolean;
  eliminated: boolean;
  invulnUntil: number;
  flipPhase: number;
  color: string;
}

export interface ObstacleState {
  id: string;
  worldX: number;
  width: number;
  height: number;
  lane: number;
}

export interface RoomState {
  id: string;
  phase: GamePhase;
  players: PlayerState[];
  obstacles: ObstacleState[];
  scrollX: number;
  countdown: number;
  winnerId: string | null;
  winnerName: string | null;
  gameTime: number;
  testMode?: boolean;
}

export interface NetworkInfo {
  host: string;
  port: number;
  joinUrl: string;
  allHosts: string[];
}
