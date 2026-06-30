import { useFullscreen } from '../hooks/useFullscreen';

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
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  if (!onHome && !onBack && !showFullscreen) return null;

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
      {showFullscreen && (
        <button
          type="button"
          className="screen-btn screen-btn-fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? '⤡' : '⛶'}
        </button>
      )}
    </nav>
  );
}
