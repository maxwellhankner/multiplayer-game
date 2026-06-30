import type { LobbySettings } from './platform';
import type { SessionMode } from './session';

export type { LobbySettings } from './platform';
export type { SessionMode } from './session';

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
  /** Tap count or best hold duration (ms) for mini-games */
  score: number;
  holding: boolean;
  /** Timestamp when current hold started; 0 when not holding */
  holdStart: number;
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
}

export interface NetworkInfo {
  host: string;
  port: number;
  /** Base URL for guests, e.g. http://192.168.1.5:3001/room */
  roomUrl: string;
  allRoomUrls: string[];
}
