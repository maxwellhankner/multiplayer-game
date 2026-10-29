import { useCallback } from 'react';
import { showsAsLandscapeReady } from '../../../shared/games/bots';
import {
  normalizeShootersShootSettings,
  shootersShootRespawns,
  shootersShootRuleLabel,
  shootersShootTimeLimitMs,
} from '../../../shared/games/shooters-shoot/lobby';
import { equippedGun } from '../../../shared/games/shooters-shoot/guns';
import type { CoinStickInput, RoomState } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import GameCountdown from '../shared/GameCountdown';
import RotatePhonePrompt from '../coin-rush/RotatePhonePrompt';
import { useIsLandscape } from '../coin-rush/useIsLandscape';
import { useReportLandscapeReady } from '../coin-rush/useReportLandscapeReady';
import ShootersShootControls from './ShootersShootControls';
import ShootersShootHostCanvas from './ShootersShootHostCanvas';
import ShootersShootOrient from './ShootersShootOrient';
import ShootersShootWinner from './ShootersShootWinner';

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function ShootersShootMatchStatus({ state }: { state: RoomState }) {
  if (state.phase !== 'countdown' && state.phase !== 'playing') return null;
  const settings = normalizeShootersShootSettings(state.lobbySettings.shootersShoot);
  const timeLimit = shootersShootTimeLimitMs(settings);
  const label = timeLimit == null ? shootersShootRuleLabel(settings) : formatClock(timeLimit - state.gameTime);
  if (settings.winMode === 'timed' && settings.timeLimitMin === 0) return null;

  return <div className="shooters-shoot-match-status">{label}</div>;
}

export function ShootersShootHostView({ state }: GameHostProps) {
  const rule = shootersShootRuleLabel(normalizeShootersShootSettings(state.lobbySettings.shootersShoot));
  const showGame =
    state.phase === 'orient' ||
    state.phase === 'countdown' ||
    state.phase === 'playing' ||
    state.phase === 'winner';

  if (!showGame) return null;

  return (
    <>
      <ShootersShootHostCanvas state={state} />
      <ShootersShootMatchStatus state={state} />
      {state.phase === 'orient' && <ShootersShootOrient />}
      {state.phase === 'countdown' && (
        <GameCountdown
          count={state.countdown > 0 ? state.countdown : 'GO!'}
          hint={`3 hits to kill · ${rule}`}
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
        gunName={equippedGun(me).name}
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
    const rules = normalizeShootersShootSettings(state.lobbySettings.shootersShoot);
    if (me.eliminated) {
      const respawning = shootersShootRespawns(rules);
      return (
        <div className="controller-game-eliminated">
          <p className="controller-game-eliminated-title">You&apos;re dead</p>
          <p className="controller-game-eliminated-detail">
            {respawning ? 'Respawning' : 'Watch the main screen'}
          </p>
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
        gunName={equippedGun(me).name}
        onInput={sendInput}
        onShoot={shoot}
        onMelee={melee}
        onJump={jump}
        onReload={reload}
        countdown={inCountdown ? (state.countdown > 0 ? state.countdown : 'GO!') : undefined}
        countdownHint={inCountdown ? shootersShootRuleLabel(rules) : undefined}
      />
    );
  }

  return null;
}
