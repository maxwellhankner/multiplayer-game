import { useCallback } from 'react';
import type { BalloonInput } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import BalloonDropControls from './BalloonDropControls';
import BalloonDropHostCanvas from './BalloonDropHostCanvas';
import BalloonDropWinner from './BalloonDropWinner';

export function BalloonDropHostView({ state }: GameHostProps) {
  if (state.phase === 'countdown') {
    return (
      <div className="balloon-drop-countdown">
        <div className="balloon-drop-countdown-num">
          {state.countdown > 0 ? state.countdown : 'GO!'}
        </div>
        <p className="balloon-drop-countdown-hint">Keep the balloon off the floor</p>
      </div>
    );
  }

  if (state.phase === 'playing' || state.phase === 'winner') {
    return (
      <>
        <BalloonDropHostCanvas state={state} />
        {state.phase === 'winner' && <BalloonDropWinner state={state} />}
      </>
    );
  }

  return null;
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
