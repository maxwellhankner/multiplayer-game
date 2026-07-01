import type { RoomState } from '../../../shared/types';
import DrunkDriverPaneGrid from './DrunkDriverPaneGrid';

interface DrunkDriverWinnerProps {
  state: RoomState;
}

export default function DrunkDriverWinner({ state }: DrunkDriverWinnerProps) {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const timeLabel = winner ? `${Math.floor(winner.score / 1000)}s` : null;

  return (
    <div className="drunk-driver-winner" role="dialog" aria-label="Round results">
      <DrunkDriverPaneGrid
        players={state.players}
        mode="winner"
        winnerId={state.winnerId}
      />
      <div className="drunk-driver-winner-center">
        {winner ? (
          <>
            <div className="drunk-driver-winner-trophy" aria-hidden>
              🏁
            </div>
            <h2 className="drunk-driver-winner-title">{winner.name} wins!</h2>
            <p className="drunk-driver-winner-subtitle">{timeLabel ?? 'Crossed the line'}</p>
          </>
        ) : (
          <>
            <h2 className="drunk-driver-winner-title">Round over</h2>
            <p className="drunk-driver-winner-subtitle">It&apos;s a tie!</p>
          </>
        )}
        <p className="drunk-driver-winner-hint">Everyone tap Back to lobby on their phones</p>
      </div>
    </div>
  );
}
