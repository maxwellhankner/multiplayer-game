export type SoundId =
  | 'playerJoin'
  | 'playerReady'
  | 'countdownTick'
  | 'countdownGo'
  | 'lifeLost'
  | 'win';

export interface SoundClip {
  /** Filename under /sounds/game/ */
  file: string;
  volume?: number;
  /** Seconds to delay before playing (for layered SFX) */
  delay?: number;
}

export interface SoundDefinition {
  id: SoundId;
  label: string;
  when: string;
  clips: SoundClip[];
}

/** Game sounds currently wired to room events — edit files in public/sounds/game/ */
export const SOUND_CATALOG: SoundDefinition[] = [
  {
    id: 'playerJoin',
    label: 'Player join',
    when: 'A human joins the lobby or returns from winner screen',
    clips: [{ file: 'player-join.ogg', volume: 0.85 }],
  },
  {
    id: 'playerReady',
    label: 'Player ready',
    when: 'A human taps Ready in the lobby',
    clips: [{ file: 'player-ready.ogg', volume: 0.8 }],
  },
  {
    id: 'countdownTick',
    label: 'Countdown tick',
    when: 'Each second of the pre-game countdown (3, 2, 1…)',
    clips: [{ file: 'countdown-tick.ogg', volume: 0.9 }],
  },
  {
    id: 'countdownGo',
    label: 'Countdown GO',
    when: 'Countdown reaches zero',
    clips: [{ file: 'countdown-go.ogg', volume: 0.85 }],
  },
  {
    id: 'lifeLost',
    label: 'Life lost',
    when: 'A player loses a life or is eliminated (host: anyone; mobile: you only)',
    clips: [{ file: 'life-lost.ogg', volume: 0.85 }],
  },
  {
    id: 'win',
    label: 'Win',
    when: 'A winner is declared',
    clips: [
      { file: 'win-crowd.mp3', volume: 0.75 },
      { file: 'win-jingle.ogg', volume: 0.55 },
      { file: 'win-confetti-a.ogg', volume: 0.5 },
      { file: 'win-confetti-b.ogg', volume: 0.5, delay: 0.04 },
      { file: 'win-confetti-c.ogg', volume: 0.5, delay: 0.08 },
    ],
  },
];

export function getSoundDefinition(id: SoundId): SoundDefinition {
  const def = SOUND_CATALOG.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown sound: ${id}`);
  return def;
}
