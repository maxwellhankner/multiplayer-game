import type { PlayerState } from '../../shared/types.js';

/** Context passed to per-game bot AI each tick */
export interface BotTickContext {
  room: {
    phase: string;
    activeGameId: string | null;
    scrollX: number;
    trackWidth: number;
    obstacles: { lane: number; worldX: number }[];
  };
  triggerJump: (playerId: string) => void;
  getHorseScreenX: (trackWidth: number) => number;
}

export interface GameServerModule {
  id: string;
  /** Run bot AI for this game during the playing phase */
  tickBots?: (players: PlayerState[], ctx: BotTickContext, dt: number) => void;
}
