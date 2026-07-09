import type { RoomState } from '../../../shared/types';
import GamePhaseWinner from '../shared/GamePhaseWinner';

interface ShotsFiredWinnerProps {
  state: RoomState;
}

export default function ShotsFiredWinner({ state }: ShotsFiredWinnerProps) {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const winnerNames = winner ? [winner.name] : [];
  const stat = winner
    ? `${winner.score} kill${winner.score === 1 ? '' : 's'}`
    : "It's a tie!";

  return (
    <GamePhaseWinner
      icon="🎯"
      winnerNames={winnerNames}
      stat={stat}
      players={state.players}
      winnerIds={winner ? new Set([winner.id]) : undefined}
    />
  );
}
