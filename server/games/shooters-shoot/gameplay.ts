import type { CoinStickInput, LobbySettings, PlayerState, ShotImpactKind, ShotImpactState, ShotTracerState } from '../../../shared/types.js';
import {
  normalizeShootersShootSettings,
  shootersShootRespawns,
  shootersShootTimeLimitMs,
} from '../../../shared/games/shooters-shoot/lobby.js';
import {
  equippedGun,
  isShooterGunId,
  playerGunIndex,
  playerGuns,
  shooterGun,
  type ShooterGunId,
} from '../../../shared/games/shooters-shoot/guns.js';
import {
  SHOOTERS_SHOOT_ARENA_HALF,
  SHOOTERS_SHOOT_BOXES,
  SHOOTERS_SHOOT_DOMES,
  SHOOTERS_SHOOT_DEATH_FLOAT_MAX,
  SHOOTERS_SHOOT_DEATH_FLOAT_SPEED,
  SHOOTERS_SHOOT_AIR_PUSH,
  SHOOTERS_SHOOT_AIR_PUSH_CAP,
  SHOOTERS_SHOOT_AIR_STEER,
  SHOOTERS_SHOOT_CROUCH_EYE_DROP,
  SHOOTERS_SHOOT_CROUCH_MULT,
  SHOOTERS_SHOOT_GRAVITY,
  SHOOTERS_SHOOT_GROUND_ACCEL,
  SHOOTERS_SHOOT_GROUND_FRICTION,
  SHOOTERS_SHOOT_HIT_INVULN_MS,
  SHOOTERS_SHOOT_HIT_RADIUS,
  SHOOTERS_SHOOT_HITBOX_BOTTOM_Y,
  SHOOTERS_SHOOT_HITBOX_TOP_Y,
  SHOOTERS_SHOOT_IMPACT_DURATION_MS,
  SHOOTERS_SHOOT_JUMP_SPEED,
  SHOOTERS_SHOOT_LOOK_SPEED,
  SHOOTERS_SHOOT_MAX_HITS,
  SHOOTERS_SHOOT_MAX_PITCH,
  SHOOTERS_SHOOT_MAX_RANGE,
  SHOOTERS_SHOOT_MELEE_CONE,
  SHOOTERS_SHOOT_MELEE_COOLDOWN_MS,
  SHOOTERS_SHOOT_MELEE_RANGE,
  SHOOTERS_SHOOT_MOVE_SPEED,
  SHOOTERS_SHOOT_PITCH_SPEED,
  SHOOTERS_SHOOT_PLAYER_RADIUS,
  SHOOTERS_SHOOT_RESPAWN_MS,
  SHOOTERS_SHOOT_SPRINT_MULT,
  SHOOTERS_SHOOT_TRACER_DURATION_MS,
  SHOOTERS_SHOOT_WALL_HEIGHT,
} from '../../../shared/games/shooters-shoot/constants.js';
import {
  boxTop,
  domeHeightAt,
  shootersTerrainHeight,
} from '../../../shared/games/shooters-shoot/map.js';
import { normalizeCoinInput } from '../coin-rush/gameplay.js';
import { getEyePosition, getLookDirection } from '../../../shared/games/shooters-shoot/kinematics.js';

export { getEyePosition, getLookDirection };

export interface ShootersShootRoom {
  phase: string;
  players: Map<string, PlayerState>;
  lobbySettings: LobbySettings;
  winnerId: string | null;
  gameTime: number;
  shootersShootInputs: Map<string, CoinStickInput>;
  shotTracers: ShotTracerState[];
  shotImpacts: ShotImpactState[];
  nextTracerId: number;
  nextImpactId: number;
  lastFireAt: Map<string, number>;
  lastMeleeAt: Map<string, number>;
  jumpVel: Map<string, number>;
  moveVel?: Map<string, { x: number; z: number }>;
}

const ZERO_INPUT: CoinStickInput = { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };

