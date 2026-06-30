import type { GameDefinition } from '../types.js';

export const tapCounter: GameDefinition = {
  id: 'tap-counter',
  name: 'Tap Counter',
  description: 'Tap as many times as you can before time runs out.',
  supportedModes: ['pc-host', 'mobile-only'],
  minPlayers: 1,
  maxPlayers: 8,
  maxBots: 7,
  status: 'playable',
};
