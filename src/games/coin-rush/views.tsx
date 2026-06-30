import { useCallback } from 'react';
import { showsAsLandscapeReady } from '../../../shared/games/bots';
import { COIN_RUSH_WIN_COINS } from '../../../shared/games/coin-rush/constants';
import type { CoinStickInput } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import CoinRushControls from './CoinRushControls';
import CoinRushCountdown from './CoinRushCountdown';
import CoinRushHostCanvas from './CoinRushHostCanvas';
import CoinRushOrient from './CoinRushOrient';
import CoinRushWinner from './CoinRushWinner';
import RotatePhonePrompt from './RotatePhonePrompt';
import { useIsLandscape } from './useIsLandscape';
import { useReportLandscapeReady } from './useReportLandscapeReady';

export function CoinRushHostView({ state }: GameHostProps) {
  if (state.phase === 'orient') {
    return <CoinRushOrient state={state} />;
  }

  if (state.phase === 'countdown') {
    return <CoinRushCountdown state={state} />;
  }

  if (state.phase === 'playing') {
    return <CoinRushHostCanvas state={state} />;
  }

  if (state.phase === 'winner') {
    return <CoinRushWinner state={state} />;
  }

  return null;
}

export function CoinRushControllerView({
  state,
  playerId,
  onCoinInput,
  onLandscapeReady,
}: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  const isLandscape = useIsLandscape();

  const sendInput = useCallback(
    (input: CoinStickInput) => {
      onCoinInput?.(input);
    },
    [onCoinInput],
  );

  useReportLandscapeReady(state.phase, me?.landscapeReady ?? false, onLandscapeReady);

  if (!me) return null;

  if (state.phase === 'orient') {
    if (!isLandscape && !me.landscapeReady) {
      return (
        <div className="coin-rush-portrait-gate">
          <RotatePhonePrompt />
        </div>
      );
    }

    const allLandscapeReady = state.players.every((p) => showsAsLandscapeReady(p));

    return (
      <CoinRushControls
        playerName={me.name}
        playerColor={me.color}
        score={me.score}
        winCoins={COIN_RUSH_WIN_COINS}
        onInput={sendInput}
        waitingHint={allLandscapeReady ? undefined : 'Waiting for everyone to rotate…'}
      />
    );
  }

  if (state.phase === 'countdown' || state.phase === 'playing') {
    const inCountdown = state.phase === 'countdown';
    return (
      <CoinRushControls
        playerName={me.name}
        playerColor={me.color}
        score={me.score}
        winCoins={COIN_RUSH_WIN_COINS}
        onInput={sendInput}
        countdown={inCountdown ? (state.countdown > 0 ? state.countdown : 'GO!') : undefined}
        countdownHint={inCountdown ? `Collect ${COIN_RUSH_WIN_COINS} gold coins` : undefined}
      />
    );
  }

  return null;
}