function clampToArena(x: number, z: number): { x: number; z: number } {
  const limit = SHOOTERS_SHOOT_ARENA_HALF - 1;
  return {
    x: Math.max(-limit, Math.min(limit, x)),
    z: Math.max(-limit, Math.min(limit, z)),
  };
}

/** Tolerance so a player resting exactly on a box top isn't treated as blocked. */
const BOX_TOP_EPSILON = 0.15;
const STEP_UP = 0.72;

function overlapsBox(x: number, z: number, box: (typeof SHOOTERS_SHOOT_BOXES)[number], extra = 0): boolean {
  return (
    Math.abs(x - box.x) < box.hw + SHOOTERS_SHOOT_PLAYER_RADIUS + extra &&
    Math.abs(z - box.z) < box.hd + SHOOTERS_SHOOT_PLAYER_RADIUS + extra
  );
}

/**
 * True if a player cylinder at (x,z) whose feet are at feetY would intersect a
 * box's solid volume. Standing on (feet at/above the top) is not a collision.
 */
function isBlockedByBox(x: number, z: number, feetY: number): boolean {
  for (const box of SHOOTERS_SHOOT_BOXES) {
    if (feetY >= boxTop(box) - BOX_TOP_EPSILON) continue;
    if (feetY + 1.6 < box.y) continue;
    if (overlapsBox(x, z, box)) return true;
  }
  return false;
}

function stepUpHeight(x: number, z: number, feetY: number): number | null {
  let best: number | null = null;
  for (const box of SHOOTERS_SHOOT_BOXES) {
    const top = boxTop(box);
    if (top <= feetY + 0.02 || top > feetY + STEP_UP) continue;
    if (!overlapsBox(x, z, box)) continue;
    if (best == null || top > best) best = top;
  }
  return best;
}

/** Height of the surface directly under the player. */
function supportHeightAt(x: number, z: number, feetY: number): number {
  let ground = shootersTerrainHeight(x, z);
  for (const box of SHOOTERS_SHOOT_BOXES) {
    const top = boxTop(box);
    if (feetY < top - 0.05) continue;
    if (overlapsBox(x, z, box) && top > ground) ground = top;
  }
  for (const dome of SHOOTERS_SHOOT_DOMES) {
    const height = domeHeightAt(dome, x, z);
    if (height != null && height > ground) ground = height;
  }
  return ground;
}

function overlapsAnyBox(x: number, z: number, margin: number): boolean {
  for (const box of SHOOTERS_SHOOT_BOXES) {
    if (overlapsBox(x, z, box, margin)) return true;
  }
  return false;
}

