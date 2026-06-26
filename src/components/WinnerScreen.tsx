import type { RoomState } from '../../shared/types';

interface WinnerScreenProps {
  state: RoomState;
}

export default function WinnerScreen({ state }: WinnerScreenProps) {
  const winner = state.players.find((p) => p.id === state.winnerId);

  return (
    <div className="winner-overlay">
      <div className="winner-card">
        {winner ? (
          <>
            <div className="trophy">🏆</div>
            <h2>{winner.name} wins!</h2>
            <p>Backflip complete. Confetti deployed.</p>
          </>
        ) : (
          <>
            <h2>Race Over</h2>
            <p>Everyone ran out of apples!</p>
          </>
        )}
        <p className="rematch-hint">Everyone tap Ready on their phones to play again.</p>
        <ul className="final-standings">
          {state.players.map((p) => (
            <li key={p.id}>
              <span className="player-dot" style={{ background: p.color }} />
              {p.name}
              {p.id === state.winnerId && ' — Winner'}
              {p.eliminated && p.id !== state.winnerId && ' — Out'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
