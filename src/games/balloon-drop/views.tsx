import { useCallback } from 'react';
import type { BalloonInput } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import MobileControllerCountdown from '../../components/mobile/MobileControllerCountdown';
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

  if (state.phase === 'countdown') {
    return (
      <MobileControllerCountdown
        count={state.countdown > 0 ? state.countdown : 'GO!'}
        hint="Head the balloon — don't let it touch the floor"
      />
    );
  }

  if (state.phase === 'playing') {
    return (
      <BalloonDropControls
        playerName={me.name}
        playerColor={me.color}
        eliminated={me.eliminated}
        solo={state.players.length === 1}
        survivalMs={state.gameTime}
        onInput={sendInput}
      />
    );
  }

  return null;
}
