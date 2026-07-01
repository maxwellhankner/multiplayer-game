import type { LibraryPackId } from './library-packs';

export type SoundId = string;

export interface SoundClip {
  /** Filename under /sounds/game/ or a Kenney library pack */
  file: string;
  volume?: number;
  /** Seconds to delay before playing (for layered SFX) */
  delay?: number;
  /** Kenney library pack — omit for files under /sounds/game/ */
  pack?: LibraryPackId;
}

export interface SoundDefinition {
  id: SoundId;
  label: string;
  when: string;
  clips: SoundClip[];
}

/** Game sounds wired to room events — add entries here as we hook them up. */
export const SOUND_CATALOG: SoundDefinition[] = [
  {
    id: 'lobbyJoin',
    label: 'Lobby join',
    when: 'A player or bot joins the lobby',
    clips: [{ file: 'confirmation_001.ogg', pack: 'interface', volume: 0.85 }],
  },
  {
    id: 'lobbyLeave',
    label: 'Lobby leave',
    when: 'A player or bot leaves the lobby',
    clips: [{ file: 'minimize_006.ogg', pack: 'interface', volume: 0.85 }],
  },
  {
    id: 'countdownTick',
    label: 'Countdown tick',
    when: 'Each second of the pre-game countdown (3, 2, 1)',
    clips: [{ file: 'glass_005.ogg', pack: 'interface', volume: 0.9 }],
  },
];

export function getSoundDefinition(id: SoundId): SoundDefinition {
  const def = SOUND_CATALOG.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown sound: ${id}`);
  return def;
}
