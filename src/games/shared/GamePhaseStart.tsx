import type { ReactNode } from 'react';
import GamePhaseCard from './GamePhaseCard';
import GamePhaseOverlay from './GamePhaseOverlay';

interface GamePhaseStartProps {
  hint: string;
  variant?: 'host' | 'controller';
  count?: number | string;
  children?: ReactNode;
}

export default function GamePhaseStart({
  hint,
  variant = 'host',
  count,
  children,
}: GamePhaseStartProps) {
  return (
    <GamePhaseOverlay variant={variant}>
      <GamePhaseCard compact className="game-phase-card--start">
        <div className="game-phase-start-body">
          {count !== undefined ? (
            <div className="game-phase-countdown" aria-live="polite">
              {count}
            </div>
          ) : (
            children
          )}
          <p className="game-phase-hint">{hint}</p>
        </div>
      </GamePhaseCard>
    </GamePhaseOverlay>
  );
}
