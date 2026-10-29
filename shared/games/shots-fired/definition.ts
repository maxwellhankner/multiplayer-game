import type { GameDefinition } from '../types.js';

export const shotsFired: GameDefinition = {
  id: 'shots-fired',
  name: 'Shots Fired',
  description: 'First-person duel — 3 hits to kill. Last player standing wins.',
  supportedModes: ['pc-host'],
  minPlayers: 1,
  maxPlayers: 8,
  maxBots: 7,
  status: 'playable',
};
