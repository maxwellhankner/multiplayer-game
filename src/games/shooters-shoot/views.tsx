import { useCallback } from 'react';
import { showsAsLandscapeReady } from '../../../shared/games/bots';
import type { CoinStickInput } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import GameCountdown from '../shared/GameCountdown';
import RotatePhonePrompt from '../coin-rush/RotatePhonePrompt';
import { useIsLandscape } from '../coin-rush/useIsLandscape';
import { useReportLandscapeReady } from '../coin-rush/useReportLandscapeReady';
import ShootersShootControls from './ShootersShootControls';
import ShootersShootHostCanvas from './ShootersShootHostCanvas';
import ShootersShootOrient from './ShootersShootOrient';
import ShootersShootWinner from './ShootersShootWinner';

export function ShootersShootHostView({ state }: GameHostProps) {
  const showGame =
    state.phase === 'orient' ||
    state.phase === 'countdown' ||
    state.phase === 'playing' ||
    state.phase === 'winner';

  if (!showGame) return null;

  return (
    <>
      <ShootersShootHostCanvas state={state} />
      {state.phase === 'orient' && <ShootersShootOrient />}
      {state.phase === 'countdown' && (
        <GameCountdown
          count={state.countdown > 0 ? state.countdown : 'GO!'}
          hint="3 hits to kill · last standing wins"
        />
      )}
      {state.phase === 'winner' && <ShootersShootWinner state={state} />}
    </>
  );
}

export function ShootersShootControllerView({
  state,
  playerId,
  onShootersShootInput,
  onShootersShootShoot,
  onShootersShootMelee,
  onShootersShootJump,
  onShootersShootReload,
  onLandscapeReady,
}: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  const isLandscape = useIsLandscape();

  const sendInput = useCallback(
    (input: CoinStickInput) => {
      onShootersShootInput?.(input);
    },
    [onShootersShootInput],
  );

  const shoot = useCallback(() => {
    onShootersShootShoot?.();
  }, [onShootersShootShoot]);

  const melee = useCallback(() => {
    onShootersShootMelee?.();
  }, [onShootersShootMelee]);

  const jump = useCallback(() => {
    onShootersShootJump?.();
  }, [onShootersShootJump]);

  const reload = useCallback(() => {
    onShootersShootReload?.();
  }, [onShootersShootReload]);

  useReportLandscapeReady(state.phase, me?.landscapeReady ?? false, onLandscapeReady);

  if (!me) return null;

  if (state.phase === 'orient') {
    if (!isLandscape && !me.landscapeReady) {
      return (
        <div className="shooters-shoot-portrait-gate">
          <RotatePhonePrompt />
        </div>
      );
    }

    const allLandscapeReady = state.players.every((p) => showsAsLandscapeReady(p));

    return (
      <ShootersShootControls
        playerName={me.name}
        playerColor={me.color}
        kills={me.score}
        hitsLeft={me.lives}
        bullets={me.bullets ?? 0}
        ammoReserve={me.ammoReserve ?? 0}
        onInput={sendInput}
        onShoot={shoot}
        onMelee={melee}
        onJump={jump}
        onReload={reload}
        waitingHint={allLandscapeReady ? undefined : 'Waiting for everyone to rotate…'}
      />
    );
  }

  if (state.phase === 'countdown' || state.phase === 'playing') {
    if (me.eliminated) {
      return (
        <div className="controller-game-eliminated">
          <p className="controller-game-eliminated-title">You&apos;re dead</p>
          <p className="controller-game-eliminated-detail">Watch the main screen</p>
        </div>
      );
    }

    const inCountdown = state.phase === 'countdown';
    return (
      <ShootersShootControls
        playerName={me.name}
        playerColor={me.color}
        kills={me.score}
        hitsLeft={me.lives}
        bullets={me.bullets ?? 0}
        ammoReserve={me.ammoReserve ?? 0}
        onInput={sendInput}
        onShoot={shoot}
        onMelee={melee}
        onJump={jump}
        onReload={reload}
        countdown={inCountdown ? (state.countdown > 0 ? state.countdown : 'GO!') : undefined}
        countdownHint={inCountdown ? 'Eliminate the other players' : undefined}
      />
    );
  }

  return null;
}