function getPlayerSpawnPosition(index: number, playerCount: number): { x: number; z: number; y: number } {
  const angle = (index / Math.max(playerCount, 1)) * Math.PI * 2;
  const baseRadius = 20 + (index % 3);
  const limit = SHOOTERS_SHOOT_ARENA_HALF - 2;
  for (let step = 0; step < 16; step++) {
    const radius = Math.min(baseRadius + step * 0.8, limit);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (!overlapsAnyBox(x, z, 0.8)) {
      return { x, z, y: supportHeightAt(x, z, 40) };
    }
  }
  const x = Math.sin(angle) * baseRadius;
  const z = Math.cos(angle) * baseRadius;
  return { x, z, y: supportHeightAt(x, z, 40) };
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
  const half = SHOOTERS_SHOOT_ARENA_HALF;
  const wallH = SHOOTERS_SHOOT_WALL_HEIGHT;
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
    if (hy < -3 || hy > wallH) continue;

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

  for (const box of SHOOTERS_SHOOT_BOXES) {
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
    if (!slab(oy, dy, box.y, boxTop(box))) continue;
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

function rayDomeHit(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): ShotRayHit | null {
  let best: ShotRayHit | null = null;
  for (const dome of SHOOTERS_SHOOT_DOMES) {
    const t = raySphereHitDistance(ox, oy, oz, dx, dy, dz, dome.x, dome.y, dome.z, dome.r, maxDist);
    if (t == null) continue;
    const hy = oy + dy * t;
    if (hy < dome.y - 0.02) continue;
    if (!best || t < best.dist) {
      best = {
        kind: 'wall',
        dist: t,
        x: ox + dx * t,
        y: hy,
        z: oz + dz * t,
        player: null,
      };
    }
  }
  return best;
}

function rayTerrainHit(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): ShotRayHit | null {
  const steps = 48;
  let prevAbove = oy - shootersTerrainHeight(ox, oz);
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * maxDist;
    const x = ox + dx * t;
    const y = oy + dy * t;
    const z = oz + dz * t;
    const above = y - shootersTerrainHeight(x, z);
    if (prevAbove > 0 && above <= 0) {
      return { kind: 'wall', dist: t, x, y, z, player: null };
    }
    prevAbove = above;
  }
  return null;
}

function findShotHit(
  room: ShootersShootRoom,
  shooter: PlayerState,
  eye: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  now: number,
  range = SHOOTERS_SHOOT_MAX_RANGE,
): ShotRayHit | null {
  let best: ShotRayHit | null = rayWallHit(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, range);

  const boxHit = rayBoxHit(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, range);
  if (boxHit && (!best || boxHit.dist < best.dist)) best = boxHit;
  const domeHit = rayDomeHit(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, range);
  if (domeHit && (!best || domeHit.dist < best.dist)) best = domeHit;
  const groundHit = rayTerrainHit(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, range);
  if (groundHit && (!best || groundHit.dist < best.dist)) best = groundHit;

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
      SHOOTERS_SHOOT_HITBOX_BOTTOM_Y + target.py,
      (target.crouching
        ? SHOOTERS_SHOOT_HITBOX_TOP_Y - SHOOTERS_SHOOT_CROUCH_EYE_DROP
        : SHOOTERS_SHOOT_HITBOX_TOP_Y) + target.py,
      SHOOTERS_SHOOT_HIT_RADIUS,
      range,
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

function addShotImpact(room: ShootersShootRoom, hit: ShotRayHit): void {
  room.shotImpacts.push({
    id: `impact-${room.nextImpactId++}`,
    x: hit.x,
    y: hit.y,
    z: hit.z,
    kind: hit.kind,
    spawnedAt: room.gameTime,
  });
}

export function initShootersShoot(room: ShootersShootRoom): void {
  room.shootersShootInputs.clear();
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
    player.py = spawn.y;
    player.yaw = (index / Math.max(players.length, 1)) * Math.PI * 2 + Math.PI;
    player.pitch = 0;
    player.score = 0;
    player.deaths = 0;
    player.lives = SHOOTERS_SHOOT_MAX_HITS;
    armPlayerGuns(player);
    player.crouching = false;
    player.sprinting = false;
    player.eliminated = false;
    player.invulnUntil = 0;
    player.respawnAt = 0;
    room.shootersShootInputs.set(player.id, { ...ZERO_INPUT });
  });
  room.moveVel?.clear();
}

function horizontalVelocity(room: ShootersShootRoom, playerId: string): { x: number; z: number } {
  if (!room.moveVel) room.moveVel = new Map();
  let vel = room.moveVel.get(playerId);
  if (!vel) {
    vel = { x: 0, z: 0 };
    room.moveVel.set(playerId, vel);
  }
  return vel;
}

function playerIsGrounded(room: ShootersShootRoom, player: PlayerState): boolean {
  const ground = supportHeightAt(player.px, player.pz, player.py);
  const vertical = room.jumpVel.get(player.id) ?? 0;
  return vertical === 0 && player.py <= ground + 0.05;
}

