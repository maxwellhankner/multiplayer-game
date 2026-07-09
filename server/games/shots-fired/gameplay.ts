import type { CoinStickInput, PlayerState, ShotImpactKind, ShotImpactState, ShotTracerState } from '../../../shared/types.js';
import {
  SHOTS_FIRED_ARENA_HALF,
  SHOTS_FIRED_BOXES,
  SHOTS_FIRED_BULLETS,
  SHOTS_FIRED_DEATH_FLOAT_MAX,
  SHOTS_FIRED_DEATH_FLOAT_SPEED,
  SHOTS_FIRED_FIRE_COOLDOWN_MS,
  SHOTS_FIRED_GRAVITY,
  SHOTS_FIRED_HIT_INVULN_MS,
  SHOTS_FIRED_HIT_RADIUS,
  SHOTS_FIRED_HITBOX_BOTTOM_Y,
  SHOTS_FIRED_HITBOX_TOP_Y,
  SHOTS_FIRED_IMPACT_DURATION_MS,
  SHOTS_FIRED_JUMP_SPEED,
  SHOTS_FIRED_LOOK_SPEED,
  SHOTS_FIRED_MAX_HITS,
  SHOTS_FIRED_MAX_PITCH,
  SHOTS_FIRED_MAX_RANGE,
  SHOTS_FIRED_MELEE_CONE,
  SHOTS_FIRED_MELEE_COOLDOWN_MS,
  SHOTS_FIRED_MELEE_RANGE,
  SHOTS_FIRED_MOVE_SPEED,
  SHOTS_FIRED_PITCH_SPEED,
  SHOTS_FIRED_PLAYER_RADIUS,
  SHOTS_FIRED_TRACER_DURATION_MS,
  SHOTS_FIRED_WALL_HEIGHT,
} from '../../../shared/games/shots-fired/constants.js';
import { normalizeCoinInput } from '../coin-rush/gameplay.js';
import { getEyePosition, getLookDirection } from '../../../shared/games/shots-fired/kinematics.js';

export { getEyePosition, getLookDirection };

export interface ShotsFiredRoom {
  phase: string;
  players: Map<string, PlayerState>;
  winnerId: string | null;
  gameTime: number;
  shotsFiredInputs: Map<string, CoinStickInput>;
  shotTracers: ShotTracerState[];
  shotImpacts: ShotImpactState[];
  nextTracerId: number;
  nextImpactId: number;
  lastFireAt: Map<string, number>;
  lastMeleeAt: Map<string, number>;
  jumpVel: Map<string, number>;
}

const ZERO_INPUT: CoinStickInput = { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };

function clampToArena(x: number, z: number): { x: number; z: number } {
  const limit = SHOTS_FIRED_ARENA_HALF - 1;
  return {
    x: Math.max(-limit, Math.min(limit, x)),
    z: Math.max(-limit, Math.min(limit, z)),
  };
}

/** Tolerance so a player resting exactly on a box top isn't treated as blocked. */
const BOX_TOP_EPSILON = 0.15;

/**
 * True if a player cylinder at (x,z) whose feet are at feetY would intersect a
 * box's solid volume. Standing on (feet at/above the top) is not a collision.
 */
function isBlockedByBox(x: number, z: number, feetY: number): boolean {
  for (const box of SHOTS_FIRED_BOXES) {
    if (feetY >= box.h - BOX_TOP_EPSILON) continue;
    if (
      Math.abs(x - box.x) < box.hw + SHOTS_FIRED_PLAYER_RADIUS &&
      Math.abs(z - box.z) < box.hd + SHOTS_FIRED_PLAYER_RADIUS
    ) {
      return true;
    }
  }
  return false;
}

/** Height of the surface directly under the player (box top if standing over one, else floor). */
function supportHeightAt(x: number, z: number, feetY: number): number {
  let ground = 0;
  for (const box of SHOTS_FIRED_BOXES) {
    if (feetY < box.h - 0.05) continue;
    if (
      Math.abs(x - box.x) < box.hw + SHOTS_FIRED_PLAYER_RADIUS &&
      Math.abs(z - box.z) < box.hd + SHOTS_FIRED_PLAYER_RADIUS
    ) {
      if (box.h > ground) ground = box.h;
    }
  }
  return ground;
}

