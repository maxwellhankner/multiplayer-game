import { COIN_RUSH_WIN_COINS } from '../../../shared/games/coin-rush/constants';
import type { RoomState } from '../../../shared/types';
import CoinRushPaneGrid from './CoinRushPaneGrid';

interface CoinRushCountdownProps {
  state: RoomState;
}

export default function CoinRushCountdown({ state }: CoinRushCountdownProps) {
  const count = state.countdown > 0 ? state.countdown : 'GO!';

  return (
    <div className="coin-rush-countdown">
      <CoinRushPaneGrid players={state.players} mode="countdown" />
      <div className="coin-rush-countdown-center" aria-live="polite">
        <div className="coin-rush-countdown-num">{count}</div>
        <p className="coin-rush-countdown-hint">First to {COIN_RUSH_WIN_COINS} coins wins</p>
      </div>
    </div>
  );
}