function applyStickInput(room: ShootersShootRoom, player: PlayerState, input: CoinStickInput, dtMs: number): void {
  const dt = dtMs / 1000;
  const yaw = player.yaw;
  const grounded = playerIsGrounded(room, player);
  const crouching = Boolean(input.crouch);
  const sprinting = Boolean(input.sprint) && !crouching && grounded && input.moveY > 0.2;
  player.crouching = crouching;
  player.sprinting = sprinting;

  const forwardX = -Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = Math.sin(yaw);

  const wishX = forwardX * input.moveY + rightX * -input.moveX;
  const wishZ = forwardZ * input.moveY + rightZ * -input.moveX;
  const wishMag = Math.hypot(wishX, wishZ);
  const wishNX = wishMag > 1e-5 ? wishX / wishMag : 0;
  const wishNZ = wishMag > 1e-5 ? wishZ / wishMag : 0;

  let maxSpeed = SHOOTERS_SHOOT_MOVE_SPEED;
  if (crouching && grounded) maxSpeed *= SHOOTERS_SHOOT_CROUCH_MULT;
  else if (sprinting) maxSpeed *= SHOOTERS_SHOOT_SPRINT_MULT;
  const wishSpeed = maxSpeed * Math.min(1, wishMag);

  const vel = horizontalVelocity(room, player.id);

  if (grounded) {
    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0) {
      const drop = speed * SHOOTERS_SHOOT_GROUND_FRICTION * dt;
      const next = Math.max(0, speed - drop);
      const scale = next / speed;
      vel.x *= scale;
      vel.z *= scale;
    }
    const along = vel.x * wishNX + vel.z * wishNZ;
    const add = Math.min(SHOOTERS_SHOOT_GROUND_ACCEL * dt, Math.max(0, wishSpeed - along));
    vel.x += wishNX * add;
    vel.z += wishNZ * add;
    const sped = Math.hypot(vel.x, vel.z);
    if (sped > maxSpeed) {
      const bleed = sped + (maxSpeed - sped) * Math.min(1, 8 * dt);
      const scale = bleed / sped;
      vel.x *= scale;
      vel.z *= scale;
    }
  } else if (wishMag > 0.05) {
    const speed = Math.hypot(vel.x, vel.z);
    if (speed < 0.2) {
      vel.x += wishNX * SHOOTERS_SHOOT_AIR_PUSH * dt;
      vel.z += wishNZ * SHOOTERS_SHOOT_AIR_PUSH * dt;
      const pushed = Math.hypot(vel.x, vel.z);
      if (pushed > SHOOTERS_SHOOT_AIR_PUSH_CAP) {
        vel.x *= SHOOTERS_SHOOT_AIR_PUSH_CAP / pushed;
        vel.z *= SHOOTERS_SHOOT_AIR_PUSH_CAP / pushed;
      }
    } else {
      const steer = 1 - Math.exp(-SHOOTERS_SHOOT_AIR_STEER * dt);
      const dirX = vel.x / speed;
      const dirZ = vel.z / speed;
      const newDirX = dirX + (wishNX - dirX) * steer;
      const newDirZ = dirZ + (wishNZ - dirZ) * steer;
      const newLen = Math.hypot(newDirX, newDirZ) || 1;
      vel.x = (newDirX / newLen) * speed;
      vel.z = (newDirZ / newLen) * speed;
    }
  }

  const feetY = player.py;
  const tryX = clampToArena(player.px + vel.x * dt, player.pz).x;
  if (!isBlockedByBox(tryX, player.pz, feetY)) player.px = tryX;
  else {
    const step = stepUpHeight(tryX, player.pz, feetY);
    if (step != null && !isBlockedByBox(tryX, player.pz, step)) {
      player.px = tryX;
      player.py = step;
    } else vel.x = 0;
  }

  const tryZ = clampToArena(player.px, player.pz + vel.z * dt).z;
  if (!isBlockedByBox(player.px, tryZ, player.py)) player.pz = tryZ;
  else {
    const step = stepUpHeight(player.px, tryZ, player.py);
    if (step != null && !isBlockedByBox(player.px, tryZ, step)) {
      player.pz = tryZ;
      player.py = step;
    } else vel.z = 0;
  }

  const lookX = input.lookX + (input.lookDX ?? 0);
  const lookY = input.lookY + (input.lookDY ?? 0);
  player.yaw += lookX * SHOOTERS_SHOOT_LOOK_SPEED * dt;
  player.pitch = Math.max(
    -SHOOTERS_SHOOT_MAX_PITCH,
    Math.min(SHOOTERS_SHOOT_MAX_PITCH, player.pitch - lookY * SHOOTERS_SHOOT_PITCH_SPEED * dt),
  );
  input.lookDX = 0;
  input.lookDY = 0;
}

