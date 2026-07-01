import type { DrunkDriverInput, PlayerState } from '../../../shared/types.js';
import {
  DRUNK_ACCEL,
  DRUNK_CAR_RADIUS,
  DRUNK_DRAG,
  DRUNK_FINISH_DISTANCE,
  DRUNK_INPUT_DEADZONE,
  DRUNK_MAX_LATERAL,
  DRUNK_MAX_SPEED,
  DRUNK_MAX_WHEEL_ANGLE,
  DRUNK_OFFSET_MS_MAX,
  DRUNK_OFFSET_MS_MIN,
  DRUNK_STEER_OFFSET_MAX,
  DRUNK_STEER_OFFSET_MIN,
  DRUNK_WHEEL_SMOOTH,
  DRUNK_WHEELBASE,
} from '../../../shared/games/drunk-driver/constants.js';
import {
  drunkForwardFromYaw,
  drunkTurnRate,
} from '../../../shared/games/drunk-driver/kinematics.js';
import { getMaxLateral, getStartLaneX } from '../../../shared/games/drunk-driver/lanes.js';

export interface DrunkDriverRoom {
  phase: string;
  players: Map<string, PlayerState>;
  winnerId: string | null;
  gameTime: number;
  drunkInputs: Map<string, DrunkDriverInput>;
}

const ZERO_INPUT: DrunkDriverInput = { gas: false, steer: 0 };

interface SteerDrift {
  offset: number;
  msLeft: number;
}

const steerDrift = new Map<string, SteerDrift>();
const playerSpeed = new Map<string, number>();

function clampSteer(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function rollSteerOffset(): number {
  return (
    DRUNK_STEER_OFFSET_MIN +
    Math.random() * (DRUNK_STEER_OFFSET_MAX - DRUNK_STEER_OFFSET_MIN)
  );
}

function rollOffsetDuration(): number {
  return DRUNK_OFFSET_MS_MIN + Math.random() * (DRUNK_OFFSET_MS_MAX - DRUNK_OFFSET_MS_MIN);
}

function getSteerDrift(playerId: string, dtMs: number): number {
  let drift = steerDrift.get(playerId);
  if (!drift) {
    drift = { offset: rollSteerOffset(), msLeft: rollOffsetDuration() };
    steerDrift.set(playerId, drift);
  }

  drift.msLeft -= dtMs;
  if (drift.msLeft <= 0) {
    drift.offset = rollSteerOffset();
    drift.msLeft = rollOffsetDuration();
  }

  return drift.offset;
}

function clampLateral(x: number, playerCount: number): number {
  const limit = Math.max(DRUNK_MAX_LATERAL, getMaxLateral(playerCount));
  return Math.max(-limit, Math.min(limit, x));
}

export function clearDrunkDriverState(): void {
  steerDrift.clear();
  playerSpeed.clear();
}

export function initDrunkDriver(room: DrunkDriverRoom): void {
  clearDrunkDriverState();
  room.drunkInputs.clear();

  const players = [...room.players.values()];
  const count = players.length;

  for (const player of players) {
    player.px = getStartLaneX(player.lane, count);
    player.pz = 0;
    player.yaw = 0;
    player.pitch = 0;
    player.score = 0;
    player.eliminated = false;
    playerSpeed.set(player.id, 0);
    room.drunkInputs.set(player.id, { ...ZERO_INPUT });
  }
}

export function normalizeDrunkInput(input: DrunkDriverInput): DrunkDriverInput {
  const steer = clampSteer(input.steer);
  return {
    gas: Boolean(input.gas),
    steer: Math.abs(steer) < DRUNK_INPUT_DEADZONE ? 0 : steer,
  };
}

export function setDrunkDriverInput(
  room: DrunkDriverRoom,
  playerId: string,
  input: DrunkDriverInput,
): boolean {
  if (!room.players.has(playerId)) return false;
  room.drunkInputs.set(playerId, normalizeDrunkInput(input));
  return true;
}

function checkDrunkWinner(room: DrunkDriverRoom): void {
  if (room.winnerId) return;

  for (const player of room.players.values()) {
    if (player.pz >= DRUNK_FINISH_DISTANCE) {
      room.phase = 'winner';
      room.winnerId = player.id;
      player.score = Math.floor(room.gameTime);
      return;
    }
  }
}

function separatePair(a: PlayerState, b: PlayerState, playerCount: number): void {
  const dx = b.px - a.px;
  const dz = b.pz - a.pz;
  let dist = Math.hypot(dx, dz);
  const minDist = DRUNK_CAR_RADIUS * 2;

  if (dist >= minDist) return;

  if (dist < 0.001) {
    const nudge = minDist * 0.5;
    a.px -= nudge;
    b.px += nudge;
  } else {
    const overlap = minDist - dist;
    const nx = dx / dist;
    const nz = dz / dist;
    a.px -= nx * overlap * 0.5;
    a.pz -= nz * overlap * 0.5;
    b.px += nx * overlap * 0.5;
    b.pz += nz * overlap * 0.5;
  }

  a.px = clampLateral(a.px, playerCount);
  b.px = clampLateral(b.px, playerCount);
  a.pz = Math.max(0, a.pz);
  b.pz = Math.max(0, b.pz);
}

function resolveCarCollisions(players: PlayerState[], playerCount: number): void {
  const active = players.filter((p) => !p.eliminated);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        separatePair(active[i], active[j], playerCount);
      }
    }
  }
}

export function tickDrunkDriver(room: DrunkDriverRoom, dtMs: number): void {
  room.gameTime += dtMs;
  const dt = dtMs / 1000;
  const playerCount = room.players.size;
  const players = [...room.players.values()];

  for (const player of players) {
    if (player.eliminated) continue;

    const input = room.drunkInputs.get(player.id) ?? ZERO_INPUT;
    const drift = getSteerDrift(player.id, dtMs);
    const effectiveSteer = clampSteer(-input.steer + drift);

    const targetWheel = effectiveSteer * DRUNK_MAX_WHEEL_ANGLE;
    const wheelBlend = 1 - Math.exp(-DRUNK_WHEEL_SMOOTH * dt);
    player.pitch += (targetWheel - player.pitch) * wheelBlend;

    let speed = playerSpeed.get(player.id) ?? 0;
    if (input.gas) {
      speed += DRUNK_ACCEL * dt;
      if (speed > DRUNK_MAX_SPEED) speed = DRUNK_MAX_SPEED;
    } else {
      speed = Math.max(0, speed - DRUNK_DRAG * dt);
    }
    playerSpeed.set(player.id, speed);

    if (speed > 0.25) {
      player.yaw -= drunkTurnRate(speed, player.pitch, DRUNK_WHEELBASE) * dt;
    }

    const forward = drunkForwardFromYaw(player.yaw);
    player.px += forward.x * speed * dt;
    player.pz += forward.z * speed * dt;
    player.px = clampLateral(player.px, playerCount);
    player.pz = Math.max(0, player.pz);
  }

  resolveCarCollisions(players, playerCount);
  checkDrunkWinner(room);
}
