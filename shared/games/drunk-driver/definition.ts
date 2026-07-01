import type { GameDefinition } from '../types.js';

export const drunkDriver: GameDefinition = {
  id: 'drunk-driver',
  name: 'Drunk Driver',
  description: 'Race across the desert — blurry vision and drifting steering. First to the line wins.',
  supportedModes: ['pc-host'],
  minPlayers: 1,
  maxPlayers: 8,
  maxBots: 7,
  status: 'playable',
};
