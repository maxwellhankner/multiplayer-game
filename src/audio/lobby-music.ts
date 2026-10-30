export type LobbyMusicId = 'relax' | 'simple' | 'title' | 'funky' | 'space';

export interface LobbyMusicTrack {
  id: LobbyMusicId;
  name: string;
  file: string;
  hint: string;
}

export const LOBBY_MUSIC_TRACKS: readonly LobbyMusicTrack[] = [
  { id: 'relax', name: 'Relax', file: 'relax.ogg', hint: 'Soft menu / shop loop' },
  { id: 'simple', name: 'Simple', file: 'simple.ogg', hint: 'Light background loop' },
  { id: 'title', name: 'Title', file: 'title.ogg', hint: 'Calm title theme' },
  { id: 'funky', name: 'Funk', file: 'funky.mp3', hint: 'Upbeat party loop' },
  { id: 'space', name: 'Space', file: 'space.ogg', hint: 'Harp arcade menu' },
];

export const DEFAULT_LOBBY_MUSIC: LobbyMusicId = 'relax';

export function isLobbyMusicId(value: string): value is LobbyMusicId {
  return LOBBY_MUSIC_TRACKS.some((track) => track.id === value);
}
