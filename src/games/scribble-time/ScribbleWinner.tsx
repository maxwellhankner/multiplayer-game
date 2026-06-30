import type { RoomState } from '../../../shared/types';

interface ScribbleWinnerProps {
  state: RoomState;
}

export default function ScribbleWinner({ state }: ScribbleWinnerProps) {
  const winner = state.players.find((p) => p.id === state.winnerId);
  const prompter = state.players.find((p) => p.id === state.scribblePrompterId);

  return (
    <div className="scribble-winner-overlay">
      <div className="scribble-winner-card">
        <p className="scribble-winner-eyebrow">Scribble Time</p>
        {winner ? (
          <>
            <h2 className="scribble-winner-title">{winner.name} wins!</h2>
            <p className="scribble-winner-sub">
              {prompter?.name ?? 'The prompter'} picked their drawing as the best match for
              &ldquo;{state.scribblePrompt}&rdquo;
            </p>
          </>
        ) : (
          <h2 className="scribble-winner-title">Round over</h2>
        )}
        <p className="scribble-winner-hint">Everyone tap Back to lobby on their phones</p>
      </div>
    </div>
  );
}
