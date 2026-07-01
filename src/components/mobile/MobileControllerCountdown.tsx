import GamePhaseCard from '../../games/shared/GamePhaseCard';
import GamePhaseOverlay from '../../games/shared/GamePhaseOverlay';

interface MobileControllerCountdownProps {
  count: number | string;
  hint: string;
  /** When true, renders over game controls without blocking touches. */
  overlay?: boolean;
}

export default function MobileControllerCountdown({
  count,
  hint,
  overlay = false,
}: MobileControllerCountdownProps) {
  const content = (
    <GamePhaseCard compact className="game-phase-card--start">
      <div className="game-phase-start-body">
        <div className="game-phase-countdown" aria-live="polite">
          {count}
        </div>
        <p className="game-phase-hint">{hint}</p>
      </div>
    </GamePhaseCard>
  );

  if (overlay) {
    return <GamePhaseOverlay variant="controller">{content}</GamePhaseOverlay>;
  }

  return <div className="controller-game-center">{content}</div>;
}
