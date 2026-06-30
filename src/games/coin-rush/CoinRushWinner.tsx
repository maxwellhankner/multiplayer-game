import { COIN_RUSH_WIN_COINS } from '../../../shared/games/coin-rush/constants';
import type { RoomState } from '../../../shared/types';
import CoinRushPaneGrid from './CoinRushPaneGrid';

interface CoinRushWinnerProps {
  state: RoomState;
}

export default function CoinRushWinner({ state }: CoinRushWinnerProps) {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const scoreLabel = (score: number) => `${score} coin${score === 1 ? '' : 's'}`;

  return (
    <div className="coin-rush-winner" role="dialog" aria-label="Round results">
      <CoinRushPaneGrid
        players={state.players}
        mode="winner"
        winnerId={state.winnerId}
        winCoins={COIN_RUSH_WIN_COINS}
      />
      <div className="coin-rush-winner-center">
        {winner ? (
          <>
            <div className="coin-rush-winner-trophy" aria-hidden>
              🏆
            </div>
            <h2 className="coin-rush-winner-title">{winner.name} wins!</h2>
            <p className="coin-rush-winner-subtitle">{scoreLabel(winner.score)}</p>
          </>
        ) : (
          <>
            <h2 className="coin-rush-winner-title">Round over</h2>
            <p className="coin-rush-winner-subtitle">It&apos;s a tie!</p>
          </>
        )}
        <p className="coin-rush-winner-hint">Everyone tap Back to lobby on their phones</p>
      </div>
    </div>
  );
}
