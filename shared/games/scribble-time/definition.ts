import type { GameDefinition } from '../types.js';

export const scribbleTime: GameDefinition = {
  id: 'scribble-time',
  name: 'Scribble Time',
  description: 'One player writes a prompt — everyone else draws it in 20 seconds.',
  supportedModes: ['pc-host'],
  minPlayers: 2,
  maxPlayers: 8,
  maxBots: 6,
  status: 'playable',
};
