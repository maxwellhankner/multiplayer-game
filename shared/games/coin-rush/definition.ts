import type { GameDefinition } from '../types.js';

export const coinRush: GameDefinition = {
  id: 'coin-rush',
  name: 'Coin Rush',
  description: 'First-person coin hunt — first to collect 5 gold coins wins.',
  supportedModes: ['pc-host'],
  minPlayers: 1,
  maxPlayers: 8,
  maxBots: 7,
  status: 'playable',
};
