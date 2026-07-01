import type { RoomState } from '../../../shared/types';
import GamePhaseWinner from '../shared/GamePhaseWinner';

interface ScribbleWinnerProps {
  state: RoomState;
}

export default function ScribbleWinner({ state }: ScribbleWinnerProps) {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const winnerNames = winner ? [winner.name] : [];
  const stat = state.scribblePrompt
    ? `Best match for “${state.scribblePrompt}”`
    : 'Best drawing picked';

  return (
    <GamePhaseWinner
      icon="✏️"
      winnerNames={winnerNames}
      stat={stat}
      players={state.players}
      winnerIds={winner ? new Set([winner.id]) : undefined}
    />
  );
}
