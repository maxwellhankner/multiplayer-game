import type { LobbySettings } from './platform';
import type { SessionMode } from './session';

export type { LobbySettings } from './platform';
export type { SessionMode } from './session';

export type GamePhase = 'lobby' | 'orient' | 'countdown' | 'playing' | 'winner';

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
  /**
   * One-shot look added on the next simulation tick, then cleared.
   * Mouse movement uses this so fast flicks are not dropped between ticks.
   * Stick look stays on lookX / lookY.
   */
  lookDX?: number;
  lookDY?: number;
  /** Shooters Shoot — held sprint */
  sprint?: boolean;
  /** Shooters Shoot — held crouch */
  crouch?: boolean;
};

export type DrunkDriverInput = {
  gas: boolean;
  steer: number;
};

/** @deprecated Discrete coin actions — use CoinStickInput */
export type CoinAction = 'forward' | 'left' | 'right';

export interface CoinState {
  id: string;
  x: number;
  z: number;
}

export interface ShotTracerState {
  id: string;
  shooterId: string;
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
  /** Distance traveled before impact (or max range on miss) */
  length: number;
  spawnedAt: number;
}

export type ShotImpactKind = 'wall' | 'player';

export interface ShotImpactState {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: ShotImpactKind;
  spawnedAt: number;
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
  /** Game score (coins, survival time ms, kills, etc.) */
  score: number;
  /** Times this player has been eliminated in the current round */
  deaths: number;
  /** Session wins — persists across games in the same room */
  wins: number;
  /** Coin Rush — phone held in landscape before countdown */
  landscapeReady: boolean;
  /** Coin Rush / Shots Fired — world position and facing (radians, 0 = +Z) */
  px: number;
  pz: number;
  py: number;
  yaw: number;
  pitch: number;
  /** Shots Fired / Shooters Shoot — rounds left in the gun */
  bullets: number;
  /** Shooters Shoot — rounds carried on the body */
  ammoReserve?: number;
  /** Shooters Shoot — crouch is held */
  crouching?: boolean;
  /** Shooters Shoot — sprint is active */
  sprinting?: boolean;
  /** Shooters Shoot — gameTime when the current reload finishes; 0 if idle */
  reloadUntil?: number;
  /** Shooters Shoot — gameTime when this player respawns; 0 if not waiting */
  respawnAt?: number;
  /** Shooters Shoot — primary then secondary */
  guns?: [string, string];
  /** Shooters Shoot — 0 primary, 1 secondary */
  gunIndex?: 0 | 1;
  /** Shooters Shoot — magazine rounds on the gun that is not equipped */
  stowedBullets?: number;
  /** Shooters Shoot — reserve rounds for the gun that is not equipped */
  stowedReserve?: number;
  /** Shots Fired — gameTime when this player last melee'd (for view animation) */
  lastMeleeAt?: number;
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
  shotTracers: ShotTracerState[];
  shotImpacts: ShotImpactState[];
  balloons: BalloonState[];
  scribblePhase: ScribblePhase | null;
  scribblePrompterId: string | null;
  scribblePrompt: string | null;
  scribbleDrawings: ScribbleDrawing[];
  scribbleDrawSecondsLeft: number;
  /** PC host screen connected — mobile controllers wait when false */
  hostOnline: boolean;
}

export interface NetworkInfo {
  host: string;
  port: number;
  /** Base URL for guests, e.g. http://192.168.1.5:3001/room */
  roomUrl: string;
  allRoomUrls: string[];
}
