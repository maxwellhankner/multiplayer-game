import { useCallback } from 'react';
import type { BalloonInput } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import GameCountdown from '../shared/GameCountdown';
import BalloonDropControls from './BalloonDropControls';
import BalloonDropHostCanvas from './BalloonDropHostCanvas';
import BalloonDropWinner from './BalloonDropWinner';

export function BalloonDropHostView({ state }: GameHostProps) {
  const showGame =
    state.phase === 'countdown' || state.phase === 'playing' || state.phase === 'winner';

  if (!showGame) return null;

  return (
    <>
      <BalloonDropHostCanvas state={state} />
      {state.phase === 'countdown' && (
        <GameCountdown
          count={state.countdown > 0 ? state.countdown : 'GO!'}
          hint="Keep the balloon off the floor"
        />
      )}
      {state.phase === 'winner' && <BalloonDropWinner state={state} />}
    </>
  );
}

export function BalloonDropControllerView({ state, playerId, onBalloonInput }: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  const sendInput = useCallback(
    (input: BalloonInput) => {
      onBalloonInput?.(input);
    },
    [onBalloonInput],
  );

  if (!me) return null;

  if (state.phase === 'countdown' || state.phase === 'playing') {
    const inCountdown = state.phase === 'countdown';
    return (
      <BalloonDropControls
        playerName={me.name}
        playerColor={me.color}
        eliminated={me.eliminated}
        solo={state.players.length === 1}
        survivalMs={state.gameTime}
        onInput={sendInput}
        countdown={inCountdown ? (state.countdown > 0 ? state.countdown : 'GO!') : undefined}
        countdownHint={inCountdown ? "Head the balloon — don't let it touch the floor" : undefined}
      />
    );
  }

  return null;
}
