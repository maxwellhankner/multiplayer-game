import { useCallback } from 'react';
import { showsAsLandscapeReady } from '../../../shared/games/bots';
import { DRUNK_FINISH_DISTANCE } from '../../../shared/games/drunk-driver/constants';
import type { DrunkDriverInput } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import RotatePhonePrompt from '../coin-rush/RotatePhonePrompt';
import { useIsLandscape } from '../coin-rush/useIsLandscape';
import { useReportLandscapeReady } from '../coin-rush/useReportLandscapeReady';
import DrunkDriverControls from './DrunkDriverControls';
import DrunkDriverHostCanvas from './DrunkDriverHostCanvas';
import DrunkDriverOrient from './DrunkDriverOrient';
import DrunkDriverStartLight from './DrunkDriverStartLight';
import DrunkDriverWinner from './DrunkDriverWinner';

export function DrunkDriverHostView({ state }: GameHostProps) {
  const showGame =
    state.phase === 'orient' ||
    state.phase === 'countdown' ||
    state.phase === 'playing' ||
    state.phase === 'winner';

  if (!showGame) return null;

  return (
    <>
      <DrunkDriverHostCanvas state={state} />
      {state.phase === 'orient' && <DrunkDriverOrient />}
      {state.phase === 'countdown' && <DrunkDriverStartLight state={state} />}
      {state.phase === 'winner' && <DrunkDriverWinner state={state} />}
    </>
  );
}

export function DrunkDriverControllerView({
  state,
  playerId,
  onDrunkInput,
  onLandscapeReady,
}: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  const isLandscape = useIsLandscape();

  const sendInput = useCallback(
    (input: DrunkDriverInput) => {
      onDrunkInput?.(input);
    },
    [onDrunkInput],
  );

  useReportLandscapeReady(state.phase, me?.landscapeReady ?? false, onLandscapeReady);

  if (!me) return null;

  const progressPct = Math.min(100, Math.round((me.pz / DRUNK_FINISH_DISTANCE) * 100));

  if (state.phase === 'orient') {
    if (!isLandscape && !me.landscapeReady) {
      return (
        <div className="drunk-driver-portrait-gate">
          <RotatePhonePrompt />
        </div>
      );
    }

    const allLandscapeReady = state.players.every((p) => showsAsLandscapeReady(p));

    return (
      <DrunkDriverControls
        playerName={me.name}
        playerColor={me.color}
        progressPct={progressPct}
        onInput={sendInput}
        waitingHint={allLandscapeReady ? undefined : 'Waiting for everyone to tilt their phones…'}
      />
    );
  }

  if (state.phase === 'countdown' || state.phase === 'playing') {
    return (
      <DrunkDriverControls
        playerName={me.name}
        playerColor={me.color}
        progressPct={progressPct}
        onInput={sendInput}
        startLight={state.phase === 'countdown'}
        countdown={state.countdown}
      />
    );
  }

  return null;
}
