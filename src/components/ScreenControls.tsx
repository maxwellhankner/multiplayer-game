import { useFullscreen } from '../hooks/useFullscreen';
import { useIsMobileDevice } from '../hooks/useIsMobileDevice';

interface ScreenControlsProps {
  /** Return to app home (/) */
  onHome?: () => void;
  /** Go back one step (e.g. setup → home) */
  onBack?: () => void;
  /** Open local controller setup during a match */
  onPlayers?: () => void;
  playersOpen?: boolean;
  showFullscreen?: boolean;
}

export default function ScreenControls({
  onHome,
  onBack,
  onPlayers,
  playersOpen = false,
  showFullscreen = true,
}: ScreenControlsProps) {
  const isMobile = useIsMobileDevice();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const canFullscreen = showFullscreen && !isMobile;

  if (isMobile) return null;

  if (!onHome && !onBack && !onPlayers && !canFullscreen) return null;

  return (
    <nav className="screen-controls" aria-label="Screen menu">
      {onBack && (
        <button
          type="button"
          className="screen-btn"
          onClick={onBack}
          aria-label="Go back"
          title="Back"
        >
          ←
        </button>
      )}
      {onHome && (
        <button
          type="button"
          className="screen-btn"
          onClick={onHome}
          aria-label="Back to home"
          title="Home"
        >
          ⌂
        </button>
      )}
      {onPlayers && (
        <button
          type="button"
          className="screen-btn screen-btn-text"
          onClick={onPlayers}
          aria-pressed={playersOpen}
          aria-label="Player settings"
          title="Player settings"
        >
          Players
        </button>
      )}
      {canFullscreen && (
        <button
          type="button"
          className="screen-btn screen-btn-fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? '⤡' : '⛶'}
        </button>
      )}
    </nav>
  );
}