function overlapsAnyBox(x: number, z: number, margin: number): boolean {
  for (const box of SHOTS_FIRED_BOXES) {
    if (
      Math.abs(x - box.x) < box.hw + SHOTS_FIRED_PLAYER_RADIUS + margin &&
      Math.abs(z - box.z) < box.hd + SHOTS_FIRED_PLAYER_RADIUS + margin
    ) {
      return true;
    }
  }
  return false;
}

function getPlayerSpawnPosition(index: number, playerCount: number): { x: number; z: number } {
  const angle = (index / Math.max(playerCount, 1)) * Math.PI * 2;
  const baseRadius = 4 + (index % 3);
  const limit = SHOTS_FIRED_ARENA_HALF - 1.5;
  for (let step = 0; step < 12; step++) {
    const radius = Math.min(baseRadius + step * 0.6, limit);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (!overlapsAnyBox(x, z, 0.5)) return { x, z };
  }
  return { x: Math.sin(angle) * baseRadius, z: Math.cos(angle) * baseRadius };
}

function raySphereHitDistance(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  maxDist: number,
): number | null {
  const fx = cx - ox;
  const fy = cy - oy;
  const fz = cz - oz;
  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const c = fx * fx + fy * fy + fz * fz - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const sqrtD = Math.sqrt(discriminant);
  let t = (-b - sqrtD) / (2 * a);
  if (t < 0) t = (-b + sqrtD) / (2 * a);
  if (t < 0.01 || t > maxDist) return null;
  return t;
}

/**
 * Ray vs a vertical capsule (axis at (cx,cz) spanning [bottomY, topY], plus
 * radius r). Returns nearest hit distance or null. Covers the full player body
 * so level shots connect with the head cap instead of sailing overhead.
 */
function rayVerticalCapsuleHitDistance(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cz: number,
  bottomY: number,
  topY: number,
  radius: number,
  maxDist: number,
): number | null {
  let best = Infinity;

  const fx = ox - cx;
  const fz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a > 1e-9) {
    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      for (const t of [(-b - s) / (2 * a), (-b + s) / (2 * a)]) {
        if (t < 0.01 || t > maxDist) continue;
        const y = oy + dy * t;
        if (y >= bottomY && y <= topY && t < best) best = t;
      }
    }
  }

  for (const capY of [bottomY, topY]) {
    const t = raySphereHitDistance(ox, oy, oz, dx, dy, dz, cx, capY, cz, radius, maxDist);
    if (t !== null && t < best) best = t;
  }

  return best === Infinity ? null : best;
}

interface ShotRayHit {
  kind: ShotImpactKind;
  dist: number;
  x: number;
  y: number;
  z: number;
  player: PlayerState | null;
}

function rayWallHit(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): ShotRayHit | null {
  const half = SHOTS_FIRED_ARENA_HALF;
  const wallH = SHOTS_FIRED_WALL_HEIGHT;
  let best: ShotRayHit | null = null;

  const planes = [
    { axis: 'x' as const, pos: -half },
    { axis: 'x' as const, pos: half },
    { axis: 'z' as const, pos: -half },
    { axis: 'z' as const, pos: half },
  ];

  for (const plane of planes) {
    const denom = plane.axis === 'x' ? dx : dz;
    if (Math.abs(denom) < 1e-6) continue;
    const orig = plane.axis === 'x' ? ox : oz;
    const t = (plane.pos - orig) / denom;
    if (t < 0.01 || t > maxDist) continue;

    const hx = ox + dx * t;
    const hy = oy + dy * t;
    const hz = oz + dz * t;
    if (hy < 0.05 || hy > wallH) continue;

    if (plane.axis === 'x') {
      if (Math.abs(hz) > half + 0.01) continue;
    } else if (Math.abs(hx) > half + 0.01) {
      continue;
    }

    if (!best || t < best.dist) {
      best = { kind: 'wall', dist: t, x: hx, y: hy, z: hz, player: null };
    }
  }

  return best;
}

