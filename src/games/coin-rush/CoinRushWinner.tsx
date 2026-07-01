import type { RoomState } from '../../../shared/types';
import GamePhaseWinner from '../shared/GamePhaseWinner';

interface CoinRushWinnerProps {
  state: RoomState;
}

export default function CoinRushWinner({ state }: CoinRushWinnerProps) {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const winnerNames = winner ? [winner.name] : [];
  const stat = winner
    ? `${winner.score} coin${winner.score === 1 ? '' : 's'} collected`
    : "It's a tie!";

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
