import { useFullscreen } from '../hooks/useFullscreen';

interface ScreenControlsProps {
  onHome?: () => void;
}

export default function ScreenControls({ onHome }: ScreenControlsProps) {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  return (
    <div className="screen-controls">
      {onHome && (
        <button
          type="button"
          className="screen-btn"
          onClick={onHome}
          aria-label="Return to lobby"
          title="Return to lobby"
        >
          ⌂
        </button>
      )}
      <button
        type="button"
        className="screen-btn screen-btn-fullscreen"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? '⤡' : '⛶'}
      </button>
    </div>
  );
}
