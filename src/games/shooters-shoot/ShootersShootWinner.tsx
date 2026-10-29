import type { RoomState } from '../../../shared/types';
import GamePhaseWinner from '../shared/GamePhaseWinner';

interface ShootersShootWinnerProps {
  state: RoomState;
}

export default function ShootersShootWinner({ state }: ShootersShootWinnerProps) {
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
      hint={state.sessionMode === 'local-controllers' ? 'Start opens the match menu.' : undefined}
    />
  );
}
