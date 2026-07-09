import { GAMES } from '../../shared/games/registry.js';
import type { GameServerModule } from './types.js';
import { scribbleTimeServer } from './scribble-time/index.js';
import { shotsFiredServer } from './shots-fired/index.js';
import { balloonDropServer } from './balloon-drop/index.js';
import { coinRushServer } from './coin-rush/index.js';
import { drunkDriverServer } from './drunk-driver/index.js';
import { hoeDownDerbyServer } from './hoe-down-derby/index.js';

const placeholderModules: GameServerModule[] = GAMES.filter(
  (g) => g.status === 'placeholder',
).map((g) => ({
  id: g.id,
  tickBots: () => {},
}));

const MODULES: GameServerModule[] = [
  shotsFiredServer,
  drunkDriverServer,
  scribbleTimeServer,
  hoeDownDerbyServer,
  coinRushServer,
  balloonDropServer,
  ...placeholderModules,
];

const byId = new Map(MODULES.map((m) => [m.id, m]));

export function getGameServerModule(gameId: string | null): GameServerModule | undefined {
  if (!gameId) return undefined;
  return byId.get(gameId);
}