/** Nearest ray hit against the axis-aligned box props (treated as walls). */
function rayBoxHit(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): ShotRayHit | null {
  let best: ShotRayHit | null = null;

  for (const box of SHOTS_FIRED_BOXES) {
    const minX = box.x - box.hw;
    const maxX = box.x + box.hw;
    const minZ = box.z - box.hd;
    const maxZ = box.z + box.hd;

    let tMin = 0.01;
    let tMax = maxDist;
    const slab = (o: number, d: number, lo: number, hi: number): boolean => {
      if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tMin) tMin = t1;
      if (t2 < tMax) tMax = t2;
      return tMin <= tMax;
    };

    if (!slab(ox, dx, minX, maxX)) continue;
    if (!slab(oy, dy, 0, box.h)) continue;
    if (!slab(oz, dz, minZ, maxZ)) continue;

    const t = tMin;
    if (t < 0.01 || t > maxDist) continue;
    if (!best || t < best.dist) {
      best = {
        kind: 'wall',
        dist: t,
        x: ox + dx * t,
        y: oy + dy * t,
        z: oz + dz * t,
        player: null,
      };
    }
  }

  return best;
}

function findShotHit(
  room: ShotsFiredRoom,
  shooter: PlayerState,
  eye: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  now: number,
): ShotRayHit | null {
  let best: ShotRayHit | null = rayWallHit(
    eye.x,
    eye.y,
    eye.z,
    dir.x,
    dir.y,
    dir.z,
    SHOTS_FIRED_MAX_RANGE,
  );

  const boxHit = rayBoxHit(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, SHOTS_FIRED_MAX_RANGE);
  if (boxHit && (!best || boxHit.dist < best.dist)) best = boxHit;

  for (const target of room.players.values()) {
    if (target.id === shooter.id || target.eliminated || now < target.invulnUntil) continue;

    const t = rayVerticalCapsuleHitDistance(
      eye.x,
      eye.y,
      eye.z,
      dir.x,
      dir.y,
      dir.z,
      target.px,
      target.pz,
      SHOTS_FIRED_HITBOX_BOTTOM_Y + target.py,
      SHOTS_FIRED_HITBOX_TOP_Y + target.py,
      SHOTS_FIRED_HIT_RADIUS,
      SHOTS_FIRED_MAX_RANGE,
    );
    if (t === null) continue;

    if (!best || t < best.dist) {
      best = {
        kind: 'player',
        dist: t,
        x: eye.x + dir.x * t,
        y: eye.y + dir.y * t,
        z: eye.z + dir.z * t,
        player: target,
      };
    }
  }

  return best;
}

function addShotImpact(room: ShotsFiredRoom, hit: ShotRayHit): void {
  room.shotImpacts.push({
    id: `impact-${room.nextImpactId++}`,
    x: hit.x,
    y: hit.y,
    z: hit.z,
    kind: hit.kind,
    spawnedAt: room.gameTime,
  });
}

export function initShotsFired(room: ShotsFiredRoom): void {
  room.shotsFiredInputs.clear();
  room.shotTracers = [];
  room.shotImpacts = [];
  room.nextTracerId = 1;
  room.nextImpactId = 1;
  room.lastFireAt.clear();
  room.lastMeleeAt.clear();
  if (!room.jumpVel) room.jumpVel = new Map();
  room.jumpVel.clear();

  const players = [...room.players.values()];
  players.forEach((player, index) => {
    const spawn = getPlayerSpawnPosition(index, players.length);
    player.px = spawn.x;
    player.pz = spawn.z;
    player.py = 0;
    player.yaw = (index / Math.max(players.length, 1)) * Math.PI * 2 + Math.PI;
    player.pitch = 0;
    player.score = 0;
    player.lives = SHOTS_FIRED_MAX_HITS;
    player.bullets = SHOTS_FIRED_BULLETS;
    player.eliminated = false;
    player.invulnUntil = 0;
    room.shotsFiredInputs.set(player.id, { ...ZERO_INPUT });
  });
}

