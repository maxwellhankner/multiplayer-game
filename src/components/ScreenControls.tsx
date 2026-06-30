import { useFullscreen } from '../hooks/useFullscreen';
import { useIsMobileDevice } from '../hooks/useIsMobileDevice';

interface ScreenControlsProps {
  /** Return to app home (/) */
  onHome?: () => void;
  /** Go back one step (e.g. setup → home) */
  onBack?: () => void;
  showFullscreen?: boolean;
}

export default function ScreenControls({
  onHome,
  onBack,
  showFullscreen = true,
}: ScreenControlsProps) {
  const isMobile = useIsMobileDevice();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const canFullscreen = showFullscreen && !isMobile;

  if (isMobile) return null;

  if (!onHome && !onBack && !canFullscreen) return null;

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
