import type { BalloonInput, PlayerState } from '../../shared/types.js';

/** Context passed to per-game bot AI each tick */
export interface BotTickContext {
  room: {
    phase: string;
    activeGameId: string | null;
    scrollX: number;
    trackWidth: number;
    playerCount: number;
    obstacles: { lane: number; worldX: number }[];
    coins?: { id: string; x: number; z: number }[];
    balloons?: { arenaId: string; x: number; y: number; vx: number; vy: number }[];
  };
  triggerJump: (playerId: string) => void;
  setCoinInput?: (playerId: string, input: import('../../shared/types.js').CoinStickInput) => void;
  setBalloonInput?: (playerId: string, input: BalloonInput) => void;
  getHorseScreenX: (trackWidth: number) => number;
}

export interface GameServerModule {
  id: string;
  /** Run bot AI for this game during the playing phase */
  tickBots?: (players: PlayerState[], ctx: BotTickContext, dt: number) => void;
}