function applyStickInput(player: PlayerState, input: CoinStickInput, dtMs: number): void {
  const dt = dtMs / 1000;
  const yaw = player.yaw;

  const forwardX = -Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = Math.sin(yaw);

  const speed = SHOTS_FIRED_MOVE_SPEED * dt;
  const fwd = input.moveY * speed;
  const str = -input.moveX * speed;
  const feetY = player.py;

  const tryX = clampToArena(player.px + forwardX * fwd + rightX * str, player.pz).x;
  if (!isBlockedByBox(tryX, player.pz, feetY)) player.px = tryX;

  const tryZ = clampToArena(player.px, player.pz + forwardZ * fwd + rightZ * str).z;
  if (!isBlockedByBox(player.px, tryZ, feetY)) player.pz = tryZ;

  player.yaw += input.lookX * SHOTS_FIRED_LOOK_SPEED * dt;
  player.pitch = Math.max(
    -SHOTS_FIRED_MAX_PITCH,
    Math.min(SHOTS_FIRED_MAX_PITCH, player.pitch - input.lookY * SHOTS_FIRED_PITCH_SPEED * dt),
  );
}

function pruneTracers(room: ShotsFiredRoom): void {
  room.shotTracers = room.shotTracers.filter(
    (t) => room.gameTime - t.spawnedAt < SHOTS_FIRED_TRACER_DURATION_MS,
  );
  room.shotImpacts = room.shotImpacts.filter(
    (i) => room.gameTime - i.spawnedAt < SHOTS_FIRED_IMPACT_DURATION_MS,
  );
}

function checkShotsFiredWinner(room: ShotsFiredRoom): void {
  const alive = [...room.players.values()].filter((p) => !p.eliminated);

  if (room.players.size === 1) {
    if (alive.length === 0) {
      room.phase = 'winner';
      room.winnerId = null;
    }
    return;
  }

  if (alive.length === 1) {
    room.phase = 'winner';
    room.winnerId = alive[0]!.id;
  } else if (alive.length === 0) {
    room.phase = 'winner';
    room.winnerId = null;
  }
}

function applyHit(room: ShotsFiredRoom, shooter: PlayerState, target: PlayerState, now: number): void {
  if (target.eliminated || now < target.invulnUntil) return;

  target.lives -= 1;
  target.invulnUntil = now + SHOTS_FIRED_HIT_INVULN_MS;

  if (target.lives <= 0) {
    target.eliminated = true;
    target.py = 0;
    shooter.score += 1;
  }
}

function findMeleeTarget(
  room: ShotsFiredRoom,
  attacker: PlayerState,
  now: number,
): PlayerState | null {
  const forwardX = -Math.sin(attacker.yaw);
  const forwardZ = Math.cos(attacker.yaw);
  const minDot = Math.cos(SHOTS_FIRED_MELEE_CONE);
  let best: PlayerState | null = null;
  let bestDist = Infinity;

  for (const target of room.players.values()) {
    if (target.id === attacker.id || target.eliminated || now < target.invulnUntil) continue;

    const dx = target.px - attacker.px;
    const dz = target.pz - attacker.pz;
    const dist = Math.hypot(dx, dz);
    if (dist > SHOTS_FIRED_MELEE_RANGE) continue;

    const dot = (dx * forwardX + dz * forwardZ) / (dist || 1);
    if (dot < minDot) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }

  return best;
}

export function fireShotsFiredShot(room: ShotsFiredRoom, playerId: string, now: number): boolean {
  if (room.phase !== 'playing') return false;

  const shooter = room.players.get(playerId);
  if (!shooter || shooter.eliminated || shooter.bullets <= 0) return false;

  const lastFire = room.lastFireAt.get(playerId) ?? 0;
  if (room.gameTime - lastFire < SHOTS_FIRED_FIRE_COOLDOWN_MS) return false;

  shooter.bullets -= 1;
  room.lastFireAt.set(playerId, room.gameTime);

  const eye = getEyePosition(shooter.px, shooter.pz, shooter.yaw);
  eye.y += shooter.py;
  const dir = getLookDirection(shooter.yaw, shooter.pitch);

  const hit = findShotHit(room, shooter, eye, dir, now);
  const travel = hit?.dist ?? SHOTS_FIRED_MAX_RANGE;

  room.shotTracers.push({
    id: `tracer-${room.nextTracerId++}`,
    shooterId: playerId,
    ox: eye.x,
    oy: eye.y,
    oz: eye.z,
    dx: dir.x,
    dy: dir.y,
    dz: dir.z,
    length: travel,
    spawnedAt: room.gameTime,
  });

  if (hit) {
    addShotImpact(room, hit);
    if (hit.kind === 'player' && hit.player) {
      applyHit(room, shooter, hit.player, now);
      checkShotsFiredWinner(room);
    }
  }

  return true;
}

