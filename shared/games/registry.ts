import type { SessionMode } from '../session.js';
import type { GameDefinition } from './types.js';
import { buttonHold } from './button-hold/index.js';
import { hoeDownDerby } from './hoe-down-derby/index.js';
import { EXTRA_PLACEHOLDER_GAMES } from './placeholders.js';
import { tapCounter } from './tap-counter/index.js';

/** All registered games — add new games by importing and appending here */
const ALL_GAMES: GameDefinition[] = [
  hoeDownDerby,
  tapCounter,
  buttonHold,
  ...EXTRA_PLACEHOLDER_GAMES,
];

export const GAMES: readonly GameDefinition[] = ALL_GAMES;

export function getGameById(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}

export function getGamesForSessionMode(mode: SessionMode): GameDefinition[] {
  return GAMES.filter((g) => g.supportedModes.includes(mode));
}

export function getPlayableGamesForSessionMode(mode: SessionMode): GameDefinition[] {
  return getGamesForSessionMode(mode).filter((g) => g.status === 'playable');
}

/** Game used for bot limits in lobby (specific selection, else first playable). */
export function getLobbyGameDefinition(
  sessionMode: SessionMode,
  specificGameId: string | null,
): GameDefinition | undefined {
  if (specificGameId) {
    const game = getGameById(specificGameId);
    if (game) return game;
  }
  return getPlayableGamesForSessionMode(sessionMode)[0] ?? getGamesForSessionMode(sessionMode)[0];
}
