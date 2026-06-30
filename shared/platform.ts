import { GAMES, getGameById, getGamesForSessionMode, getPlayableGamesForSessionMode } from './games/registry.js';
import type { GameDefinition } from './games/types.js';
import type { SessionMode } from './session.js';
import {
  SESSION_MODES,
  getSessionModeInfo,
  getSessionModeLabel,
  normalizeSessionMode,
} from './session.js';

export type { SessionMode, SessionModeInfo } from './session.js';
export type { GameDefinition } from './games/types.js';
export { SESSION_MODES, getSessionModeInfo, getSessionModeLabel, normalizeSessionMode };
export { GAMES, getGameById, getGamesForSessionMode };

export type GameSelectionMode = 'random' | 'random-from-pool' | 'specific';

export interface LobbySettings {
  gameSelectionMode: GameSelectionMode;
  specificGameId: string | null;
  gamePool: string[];
}

export const PLATFORM_NAME = 'Multiplayer Browser Games';

export const GAME_SELECTION_OPTIONS: {
  id: GameSelectionMode;
  title: string;
  description: string;
}[] = [
  {
    id: 'random-from-pool',
    title: 'Random',
    description: 'Randomly choose from selected games.',
  },
  {
    id: 'specific',
    title: 'Selected',
    description: 'Always play one chosen game.',
  },
];

export const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
  gameSelectionMode: 'random-from-pool',
  specificGameId: 'hoe-down-derby',
  gamePool: ['hoe-down-derby', 'tap-counter', 'button-hold'],
};

export function getLobbyGameList(
  sessionMode: SessionMode,
  settings: LobbySettings,
): GameDefinition[] {
  const playable = getPlayableGamesForSessionMode(sessionMode);
  const playableById = new Map(playable.map((g) => [g.id, g]));

  if (settings.gameSelectionMode === 'specific' && settings.specificGameId) {
    const game = playableById.get(settings.specificGameId);
    return game ? [game] : [];
  }

  const poolIds =
    settings.gameSelectionMode === 'random'
      ? playable.map((g) => g.id)
      : settings.gamePool.filter((id) => playableById.has(id));

  return poolIds
    .map((id) => playableById.get(id))
    .filter((g): g is GameDefinition => g !== undefined);
}

export function resolveGameId(
  settings: LobbySettings,
  sessionMode: SessionMode,
): string {
  const available = getPlayableGamesForSessionMode(sessionMode).map((g) => g.id);
  if (available.length === 0) {
    throw new Error(`No playable games for session mode: ${sessionMode}`);
  }

  if (settings.gameSelectionMode === 'specific' && settings.specificGameId) {
    if (available.includes(settings.specificGameId)) {
      return settings.specificGameId;
    }
  }

  if (settings.gameSelectionMode === 'random-from-pool') {
    const pool = settings.gamePool.filter((id) => available.includes(id));
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  return available[Math.floor(Math.random() * available.length)];
}
