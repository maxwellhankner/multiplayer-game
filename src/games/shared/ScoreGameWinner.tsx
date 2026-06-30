import type { RoomState } from '../../../shared/types';

interface ScoreGameWinnerProps {
  state: RoomState;
  scoreLabel: (score: number) => string;
}

export default function ScoreGameWinner({ state, scoreLabel }: ScoreGameWinnerProps) {
  const winner = state.players.find((p) => p.id === state.winnerId);
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  return (
    <div className="winner-overlay simple-game-winner">
      <div className="winner-card">
        {winner ? (
          <>
            <div className="trophy">🏆</div>
            <h2>{winner.name} wins!</h2>
            <p>{scoreLabel(winner.score)}</p>
          </>
        ) : (
          <>
            <h2>Round over</h2>
            <p>It&apos;s a tie!</p>
          </>
        )}
        <p className="rematch-hint">Everyone tap Back to lobby on their phones.</p>
        <ul className="final-standings">
          {sorted.map((p) => (
            <li key={p.id}>
              <span className="player-dot" style={{ background: p.color }} />
              {p.name}
              <span className="standing-score">{scoreLabel(p.score)}</span>
              {p.id === state.winnerId && ' — Winner'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
