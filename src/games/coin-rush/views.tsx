import { useCallback } from 'react';
import ScoreGameWinner from '../shared/ScoreGameWinner';
import { COIN_RUSH_WIN_COINS } from '../../../shared/games/coin-rush/constants';
import type { CoinStickInput } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import MobileControllerCountdown from '../../components/mobile/MobileControllerCountdown';
import CoinRushControls from './CoinRushControls';
import CoinRushHostCanvas from './CoinRushHostCanvas';
import RotatePhonePrompt from './RotatePhonePrompt';
import { useIsLandscape } from './useIsLandscape';

export function CoinRushHostView({ state }: GameHostProps) {
  if (state.phase === 'countdown') {
    return (
      <div className="coin-rush-countdown">
        <div className="coin-rush-countdown-num">
          {state.countdown > 0 ? state.countdown : 'GO!'}
        </div>
        <p className="coin-rush-countdown-hint">First to {COIN_RUSH_WIN_COINS} coins wins</p>
      </div>
    );
  }

  if (state.phase === 'playing' || state.phase === 'winner') {
    return (
      <>
        <CoinRushHostCanvas state={state} />
        {state.phase === 'winner' && (
          <ScoreGameWinner
            state={state}
            scoreLabel={(score) => `${score} coin${score === 1 ? '' : 's'}`}
          />
        )}
      </>
    );
  }

  return null;
}

export function CoinRushControllerView({ state, playerId, onCoinInput }: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  const isLandscape = useIsLandscape();

  const sendInput = useCallback(
    (input: CoinStickInput) => {
      onCoinInput?.(input);
    },
    [onCoinInput],
  );

  if (!me) return null;

  if (!isLandscape) {
    return (
      <div className="coin-rush-portrait-gate">
        <RotatePhonePrompt />
      </div>
    );
  }

  if (state.phase === 'countdown') {
    return (
      <MobileControllerCountdown
        count={state.countdown > 0 ? state.countdown : 'GO!'}
        hint={`Collect ${COIN_RUSH_WIN_COINS} gold coins`}
      />
    );
  }

  if (state.phase === 'playing') {
    return (
      <CoinRushControls
        playerName={me.name}
        playerColor={me.color}
        score={me.score}
        winCoins={COIN_RUSH_WIN_COINS}
        onInput={sendInput}
      />
    );
  }

  return null;
}
