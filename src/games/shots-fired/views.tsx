import { useCallback } from 'react';
import { showsAsLandscapeReady } from '../../../shared/games/bots';
import type { CoinStickInput } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import GameCountdown from '../shared/GameCountdown';
import RotatePhonePrompt from '../coin-rush/RotatePhonePrompt';
import { useIsLandscape } from '../coin-rush/useIsLandscape';
import { useReportLandscapeReady } from '../coin-rush/useReportLandscapeReady';
import ShotsFiredControls from './ShotsFiredControls';
import ShotsFiredHostCanvas from './ShotsFiredHostCanvas';
import ShotsFiredOrient from './ShotsFiredOrient';
import ShotsFiredWinner from './ShotsFiredWinner';

export function ShotsFiredHostView({ state }: GameHostProps) {
  const showGame =
    state.phase === 'orient' ||
    state.phase === 'countdown' ||
    state.phase === 'playing' ||
    state.phase === 'winner';

  if (!showGame) return null;

  return (
    <>
      <ShotsFiredHostCanvas state={state} />
      {state.phase === 'orient' && <ShotsFiredOrient />}
      {state.phase === 'countdown' && (
        <GameCountdown
          count={state.countdown > 0 ? state.countdown : 'GO!'}
          hint="3 hits to kill · last standing wins"
        />
      )}
      {state.phase === 'winner' && <ShotsFiredWinner state={state} />}
    </>
  );
}

export function ShotsFiredControllerView({
  state,
  playerId,
  onShotsFiredInput,
  onShotsFiredShoot,
  onShotsFiredMelee,
  onShotsFiredJump,
  onLandscapeReady,
}: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  const isLandscape = useIsLandscape();

  const sendInput = useCallback(
    (input: CoinStickInput) => {
      onShotsFiredInput?.(input);
    },
    [onShotsFiredInput],
  );

  const shoot = useCallback(() => {
    onShotsFiredShoot?.();
  }, [onShotsFiredShoot]);

  const melee = useCallback(() => {
    onShotsFiredMelee?.();
  }, [onShotsFiredMelee]);

  const jump = useCallback(() => {
    onShotsFiredJump?.();
  }, [onShotsFiredJump]);

  useReportLandscapeReady(state.phase, me?.landscapeReady ?? false, onLandscapeReady);

  if (!me) return null;

  if (state.phase === 'orient') {
    if (!isLandscape && !me.landscapeReady) {
      return (
        <div className="shots-fired-portrait-gate">
          <RotatePhonePrompt />
        </div>
      );
    }

    const allLandscapeReady = state.players.every((p) => showsAsLandscapeReady(p));

    return (
      <ShotsFiredControls
        playerName={me.name}
        playerColor={me.color}
        kills={me.score}
        hitsLeft={me.lives}
        onInput={sendInput}
        onShoot={shoot}
        onMelee={melee}
        onJump={jump}
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
      <ShotsFiredControls
        playerName={me.name}
        playerColor={me.color}
        kills={me.score}
        hitsLeft={me.lives}
        onInput={sendInput}
        onShoot={shoot}
        onMelee={melee}
        onJump={jump}
        countdown={inCountdown ? (state.countdown > 0 ? state.countdown : 'GO!') : undefined}
        countdownHint={inCountdown ? 'Eliminate the other players' : undefined}
      />
    );
  }

  return null;
}
