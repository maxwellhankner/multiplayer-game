import type { GameDefinition } from '../types.js';

export const buttonHold: GameDefinition = {
  id: 'button-hold',
  name: 'Button Hold',
  description: 'Hold the button longest without letting go.',
  supportedModes: ['pc-host', 'mobile-only'],
  minPlayers: 1,
  maxPlayers: 8,
  maxBots: 7,
  status: 'playable',
};
