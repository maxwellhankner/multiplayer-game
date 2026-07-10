export {
  COIN_RUSH_ARENA_HALF as SHOTS_FIRED_ARENA_HALF,
  COIN_RUSH_MOVE_SPEED as SHOTS_FIRED_MOVE_SPEED,
  COIN_RUSH_LOOK_SPEED as SHOTS_FIRED_LOOK_SPEED,
  COIN_RUSH_PITCH_SPEED as SHOTS_FIRED_PITCH_SPEED,
  COIN_RUSH_MAX_PITCH as SHOTS_FIRED_MAX_PITCH,
  COIN_RUSH_STICK_DEADZONE as SHOTS_FIRED_STICK_DEADZONE,
} from '../coin-rush/constants.js';

/** World avatar torso height (feet at y = 0). */
export const SHOTS_FIRED_TORSO_HEIGHT = 1.0;

/** Head sphere radius — matches ShotsFiredHostCanvas. */
export const SHOTS_FIRED_HEAD_RADIUS = 0.27;

/** Head sphere center Y from feet. */
export const SHOTS_FIRED_HEAD_CENTER_Y =
  SHOTS_FIRED_TORSO_HEIGHT / 2 + SHOTS_FIRED_TORSO_HEIGHT / 2 + SHOTS_FIRED_HEAD_RADIUS;

/** Camera Y — center of head; forward offset — front of head sphere (nose). */
export const SHOTS_FIRED_CAMERA_Y = SHOTS_FIRED_HEAD_CENTER_Y;
export const SHOTS_FIRED_CAMERA_FORWARD = SHOTS_FIRED_HEAD_RADIUS;

/** Hits before elimination */
export const SHOTS_FIRED_MAX_HITS = 3;

/** Body hit capsule radius for raycast */
export const SHOTS_FIRED_HIT_RADIUS = 0.45;

/**
 * Vertical hit capsule spans knee height up to head level so level shots
 * still connect with the head cap.
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

/** Melee punch animation length on host/controller view */
export const SHOTS_FIRED_MELEE_SWING_MS = 300;

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

/** Initial upward velocity on jump (units per second) — apex ~2.75, enough for 2.6 pillars */
export const SHOTS_FIRED_JUMP_SPEED = 10.5;

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
  /** Visual style only — gameplay height comes from h */
  variant?: 'pillar' | 'crate';
}

/**
 * Static box layout. Crates (h 1.1) and pillars (h 2.6) are both jumpable platforms.
 * Jump apex ≈ 2.75. Positions avoid the player spawn ring (radius ~4–6) and center.
 */
export const SHOTS_FIRED_BOXES: readonly ShotsFiredBox[] = [
  { x: 0, z: 9.5, hw: 1.65, hd: 1.65, h: 2.6, variant: 'pillar' },
  { x: 0, z: -9.5, hw: 1.65, hd: 1.65, h: 2.6, variant: 'pillar' },
  { x: 9.5, z: 0, hw: 1.65, hd: 1.65, h: 2.6, variant: 'pillar' },
  { x: -9.5, z: 0, hw: 1.65, hd: 1.65, h: 2.6, variant: 'pillar' },
  { x: 6, z: 6, hw: 1.85, hd: 1.85, h: 1.1, variant: 'crate' },
  { x: -6, z: 6, hw: 1.85, hd: 1.85, h: 1.1, variant: 'crate' },
  { x: 6, z: -6, hw: 1.85, hd: 1.85, h: 1.1, variant: 'crate' },
  { x: -6, z: -6, hw: 1.85, hd: 1.85, h: 1.1, variant: 'crate' },
];
