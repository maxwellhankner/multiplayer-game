import type { GameDefinition } from '../types.js';

export const shootersShoot: GameDefinition = {
  id: 'shooters-shoot',
  name: 'Shooters Shoot',
  description: 'First-person duel on controllers — 3 hits to kill. Last player standing wins.',
  supportedModes: ['local-controllers'],
  minPlayers: 1,
  maxPlayers: 8,
  maxBots: 7,
  status: 'playable',
};
