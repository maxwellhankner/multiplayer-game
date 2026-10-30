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
  /** Allow this clip to overlap itself (rapid fire). */
  overlap?: boolean;
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
  {
    id: 'shootersWalk',
    label: 'Walk',
    when: 'A player is walking or sprinting on the ground in Shooters Shoot',
    clips: [{ file: 'shooters-walk.mp3', volume: 0.38 }],
  },
  {
    id: 'shootersJump',
    label: 'Jump',
    when: 'A player jumps in Shooters Shoot',
    clips: [{ file: 'shooters-jump.mp3', volume: 0.72, overlap: true }],
  },
  {
    id: 'shootersLand',
    label: 'Land',
    when: 'A player lands after a jump or fall in Shooters Shoot',
    clips: [{ file: 'shooters-land.wav', volume: 0.7, overlap: true }],
  },
  {
    id: 'shootersPistol',
    label: 'Pistol shot',
    when: 'The pistol is fired in Shooters Shoot',
    clips: [{ file: 'shooters-pistol.wav', volume: 0.58, overlap: true }],
  },
  {
    id: 'shootersAk47',
    label: 'AK-47 shot',
    when: 'The AK-47 is fired in Shooters Shoot',
    clips: [{ file: 'shooters-ak47.wav', volume: 0.5, overlap: true }],
  },
  {
    id: 'shootersShotgun',
    label: 'Shotgun shot',
    when: 'The shotgun is fired in Shooters Shoot',
    clips: [{ file: 'shooters-shotgun.wav', volume: 0.78, overlap: true }],
  },
  {
    id: 'shootersSniper',
    label: 'Sniper shot',
    when: 'The sniper is fired in Shooters Shoot',
    clips: [{ file: 'shooters-sniper.wav', volume: 0.82, overlap: true }],
  },
];

export function getSoundDefinition(id: SoundId): SoundDefinition {
  const def = SOUND_CATALOG.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown sound: ${id}`);
  return def;
}
