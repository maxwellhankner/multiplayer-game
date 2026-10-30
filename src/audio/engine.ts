import { Howl, Howler } from 'howler';
import { SOUND_CATALOG, type SoundClip, type SoundId } from './catalog';
import { libraryPackAudioUrl, type LibraryPackId } from './library-packs';
import {
  DEFAULT_LOBBY_MUSIC,
  LOBBY_MUSIC_TRACKS,
  isLobbyMusicId,
  type LobbyMusicId,
} from './lobby-music';

const MUTE_KEY = 'sfx-muted';
const MUSIC_PREF_KEY = 'lobby-music-id';

function readMutedPreference(): boolean {
  const stored = localStorage.getItem(MUTE_KEY);
  if (stored === null) return true;
  return stored === '1';
}

let unlocked = false;
let muted = readMutedPreference();
const howls = new Map<string, Howl>();
const loopHowls = new Map<string, Howl>();
const loopWanted = new Map<SoundId, { src: string; volume: number; rate: number }>();

const MUSIC_VOLUME = 0.32;
const MUSIC_FADE_IN_MS = 700;
const MUSIC_FADE_OUT_MS = 500;

let musicHowl: Howl | null = null;
let musicSrc: string | null = null;
let musicWanted = false;
let musicGen = 0;
let musicId = readMusicPreference();
let previewHowl: Howl | null = null;

function readMusicPreference(): LobbyMusicId {
  const stored = localStorage.getItem(MUSIC_PREF_KEY);
  if (stored && isLobbyMusicId(stored)) return stored;
  return DEFAULT_LOBBY_MUSIC;
}

function musicUrl(id: LobbyMusicId): string {
  const track = LOBBY_MUSIC_TRACKS.find((entry) => entry.id === id) ?? LOBBY_MUSIC_TRACKS[0];
  return `/sounds/music/${track.file}`;
}

export function isSfxMuted(): boolean {
  return muted;
}

export function setSfxMuted(value: boolean): void {
  muted = value;
  localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  syncMusic();
  syncLoops();
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

function getHowl(src: string, volume = 1, pool = 5): Howl {
  const existing = howls.get(src);
  if (existing) return existing;

  const howl = new Howl({
    src: [src],
    volume,
    preload: true,
    pool,
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
      getHowl(clipUrl(clip), clip.volume ?? 1, clip.overlap ? 16 : 5);
    }
  }
}

export async function unlockAudio(): Promise<void> {
  if (Howler.ctx?.state === 'suspended') {
    await Howler.ctx.resume();
  }
  unlocked = true;
  preloadAllCatalogSounds();
  getMusicHowl();
  syncMusic();
  syncLoops();
}

function disposeMusicHowl(): void {
  if (!musicHowl) return;
  musicHowl.stop();
  musicHowl.unload();
  musicHowl = null;
  musicSrc = null;
}

function getMusicHowl(): Howl {
  const src = musicUrl(musicId);
  if (musicHowl && musicSrc === src) return musicHowl;
  disposeMusicHowl();
  musicHowl = new Howl({
    src: [src],
    loop: true,
    volume: 0,
    preload: true,
  });
  musicSrc = src;
  return musicHowl;
}

export function getLobbyMusicId(): LobbyMusicId {
  return musicId;
}

export function setLobbyMusicId(id: LobbyMusicId): void {
  stopPreviewMusic();
  if (id === musicId && musicHowl) {
    localStorage.setItem(MUSIC_PREF_KEY, id);
    syncMusic();
    return;
  }
  musicId = id;
  localStorage.setItem(MUSIC_PREF_KEY, id);
  disposeMusicHowl();
  syncMusic();
}

function syncMusic(): void {
  const shouldPlay = musicWanted && !muted && unlocked;
  if (shouldPlay) startMusic();
  else stopMusic();
}

function currentVolume(howl: Howl): number {
  const value = howl.volume();
  return typeof value === 'number' ? value : 0;
}

function startMusic(): void {
  const howl = getMusicHowl();
  musicGen += 1;
  if (howl.playing()) {
    howl.fade(currentVolume(howl), MUSIC_VOLUME, 250);
    return;
  }
  howl.volume(0);
  howl.play();
  howl.fade(0, MUSIC_VOLUME, MUSIC_FADE_IN_MS);
}

function stopMusic(): void {
  const howl = musicHowl;
  if (!howl || !howl.playing()) return;
  const gen = ++musicGen;
  howl.fade(currentVolume(howl), 0, MUSIC_FADE_OUT_MS);
  howl.once('fade', () => {
    if (gen !== musicGen) return;
    howl.stop();
  });
}

/** Loop lobby music while the room is in setup. No-ops until sound is on. */
export function setLobbyMusicEnabled(on: boolean): void {
  musicWanted = on;
  syncMusic();
}

function playClip(src: string, volume: number, delay = 0, overlap = false): void {
  const start = () => {
    const howl = getHowl(src, volume, overlap ? 16 : 5);
    howl.volume(volume);
    if (!overlap) howl.stop();
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
    playClip(clipUrl(clip), clip.volume ?? 1, clip.delay ?? 0, clip.overlap === true);
  }
}

function getLoopHowl(src: string, volume: number): Howl {
  const existing = loopHowls.get(src);
  if (existing) return existing;
  const howl = new Howl({
    src: [src],
    volume,
    loop: true,
    preload: true,
  });
  loopHowls.set(src, howl);
  return howl;
}

function syncLoops(): void {
  const activeSrc = new Set<string>();
  for (const wanted of loopWanted.values()) {
    if (!unlocked || muted) continue;
    activeSrc.add(wanted.src);
    const howl = getLoopHowl(wanted.src, wanted.volume);
    howl.volume(wanted.volume);
    howl.rate(wanted.rate);
    if (!howl.playing()) howl.play();
  }

  for (const [src, howl] of loopHowls) {
    if (activeSrc.has(src)) continue;
    if (howl.playing()) howl.stop();
  }
}

/** Start or stop a catalog clip as a loop (walking, engines, etc.). */
export function setLoopSound(id: SoundId, on: boolean, rate = 1): void {
  if (!on) {
    loopWanted.delete(id);
    syncLoops();
    return;
  }

  const def = SOUND_CATALOG.find((s) => s.id === id);
  const clip = def?.clips[0];
  if (!clip) return;

  loopWanted.set(id, {
    src: clipUrl(clip),
    volume: clip.volume ?? 1,
    rate,
  });
  syncLoops();
}

export function playPreviewFile(
  kind: 'game' | 'library' | 'music',
  file: string,
  volume = 1,
  pack: LibraryPackId = 'interface',
): void {
  if (muted || !unlocked) return;

  if (kind === 'music') {
    playPreviewMusic(file, volume);
    return;
  }

  stopPreviewMusic();
  const src = kind === 'game' ? gameSoundUrl(file) : librarySoundUrl(pack, file);
  playClip(src, volume, 0, true);
}

function playPreviewMusic(file: string, volume: number): void {
  stopPreviewMusic();
  previewHowl = new Howl({
    src: [`/sounds/music/${file}`],
    loop: true,
    volume,
    preload: true,
  });
  previewHowl.play();
}

export function stopPreviewMusic(): void {
  if (!previewHowl) return;
  previewHowl.stop();
  previewHowl.unload();
  previewHowl = null;
}

export function playCatalogSound(id: SoundId): void {
  playSound(id);
}
