import type { GameDefinition } from '../types.js';

export const balloonDrop: GameDefinition = {
  id: 'balloon-drop',
  name: 'Balloon Drop',
  description: 'Keep the balloon off the floor — teams battle until one side remains.',
  supportedModes: ['pc-host'],
  minPlayers: 1,
  maxPlayers: 8,
  maxBots: 7,
  status: 'playable',
};
