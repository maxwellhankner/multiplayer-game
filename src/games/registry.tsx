import type { ComponentType } from 'react';
import { GAMES } from '../../shared/games/registry';
import type { GameClientModule, GameControllerProps, GameHostProps } from './types';
import PlaceholderView from './placeholder/PlaceholderView';
import { balloonDropClient } from './balloon-drop/client';
import { drunkDriverClient } from './drunk-driver/client';
import { coinRushClient } from './coin-rush/client';
import { hoeDownDerbyClient } from './hoe-down-derby/client';
import { scribbleTimeClient } from './scribble-time/client';

function placeholderHost(gameId: string): ComponentType<GameHostProps> {
  return function Host() {
    return <PlaceholderView gameId={gameId} role="host" />;
  };
}

function placeholderController(gameId: string): ComponentType<GameControllerProps> {
  return function Controller() {
    return <PlaceholderView gameId={gameId} role="controller" />;
  };
}

function placeholderClient(id: string): GameClientModule {
  return {
    id,
    themeClass: '',
    HostView: placeholderHost(id),
    ControllerView: placeholderController(id),
  };
}

const placeholderModules = GAMES.filter((g) => g.status === 'placeholder').map((g) =>
  placeholderClient(g.id),
);

const MODULES: GameClientModule[] = [
  drunkDriverClient,
  scribbleTimeClient,
  hoeDownDerbyClient,
  coinRushClient,
  balloonDropClient,
  ...placeholderModules,
];

const byId = new Map(MODULES.map((m) => [m.id, m]));

export function getGameClientModule(gameId: string | null): GameClientModule | undefined {
  if (!gameId) return undefined;
  return byId.get(gameId);
}

export function getGameThemeClass(gameId: string | null): string {
  return getGameClientModule(gameId)?.themeClass ?? '';
}
