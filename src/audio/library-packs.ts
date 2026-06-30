import interfaceFiles from './kenney-interface-files.json';
import digitalFiles from './kenney-digital-audio-files.json';
import sciFiFiles from './kenney-sci-fi-files.json';

export type LibraryPackId = 'interface' | 'digital' | 'sci-fi';

export interface LibraryPack {
  id: LibraryPackId;
  label: string;
  hint: string;
  folder: string;
  files: string[];
}

export const LIBRARY_PACKS: LibraryPack[] = [
  {
    id: 'interface',
    label: 'Interface Sounds',
    hint: 'UI clicks, ticks, confirmations (CC0)',
    folder: 'kenney-interface',
    files: interfaceFiles as string[],
  },
  {
    id: 'digital',
    label: 'Digital Audio',
    hint: 'Retro lasers, power-ups, zaps (CC0)',
    folder: 'kenney-digital-audio',
    files: digitalFiles as string[],
  },
  {
    id: 'sci-fi',
    label: 'Sci-Fi Sounds',
    hint: 'Engines, explosions, doors, lasers (CC0)',
    folder: 'kenney-sci-fi',
    files: sciFiFiles as string[],
  },
];

export function getLibraryPack(id: LibraryPackId): LibraryPack {
  const pack = LIBRARY_PACKS.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown library pack: ${id}`);
  return pack;
}

export function libraryPackAudioUrl(packId: LibraryPackId, file: string): string {
  const pack = getLibraryPack(packId);
  return `/sounds/library/${pack.folder}/Audio/${file}`;
}
