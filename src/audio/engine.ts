import { Howl, Howler } from 'howler';
import { SOUND_CATALOG, type SoundClip, type SoundId } from './catalog';
import { libraryPackAudioUrl, type LibraryPackId } from './library-packs';

const MUTE_KEY = 'sfx-muted';

function readMutedPreference(): boolean {
  const stored = localStorage.getItem(MUTE_KEY);
  if (stored === null) return true;
  return stored === '1';
}

let unlocked = false;
let muted = readMutedPreference();
const howls = new Map<string, Howl>();

export function isSfxMuted(): boolean {
  return muted;
}

export function setSfxMuted(value: boolean): void {
  muted = value;
  localStorage.setItem(MUTE_KEY, value ? '1' : '0');
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

function gameSoundUrl(file: string): string {
  return `/sounds/game/${file}`;
}

function librarySoundUrl(pack: LibraryPackId, file: string): string {
  return libraryPackAudioUrl(pack, file);
}

function getHowl(src: string, volume = 1): Howl {
  const existing = howls.get(src);
  if (existing) return existing;

  const howl = new Howl({
    src: [src],
    volume,
    preload: true,
  });
  howls.set(src, howl);
  return howl;
}

function clipUrl(clip: SoundClip): string {
  if (clip.pack) return librarySoundUrl(clip.pack, clip.file);
  return gameSoundUrl(clip.file);
}

function preloadAllCatalogSounds(): void {
  for (const def of SOUND_CATALOG) {
    for (const clip of def.clips) {
      getHowl(clipUrl(clip), clip.volume ?? 1);
    }
  }
}

export async function unlockAudio(): Promise<void> {
  if (Howler.ctx?.state === 'suspended') {
    await Howler.ctx.resume();
  }
  unlocked = true;
  preloadAllCatalogSounds();
}

function playClip(src: string, volume: number, delay = 0): void {
  const start = () => {
    const howl = getHowl(src, volume);
    howl.volume(volume);
    howl.stop();
    howl.play();
  };

  if (delay > 0) {
    window.setTimeout(start, delay * 1000);
  } else {
    start();
  }
}

export function playSound(id: SoundId): void {
  if (muted || !unlocked) return;

  const def = SOUND_CATALOG.find((s) => s.id === id);
  if (!def) return;

  for (const clip of def.clips) {
    playClip(clipUrl(clip), clip.volume ?? 1, clip.delay ?? 0);
  }
}

export function playPreviewFile(
  kind: 'game' | 'library',
  file: string,
  volume = 1,
  pack: LibraryPackId = 'interface',
): void {
  if (muted || !unlocked) return;

  const src = kind === 'game' ? gameSoundUrl(file) : librarySoundUrl(pack, file);
  playClip(src, volume);
}

export function playCatalogSound(id: SoundId): void {
  playSound(id);
}
