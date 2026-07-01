import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SOUND_CATALOG } from '../audio/catalog';
import { playPreviewFile, unlockAudio } from '../audio/engine';
import { LIBRARY_PACKS, type LibraryPackId } from '../audio/library-packs';
import SoundToggle from '../components/SoundToggle';

interface SoundButton {
  key: string;
  code: string;
  title: string;
  kind: 'game' | 'library';
  file: string;
  pack?: LibraryPackId;
}

const GAME_FILES: { file: string; title: string; pack?: LibraryPackId }[] = SOUND_CATALOG.flatMap(
  (def) =>
    def.clips.map((clip, index) => ({
      file: clip.file,
      pack: clip.pack,
      title: def.clips.length > 1 ? `${def.label} (${index + 1})` : def.label,
    })),
);

function codeFromFilename(file: string): string {
  return file.replace(/\.(ogg|mp3|wav)$/i, '');
}

function titleFromCode(code: string): string {
  const withSpaces = code
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d+)/g, '$1 $2')
    .trim();

  return withSpaces
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function SoundGrid({
  sounds,
  playingKey,
  onPlay,
}: {
  sounds: SoundButton[];
  playingKey: string | null;
  onPlay: (sound: SoundButton) => void;
}) {
  if (sounds.length === 0) {
    return <p className="hint sound-browse-empty">No sounds match your search.</p>;
  }

  return (
    <ul className="sound-browse-grid">
      {sounds.map((sound) => (
        <li key={sound.key}>
          <button
            type="button"
            className={`sound-browse-btn${playingKey === sound.key ? ' sound-browse-btn--playing' : ''}`}
            onClick={() => onPlay(sound)}
          >
            <span className="sound-browse-title">{sound.title}</span>
            <span className="sound-browse-code">{sound.code}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function SoundsPreviewPage() {
  const [filter, setFilter] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const gameSounds = useMemo<SoundButton[]>(
    () =>
      GAME_FILES.map((entry) => {
        const code = codeFromFilename(entry.file);
        return {
          key: `game:${entry.pack ?? 'game'}:${entry.file}`,
          code,
          title: entry.title,
          kind: entry.pack ? 'library' : 'game',
          file: entry.file,
          pack: entry.pack,
        };
      }),
    [],
  );

  const librarySections = useMemo(
    () =>
      LIBRARY_PACKS.map((pack) => ({
        pack,
        sounds: pack.files.map((file) => {
          const code = codeFromFilename(file);
          return {
            key: `${pack.id}:${file}`,
            code,
            title: titleFromCode(code),
            kind: 'library' as const,
            file,
            pack: pack.id,
          };
        }),
      })),
    [],
  );

  const filterSounds = (sounds: SoundButton[]) => {
    const q = filter.trim().toLowerCase();
    if (!q) return sounds;
    return sounds.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.file.toLowerCase().includes(q),
    );
  };

  const filteredGame = useMemo(() => filterSounds(gameSounds), [filter, gameSounds]);
  const filteredLibrarySections = useMemo(
    () =>
      librarySections.map(({ pack, sounds }) => ({
        pack,
        sounds: filterSounds(sounds),
      })),
    [filter, librarySections],
  );

  const totalLibrary = LIBRARY_PACKS.reduce((sum, pack) => sum + pack.files.length, 0);
  const filteredLibraryTotal = filteredLibrarySections.reduce(
    (sum, section) => sum + section.sounds.length,
    0,
  );

  useEffect(() => {
    void unlockAudio().then(() => setUnlocked(true));
  }, []);

  const playSound = (sound: SoundButton) => {
    void unlockAudio().then(() => {
      setUnlocked(true);
      setPlayingKey(sound.key);
      playPreviewFile(sound.kind, sound.file, 1, sound.pack);
      window.setTimeout(() => setPlayingKey(null), 700);
    });
  };

  return (
    <div className="platform-shell">
      <div className="platform-page sounds-preview-page">
        <div className="sounds-preview-header">
          <div>
            <h1 className="platform-title">Sound browser</h1>
            <p className="hint sounds-preview-lead">
              Click any button to hear it. Each shows a title and file code.
            </p>
          </div>
          <div className="sounds-preview-header-actions">
            <SoundToggle iconOnly />
            <Link to="/" className="btn btn-secondary sounds-preview-back">
              Back home
            </Link>
          </div>
        </div>

        {!unlocked && (
          <p className="status-msg sounds-preview-unlock">Tap a sound to enable audio.</p>
        )}

        <input
          type="search"
          className="text-input sound-browse-search"
          placeholder="Search by title or code…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <section className="panel sounds-preview-section">
          <h2>Game sounds ({filteredGame.length})</h2>
          <p className="hint sound-browse-section-hint">
            Wired to gameplay via the sound catalog.
          </p>
          <SoundGrid sounds={filteredGame} playingKey={playingKey} onPlay={playSound} />
        </section>

        {filteredLibraryTotal > 0 && (
          <p className="hint sound-browse-library-total">
            Kenney library — {filteredLibraryTotal} of {totalLibrary} sounds
          </p>
        )}

        {filteredLibrarySections.map(({ pack, sounds }) => {
          if (sounds.length === 0) return null;
          return (
            <section key={pack.id} className="panel sounds-preview-section">
              <h2>
                {pack.label} ({sounds.length})
              </h2>
              <p className="hint sound-browse-section-hint">{pack.hint}</p>
              <SoundGrid sounds={sounds} playingKey={playingKey} onPlay={playSound} />
            </section>
          );
        })}

        {filteredGame.length === 0 && filteredLibraryTotal === 0 && (
          <p className="hint sound-browse-empty">No sounds match your search.</p>
        )}
      </div>
    </div>
  );
}
