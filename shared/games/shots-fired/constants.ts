export {
  COIN_RUSH_ARENA_HALF as SHOTS_FIRED_ARENA_HALF,
  COIN_RUSH_MOVE_SPEED as SHOTS_FIRED_MOVE_SPEED,
  COIN_RUSH_LOOK_SPEED as SHOTS_FIRED_LOOK_SPEED,
  COIN_RUSH_PITCH_SPEED as SHOTS_FIRED_PITCH_SPEED,
  COIN_RUSH_MAX_PITCH as SHOTS_FIRED_MAX_PITCH,
  COIN_RUSH_PLAYER_HEIGHT as SHOTS_FIRED_PLAYER_HEIGHT,
  COIN_RUSH_EYE_FORWARD as SHOTS_FIRED_EYE_FORWARD,
  COIN_RUSH_STICK_DEADZONE as SHOTS_FIRED_STICK_DEADZONE,
} from '../coin-rush/constants.js';

/** Pistol magazine size per player */
export const SHOTS_FIRED_BULLETS = 12;

/** Hits before elimination (2 shots = dead) */
export const SHOTS_FIRED_MAX_HITS = 2;

/** Body hit capsule radius for raycast */
export const SHOTS_FIRED_HIT_RADIUS = 0.45;

/**
 * Vertical hit capsule spans knee height up to head level so a level shot
 * (eye height 1.6, e.g. bots that never pitch) still connects with the head cap.
 */
export const SHOTS_FIRED_HITBOX_BOTTOM_Y = 0.15;
export const SHOTS_FIRED_HITBOX_TOP_Y = 1.45;

/** Max raycast distance */
export const SHOTS_FIRED_MAX_RANGE = 40;

/** Minimum ms between shots */
export const SHOTS_FIRED_FIRE_COOLDOWN_MS = 380;

/** Melee reach (world units) */
export const SHOTS_FIRED_MELEE_RANGE = 2.8;

/** Melee half-angle cone (radians) — must face target */
export const SHOTS_FIRED_MELEE_CONE = 0.75;

/** Minimum ms between melee swings */
export const SHOTS_FIRED_MELEE_COOLDOWN_MS = 550;

/** Brief invulnerability after taking a hit */
export const SHOTS_FIRED_HIT_INVULN_MS = 350;

/** How long tracers stay visible in room state */
export const SHOTS_FIRED_TRACER_DURATION_MS = 180;

/** Metal spark flash duration at bullet impacts */
export const SHOTS_FIRED_IMPACT_DURATION_MS = 240;

/** Arena wall height for bullet collision */
export const SHOTS_FIRED_WALL_HEIGHT = 2.5;

/** Dead bodies float upward (units per second) */
export const SHOTS_FIRED_DEATH_FLOAT_SPEED = 1.4;

/** Max float height before stopping */
export const SHOTS_FIRED_DEATH_FLOAT_MAX = 14;

/** Initial upward velocity on jump (units per second) */
export const SHOTS_FIRED_JUMP_SPEED = 7.8;

/** Downward acceleration applied while airborne (units per second^2) */
export const SHOTS_FIRED_GRAVITY = 20;

/** Horizontal collision radius for a player against boxes/props */
export const SHOTS_FIRED_PLAYER_RADIUS = 0.5;

/** A solid box prop in the arena. (x,z) center, half extents hw/hd, height h. */
export interface ShotsFiredBox {
  x: number;
  z: number;
  hw: number;
  hd: number;
  h: number;
}

/**
 * Static box layout. Short crates (h ~1.1) can be jumped on top of
 * (jump apex ≈ 1.5); tall pillars (h 2.6) cannot. Positions avoid the
 * player spawn ring (radius ~4–6) and the arena center.
 */
export const SHOTS_FIRED_BOXES: readonly ShotsFiredBox[] = [
  { x: 0, z: 9.5, hw: 1.1, hd: 1.1, h: 2.6 },
  { x: 0, z: -9.5, hw: 1.1, hd: 1.1, h: 2.6 },
  { x: 9.5, z: 0, hw: 1.1, hd: 1.1, h: 2.6 },
  { x: -9.5, z: 0, hw: 1.1, hd: 1.1, h: 2.6 },
  { x: 6, z: 6, hw: 1.2, hd: 1.2, h: 1.1 },
  { x: -6, z: 6, hw: 1.2, hd: 1.2, h: 1.1 },
  { x: 6, z: -6, hw: 1.2, hd: 1.2, h: 1.1 },
  { x: -6, z: -6, hw: 1.2, hd: 1.2, h: 1.1 },
];