function pruneTracers(room: ShootersShootRoom): void {
  room.shotTracers = room.shotTracers.filter(
    (t) => room.gameTime - t.spawnedAt < SHOOTERS_SHOOT_TRACER_DURATION_MS,
  );
  room.shotImpacts = room.shotImpacts.filter(
    (i) => room.gameTime - i.spawnedAt < SHOOTERS_SHOOT_IMPACT_DURATION_MS,
  );
}

function matchSettings(room: ShootersShootRoom) {
  return normalizeShootersShootSettings(room.lobbySettings?.shootersShoot);
}

function endMatch(room: ShootersShootRoom, winnerId: string | null): void {
  room.phase = 'winner';
  room.winnerId = winnerId;
}

function leaderId(room: ShootersShootRoom): string | null {
  const ranked = [...room.players.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const top = ranked[0];
  if (!top) return null;
  const tied = ranked.filter((player) => player.score === top.score);
  return tied.length === 1 ? top.id : null;
}

export function checkShootersShootWinner(room: ShootersShootRoom): void {
  if (room.phase === 'winner') return;

  const settings = matchSettings(room);
  if (settings.winMode === 'kills') {
    const reached = [...room.players.values()]
      .filter((player) => player.score >= settings.killsToWin)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    if (reached[0]) endMatch(room, reached[0].id);
    return;
  }

  const timeLimit = shootersShootTimeLimitMs(settings);
  if (timeLimit != null && room.gameTime >= timeLimit) {
    endMatch(room, leaderId(room));
    return;
  }

  if (shootersShootRespawns(settings)) return;

  const alive = [...room.players.values()].filter((player) => !player.eliminated);

  if (room.players.size === 1) {
    if (alive.length === 0) endMatch(room, null);
    return;
  }

  if (alive.length === 1) endMatch(room, alive[0]!.id);
  else if (alive.length === 0) endMatch(room, null);
}

function armPlayerGuns(player: PlayerState): void {
  const guns = playerGuns(player);
  player.guns = guns;
  const index = playerGunIndex(player);
  player.gunIndex = index;
  const equipped = shooterGun(guns[index]);
  const stowed = shooterGun(guns[index === 0 ? 1 : 0]);
  player.bullets = equipped.magSize;
  player.ammoReserve = equipped.reserve;
  player.stowedBullets = stowed.magSize;
  player.stowedReserve = stowed.reserve;
  player.reloadUntil = 0;
}

function spreadDirection(
  dir: { x: number; y: number; z: number },
  spread: number,
): { x: number; y: number; z: number } {
  if (spread <= 0) return dir;
  const yaw = (Math.random() - 0.5) * 2 * spread;
  const pitch = (Math.random() - 0.5) * 2 * spread;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const x = dir.x * cosYaw - dir.z * sinYaw;
  const z = dir.x * sinYaw + dir.z * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const y = dir.y * cosPitch + z * sinPitch;
  const z2 = z * cosPitch - dir.y * sinPitch;
  const length = Math.hypot(x, y, z2) || 1;
  return { x: x / length, y: y / length, z: z2 / length };
}

function exchangeCarriedAmmo(player: PlayerState): void {
  const bullets = player.bullets;
  const reserve = player.ammoReserve ?? 0;
  player.bullets = player.stowedBullets ?? 0;
  player.ammoReserve = player.stowedReserve ?? 0;
  player.stowedBullets = bullets;
  player.stowedReserve = reserve;
}

function applyHit(room: ShootersShootRoom, shooter: PlayerState, target: PlayerState, now: number, damage = 1): void {
  if (target.eliminated || now < target.invulnUntil) return;

  target.lives -= damage;
  target.invulnUntil = now + SHOOTERS_SHOOT_HIT_INVULN_MS;

  if (target.lives <= 0) {
    target.lives = 0;
    target.eliminated = true;
    target.py = 0;
    target.deaths = (target.deaths ?? 0) + 1;
    shooter.score += 1;
    const settings = matchSettings(room);
    target.respawnAt = shootersShootRespawns(settings) ? room.gameTime + SHOOTERS_SHOOT_RESPAWN_MS : 0;
  }
}

function findMeleeTarget(
  room: ShootersShootRoom,
  attacker: PlayerState,
  now: number,
): PlayerState | null {
  const forwardX = -Math.sin(attacker.yaw);
  const forwardZ = Math.cos(attacker.yaw);
  const minDot = Math.cos(SHOOTERS_SHOOT_MELEE_CONE);
  let best: PlayerState | null = null;
  let bestDist = Infinity;

  for (const target of room.players.values()) {
    if (target.id === attacker.id || target.eliminated || now < target.invulnUntil) continue;

    const dx = target.px - attacker.px;
    const dz = target.pz - attacker.pz;
    const dist = Math.hypot(dx, dz);
    if (dist > SHOOTERS_SHOOT_MELEE_RANGE) continue;

    const dot = (dx * forwardX + dz * forwardZ) / (dist || 1);
    if (dot < minDot) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }

  return best;
}

export function fireShootersShootShot(room: ShootersShootRoom, playerId: string, now: number): boolean {
  if (room.phase !== 'playing') return false;

  const shooter = room.players.get(playerId);
  if (!shooter || shooter.eliminated) return false;
  if (!shooter.guns) armPlayerGuns(shooter);

  const gun = equippedGun(shooter);
  if ((shooter.reloadUntil ?? 0) > room.gameTime) return false;
  if (shooter.bullets <= 0) return false;

  const lastFire = room.lastFireAt.get(playerId) ?? 0;
  if (room.gameTime - lastFire < gun.fireMs) return false;

  shooter.bullets -= 1;
  room.lastFireAt.set(playerId, room.gameTime);

  const eye = getEyePosition(shooter.px, shooter.pz, shooter.yaw, shooter.py, Boolean(shooter.crouching));
  const aim = getLookDirection(shooter.yaw, shooter.pitch);
  const damageByPlayer = new Map<string, { player: PlayerState; damage: number }>();

  for (let pellet = 0; pellet < gun.pellets; pellet++) {
    const dir = spreadDirection(aim, gun.spread);
    const hit = findShotHit(room, shooter, eye, dir, now, gun.range);
    const travel = hit?.dist ?? gun.range;

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
      gunId: gun.id,
    });

    if (!hit) continue;
    addShotImpact(room, hit);
    if (hit.kind === 'player' && hit.player) {
      const prev = damageByPlayer.get(hit.player.id);
      if (prev) prev.damage += gun.damage;
      else damageByPlayer.set(hit.player.id, { player: hit.player, damage: gun.damage });
    }
  }

  for (const hit of damageByPlayer.values()) {
    applyHit(room, shooter, hit.player, now, hit.damage);
  }
  if (damageByPlayer.size > 0) checkShootersShootWinner(room);

  return true;
}

