import { useEffect, useRef } from 'react';
import type { RoomState } from '../../shared/types';
import { isShooterGunId, type ShooterGunId } from '../../shared/games/shooters-shoot/guns';
import { setLobbyMusicEnabled, setLoopSound } from '../audio/engine';
import { useAudio } from '../audio/AudioProvider';
import type { SoundId } from '../audio/catalog';

const GUN_SHOT_SOUND: Record<ShooterGunId, SoundId> = {
  pistol: 'shootersPistol',
  ak47: 'shootersAk47',
  shotgun: 'shootersShotgun',
  sniper: 'shootersSniper',
};

const JUMP_VY = 5;
const LAND_VY = -1.6;
const WALK_SPEED = 1.4;

function gunShotSound(gunId: string | undefined, shooterId: string, players: RoomState['players']): SoundId | null {
  if (isShooterGunId(gunId)) return GUN_SHOT_SOUND[gunId];
  const shooter = players.find((player) => player.id === shooterId);
  const equipped = shooter?.guns?.[shooter.gunIndex === 1 ? 1 : 0];
  if (isShooterGunId(equipped)) return GUN_SHOT_SOUND[equipped];
  return GUN_SHOT_SOUND.ak47;
}

export function useRoomSounds(state: RoomState | null) {
  const { play } = useAudio();
  const prevRef = useRef<RoomState | null>(null);
  const seenTracersRef = useRef(new Set<string>());
  const inLobby = state?.phase === 'lobby';

  useEffect(() => {
    setLobbyMusicEnabled(Boolean(inLobby));
    return () => setLobbyMusicEnabled(false);
  }, [inLobby]);

  useEffect(() => {
    return () => setLoopSound('shootersWalk', false);
  }, []);

  useEffect(() => {
    const prev = prevRef.current;
    if (!state) {
      setLoopSound('shootersWalk', false);
      return;
    }

    if (!prev) {
      for (const tracer of state.shotTracers ?? []) {
        seenTracersRef.current.add(tracer.id);
      }
      prevRef.current = state;
      return;
    }

    const lobbyish = state.phase === 'lobby' || state.phase === 'winner';

    if (lobbyish) {
      const prevIds = new Set(prev.players.map((p) => p.id));
      const currentIds = new Set(state.players.map((p) => p.id));

      for (const player of state.players) {
        if (!prevIds.has(player.id)) {
          play('lobbyJoin');
        }
      }

      for (const player of prev.players) {
        if (!currentIds.has(player.id)) {
          play('lobbyLeave');
        }
      }
    }

    if (state.phase === 'countdown' && state.countdown > 0) {
      const enteredCountdown = prev.phase !== 'countdown';
      const tickedDown = prev.countdown !== state.countdown;
      if (enteredCountdown || tickedDown) {
        play('countdownTick');
      }
    }

    const shootersPlaying = state.activeGameId === 'shooters-shoot' && state.phase === 'playing';
    if (!shootersPlaying) {
      setLoopSound('shootersWalk', false);
      if (state.phase === 'lobby' || state.gameTime < prev.gameTime) {
        seenTracersRef.current.clear();
      }
      prevRef.current = state;
      return;
    }

    const playedShots = new Set<string>();
    for (const tracer of state.shotTracers ?? []) {
      if (seenTracersRef.current.has(tracer.id)) continue;
      seenTracersRef.current.add(tracer.id);
      const shotKey = `${tracer.shooterId}:${tracer.spawnedAt}`;
      if (playedShots.has(shotKey)) continue;
      playedShots.add(shotKey);
      const sound = gunShotSound(tracer.gunId, tracer.shooterId, state.players);
      if (sound) play(sound);
    }

    const prevPlayers = new Map(prev.players.map((player) => [player.id, player]));
    let walking = false;
    let sprinting = false;
    let crouchOnly = true;

    for (const player of state.players) {
      if (player.eliminated) continue;
      const before = prevPlayers.get(player.id);
      if (!before) continue;

      const vy = player.vy ?? 0;
      const prevVy = before.vy ?? 0;
      if (prevVy < JUMP_VY && vy >= JUMP_VY) play('shootersJump');
      if (prevVy <= LAND_VY && vy > -0.35) play('shootersLand');

      const dt = Math.max(0, state.gameTime - prev.gameTime) / 1000;
      if (dt <= 0) continue;
      const grounded = Math.abs(vy) < 0.45;
      const speed = Math.hypot(player.px - before.px, player.pz - before.pz) / dt;
      if (!grounded || speed < WALK_SPEED) continue;
      walking = true;
      if (player.sprinting) sprinting = true;
      if (!player.crouching) crouchOnly = false;
    }

    const walkRate = !walking ? 1 : sprinting ? 1.28 : crouchOnly ? 0.82 : 1;
    setLoopSound('shootersWalk', walking, walkRate);
    prevRef.current = state;
  }, [state, play]);
}
