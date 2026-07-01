import type { RoomState } from '../../../shared/types';
import GamePhaseWinner from '../shared/GamePhaseWinner';

interface WinnerScreenProps {
  state: RoomState;
}

export default function WinnerScreen({ state }: WinnerScreenProps) {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const winnerNames = winner ? [winner.name] : [];
  const stat = winner ? `${winner.lives} apple${winner.lives === 1 ? '' : 's'} remaining` : 'Everyone ran out of apples';

  return (
    <GamePhaseWinner
      icon="🏆"
      winnerNames={winnerNames}
      stat={stat}
      players={state.players}
      winnerIds={winner ? new Set([winner.id]) : undefined}
    />
  );
}