export function reloadShootersShoot(room: ShootersShootRoom, playerId: string): boolean {
  if (room.phase !== 'playing') return false;

  const player = room.players.get(playerId);
  if (!player || player.eliminated) return false;
  if (!player.guns) armPlayerGuns(player);
  const gun = equippedGun(player);
  if ((player.reloadUntil ?? 0) > room.gameTime) return false;
  if (player.bullets >= gun.magSize) return false;
  if ((player.ammoReserve ?? 0) <= 0) return false;

  player.reloadUntil = room.gameTime + gun.reloadMs;
  return true;
}

function finishReload(player: PlayerState): void {
  const need = equippedGun(player).magSize - player.bullets;
  const reserve = player.ammoReserve ?? 0;
  const take = Math.min(Math.max(0, need), reserve);
  player.bullets += take;
  player.ammoReserve = reserve - take;
  player.reloadUntil = 0;
}

export function jumpShootersShoot(room: ShootersShootRoom, playerId: string): boolean {
  if (room.phase !== 'playing') return false;

  const player = room.players.get(playerId);
  if (!player || player.eliminated) return false;

  const ground = supportHeightAt(player.px, player.pz, player.py);
  const grounded = (room.jumpVel.get(playerId) ?? 0) === 0 && player.py <= ground + 0.05;
  if (!grounded) return false;

  room.jumpVel.set(playerId, SHOOTERS_SHOOT_JUMP_SPEED);
  player.vy = SHOOTERS_SHOOT_JUMP_SPEED;
  return true;
}

