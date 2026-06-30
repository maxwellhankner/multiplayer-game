import { useAudio } from '../audio/AudioProvider';

interface SoundToggleProps {
  className?: string;
  iconOnly?: boolean;
}

export default function SoundToggle({
  className = 'sound-toggle',
  iconOnly = false,
}: SoundToggleProps) {
  const { muted, unlocked, setMuted, unlock } = useAudio();

  const label = !unlocked ? 'Enable sound' : muted ? 'Turn sound on' : 'Turn sound off';

  return (
    <button
      type="button"
      className={`${className}${iconOnly ? ' sound-toggle--icon-only' : ''}`.trim()}
      aria-label={label}
      title={label}
      onClick={() => {
        void unlock();
        setMuted(!muted);
      }}
    >
      <span className="sound-toggle-icon" aria-hidden>
        {muted ? '🔇' : '🔊'}
      </span>
      {!iconOnly && (
        <span className="sound-toggle-label">
          {!unlocked ? 'Enable sound' : muted ? 'Sound off' : 'Sound on'}
        </span>
      )}
    </button>
  );
}