export function jumpShotsFired(room: ShotsFiredRoom, playerId: string): boolean {
  if (room.phase !== 'playing') return false;

  const player = room.players.get(playerId);
  if (!player || player.eliminated) return false;

  const ground = supportHeightAt(player.px, player.pz, player.py);
  const grounded = (room.jumpVel.get(playerId) ?? 0) === 0 && player.py <= ground + 0.05;
  if (!grounded) return false;

  room.jumpVel.set(playerId, SHOTS_FIRED_JUMP_SPEED);
  return true;
}

export function meleeShotsFiredAttack(room: ShotsFiredRoom, playerId: string, now: number): boolean {
  if (room.phase !== 'playing') return false;

  const attacker = room.players.get(playerId);
  if (!attacker || attacker.eliminated) return false;

  const lastMelee = room.lastMeleeAt.get(playerId) ?? 0;
  if (room.gameTime - lastMelee < SHOTS_FIRED_MELEE_COOLDOWN_MS) return false;

  room.lastMeleeAt.set(playerId, room.gameTime);

  const target = findMeleeTarget(room, attacker, now);
  if (target) {
    applyHit(room, attacker, target, now);
    checkShotsFiredWinner(room);
  }

  return true;
}

export function setShotsFiredInput(room: ShotsFiredRoom, playerId: string, input: CoinStickInput): boolean {
  if (!room.players.has(playerId)) return false;
  room.shotsFiredInputs.set(playerId, normalizeCoinInput(input));
  return true;
}

export function tickShotsFired(room: ShotsFiredRoom, dt: number, now: number): void {
  room.gameTime += dt;
  pruneTracers(room);

  for (const player of room.players.values()) {
    if (player.eliminated) {
      player.py = Math.min(
        player.py + SHOTS_FIRED_DEATH_FLOAT_SPEED * (dt / 1000),
        SHOTS_FIRED_DEATH_FLOAT_MAX,
      );
      continue;
    }

    const input = room.shotsFiredInputs.get(player.id) ?? ZERO_INPUT;
    applyStickInput(player, input, dt);

    const ground = supportHeightAt(player.px, player.pz, player.py);
    const vel = room.jumpVel.get(player.id) ?? 0;
    if (vel !== 0 || player.py > ground + 1e-4) {
      const dtSec = dt / 1000;
      const nextVel = vel - SHOTS_FIRED_GRAVITY * dtSec;
      const nextY = player.py + nextVel * dtSec;
      if (nextVel <= 0 && nextY <= ground) {
        player.py = ground;
        room.jumpVel.set(player.id, 0);
      } else {
        player.py = nextY;
        room.jumpVel.set(player.id, nextVel);
      }
    } else if (player.py < ground) {
      player.py = ground;
    }
  }

  checkShotsFiredWinner(room);
}

export function angleToTarget(px: number, pz: number, tx: number, tz: number): number {
  const dx = tx - px;
  const dz = tz - pz;
  return Math.atan2(-dx, dz);
}

export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function nearestEnemy(
  bot: PlayerState,
  players: Iterable<PlayerState>,
): PlayerState | null {
  let best: PlayerState | null = null;
  let bestDist = Infinity;
  for (const player of players) {
    if (player.id === bot.id || player.eliminated) continue;
    const dist = Math.hypot(player.px - bot.px, player.pz - bot.pz);
    if (dist < bestDist) {
      bestDist = dist;
      best = player;
    }
  }
  return best;
}