export function meleeShootersShootAttack(room: ShootersShootRoom, playerId: string, now: number): boolean {
  if (room.phase !== 'playing') return false;

  const attacker = room.players.get(playerId);
  if (!attacker || attacker.eliminated) return false;

  const lastMelee = room.lastMeleeAt.get(playerId) ?? 0;
  if (room.gameTime - lastMelee < SHOOTERS_SHOOT_MELEE_COOLDOWN_MS) return false;

  room.lastMeleeAt.set(playerId, room.gameTime);

  const target = findMeleeTarget(room, attacker, now);
  if (target) {
    applyHit(room, attacker, target, now);
    checkShootersShootWinner(room);
  }

  return true;
}

export function swapShootersShootGun(room: ShootersShootRoom, playerId: string): boolean {
  if (room.phase !== 'playing' && room.phase !== 'countdown') return false;
  const player = room.players.get(playerId);
  if (!player || player.eliminated) return false;
  if (!player.guns) armPlayerGuns(player);

  player.reloadUntil = 0;
  exchangeCarriedAmmo(player);
  player.gunIndex = playerGunIndex(player) === 0 ? 1 : 0;
  return true;
}

export function setShootersShootGun(
  room: ShootersShootRoom,
  playerId: string,
  slot: 0 | 1,
  gunId: ShooterGunId,
): boolean {
  const player = room.players.get(playerId);
  if (!player || !isShooterGunId(gunId)) return false;
  if (!player.guns) armPlayerGuns(player);

  const guns = playerGuns(player);
  if (guns[slot] === gunId) return false;
  const other = slot === 0 ? 1 : 0;
  const equipped = playerGunIndex(player);

  if (guns[other] === gunId) {
    player.guns = [guns[1], guns[0]];
    exchangeCarriedAmmo(player);
    player.reloadUntil = 0;
    return true;
  }

  player.guns = slot === 0 ? [gunId, guns[1]] : [guns[0], gunId];
  const gun = shooterGun(gunId);
  if (equipped === slot) {
    player.bullets = gun.magSize;
    player.ammoReserve = gun.reserve;
    player.reloadUntil = 0;
  } else {
    player.stowedBullets = gun.magSize;
    player.stowedReserve = gun.reserve;
  }
  return true;
}

function clampLookDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-40, Math.min(40, value));
}

/** Place a player who joined after the match had already started. */
export function spawnShootersShootPlayer(room: ShootersShootRoom, player: PlayerState): void {
  const players = [...room.players.values()];
  const index = Math.max(0, players.findIndex((p) => p.id === player.id));
  const spawn = getPlayerSpawnPosition(index, players.length);
  player.px = spawn.x;
  player.pz = spawn.z;
  player.py = spawn.y;
  player.yaw = (index / Math.max(players.length, 1)) * Math.PI * 2 + Math.PI;
  player.pitch = 0;
  player.score = 0;
  player.deaths = 0;
  player.lives = SHOOTERS_SHOOT_MAX_HITS;
  armPlayerGuns(player);
  player.crouching = false;
  player.sprinting = false;
  player.eliminated = false;
  player.respawnAt = 0;
  player.invulnUntil = Date.now() + 1500;
  player.landscapeReady = true;
  if (!room.jumpVel) room.jumpVel = new Map();
  room.jumpVel.set(player.id, 0);
  player.vy = 0;
  room.shootersShootInputs.set(player.id, { ...ZERO_INPUT });
}

