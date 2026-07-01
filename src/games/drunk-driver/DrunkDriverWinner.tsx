import type { RoomState } from '../../../shared/types';
import GamePhaseWinner from '../shared/GamePhaseWinner';

interface DrunkDriverWinnerProps {
  state: RoomState;
}

export default function DrunkDriverWinner({ state }: DrunkDriverWinnerProps) {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const winnerNames = winner ? [winner.name] : [];
  const stat = winner
    ? `${Math.floor(winner.score / 1000)}s to the finish line`
    : "It's a tie!";

  return (
    <GamePhaseWinner
      icon="🏁"
      winnerNames={winnerNames}
      stat={stat}
      players={state.players}
      winnerIds={winner ? new Set([winner.id]) : undefined}
    />
  );
}
