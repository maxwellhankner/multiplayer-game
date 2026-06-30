import type { GameDefinition } from '../types.js';

export const hoeDownDerby: GameDefinition = {
  id: 'hoe-down-derby',
  name: 'Hoe Down Derby',
  description: 'Horse jumping survival — tap JUMP to clear gates and barrels.',
  supportedModes: ['pc-host'],
  minPlayers: 1,
  maxPlayers: 8,
  maxBots: 7,
  status: 'playable',
};