export function setShootersShootInput(room: ShootersShootRoom, playerId: string, input: CoinStickInput): boolean {
  if (!room.players.has(playerId)) return false;
  const prev = room.shootersShootInputs.get(playerId);
  const next = normalizeCoinInput(input);
  const addX = clampLookDelta(input.lookDX ?? 0);
  const addY = clampLookDelta(input.lookDY ?? 0);
  next.lookDX = clampLookDelta((prev?.lookDX ?? 0) + addX);
  next.lookDY = clampLookDelta((prev?.lookDY ?? 0) + addY);
  next.sprint = input.sprint === true;
  next.crouch = input.crouch === true;
  room.shootersShootInputs.set(playerId, next);
  return true;
}

function reviveShootersShootPlayer(room: ShootersShootRoom, player: PlayerState, now: number): void {
  const players = [...room.players.values()];
  const index = Math.max(0, players.findIndex((entry) => entry.id === player.id));
  const spawn = getPlayerSpawnPosition(index + player.deaths, players.length);
  player.px = spawn.x;
  player.pz = spawn.z;
  player.py = spawn.y;
  player.yaw = (index / Math.max(players.length, 1)) * Math.PI * 2 + Math.PI;
  player.pitch = 0;
  player.lives = SHOOTERS_SHOOT_MAX_HITS;
  if (!player.guns) armPlayerGuns(player);
  else player.reloadUntil = 0;
  player.crouching = false;
  player.sprinting = false;
  player.eliminated = false;
  player.respawnAt = 0;
  player.invulnUntil = now + 1500;
  if (!room.jumpVel) room.jumpVel = new Map();
  room.jumpVel.set(player.id, 0);
  player.vy = 0;
  const vel = room.moveVel?.get(player.id);
  if (vel) {
    vel.x = 0;
    vel.z = 0;
  }
  room.shootersShootInputs.set(player.id, { ...ZERO_INPUT });
}

export function tickShootersShoot(room: ShootersShootRoom, dt: number, now: number): void {
  room.gameTime += dt;
  pruneTracers(room);
  if (room.phase === 'winner') return;

  const settings = matchSettings(room);
  const respawn = shootersShootRespawns(settings);

  for (const player of room.players.values()) {
    if (player.eliminated) {
      if (respawn && (player.respawnAt ?? 0) > 0 && room.gameTime >= player.respawnAt) {
        reviveShootersShootPlayer(room, player, now);
      } else {
        player.crouching = false;
        player.sprinting = false;
        player.reloadUntil = 0;
        const vel = room.moveVel?.get(player.id);
        if (vel) {
          vel.x = 0;
          vel.z = 0;
        }
        player.py = Math.min(
          player.py + SHOOTERS_SHOOT_DEATH_FLOAT_SPEED * (dt / 1000),
          SHOOTERS_SHOOT_DEATH_FLOAT_MAX,
        );
        player.vy = 0;
        continue;
      }
    }

    if ((player.reloadUntil ?? 0) > 0 && room.gameTime >= player.reloadUntil!) {
      finishReload(player);
    }

    const stored = room.shootersShootInputs.get(player.id);
    const input = stored ?? { ...ZERO_INPUT };
    applyStickInput(room, player, input, dt);

    const ground = supportHeightAt(player.px, player.pz, player.py);
    const vel = room.jumpVel.get(player.id) ?? 0;
    if (vel !== 0 || player.py > ground + 1e-4) {
      const dtSec = dt / 1000;
      const nextVel = vel - SHOOTERS_SHOOT_GRAVITY * dtSec;
      const nextY = player.py + nextVel * dtSec;
      if (nextVel <= 0 && nextY <= ground) {
        player.py = ground;
        room.jumpVel.set(player.id, 0);
        player.vy = 0;
      } else {
        player.py = nextY;
        room.jumpVel.set(player.id, nextVel);
        player.vy = nextVel;
      }
    } else if (player.py < ground) {
      player.py = ground;
      player.vy = 0;
    } else {
      player.vy = 0;
    }
  }

  checkShootersShootWinner(room);
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
