import type { LobbySettings } from './platform';
import type { SessionMode } from './session';

export type { LobbySettings } from './platform';
export type { SessionMode } from './session';

export type GamePhase = 'lobby' | 'countdown' | 'playing' | 'winner';

export type BalloonInput = {
  moveX: number;
};

export interface BalloonState {
  arenaId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type CoinStickInput = {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
};

/** @deprecated Discrete coin actions — use CoinStickInput */
export type CoinAction = 'forward' | 'left' | 'right';

export interface CoinState {
  id: string;
  x: number;
  z: number;
}

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
  /** Game score (coins, survival time ms, etc.) */
  score: number;
  /** Coin Rush — world position and facing (radians, 0 = +Z) */
  px: number;
  pz: number;
  yaw: number;
  pitch: number;
}

export interface ObstacleState {
  id: string;
  worldX: number;
  width: number;
  height: number;
  lane: number;
}

export type ScribblePhase = 'prompt' | 'draw' | 'pick';

export interface ScribblePoint {
  x: number;
  y: number;
}

export interface ScribbleStroke {
  points: ScribblePoint[];
}

export interface ScribbleDrawing {
  playerId: string;
  strokes: ScribbleStroke[];
}

export interface RoomState {
  id: string;
  phase: GamePhase;
  sessionMode: SessionMode;
  lobbySettings: LobbySettings;
  activeGameId: string | null;
  players: PlayerState[];
  obstacles: ObstacleState[];
  scrollX: number;
  countdown: number;
  winnerId: string | null;
  winnerName: string | null;
  gameTime: number;
  coins: CoinState[];
  balloons: BalloonState[];
  scribblePhase: ScribblePhase | null;
  scribblePrompterId: string | null;
  scribblePrompt: string | null;
  scribbleDrawings: ScribbleDrawing[];
  scribbleDrawSecondsLeft: number;
}

export interface NetworkInfo {
  host: string;
  port: number;
  /** Base URL for guests, e.g. http://192.168.1.5:3001/room */
  roomUrl: string;
  allRoomUrls: string[];
}
