import { GAMES } from '../../shared/games/registry.js';
import type { GameServerModule } from './types.js';
import { hoeDownDerbyServer } from './hoe-down-derby/index.js';
import { tapCounterServer } from './tap-counter/module.js';
import { buttonHoldServer } from './button-hold/module.js';

const placeholderModules: GameServerModule[] = GAMES.filter(
  (g) => g.status === 'placeholder',
).map((g) => ({
  id: g.id,
  tickBots: () => {},
}));

const MODULES: GameServerModule[] = [
  hoeDownDerbyServer,
  tapCounterServer,
  buttonHoldServer,
  ...placeholderModules,
];

const byId = new Map(MODULES.map((m) => [m.id, m]));

export function getGameServerModule(gameId: string | null): GameServerModule | undefined {
  if (!gameId) return undefined;
  return byId.get(gameId);
}
