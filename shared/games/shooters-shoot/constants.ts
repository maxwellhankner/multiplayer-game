export {
  COIN_RUSH_ARENA_HALF as SHOOTERS_SHOOT_ARENA_HALF,
  COIN_RUSH_MOVE_SPEED as SHOOTERS_SHOOT_MOVE_SPEED,
  COIN_RUSH_LOOK_SPEED as SHOOTERS_SHOOT_LOOK_SPEED,
  COIN_RUSH_PITCH_SPEED as SHOOTERS_SHOOT_PITCH_SPEED,
  COIN_RUSH_MAX_PITCH as SHOOTERS_SHOOT_MAX_PITCH,
  COIN_RUSH_STICK_DEADZONE as SHOOTERS_SHOOT_STICK_DEADZONE,
} from '../coin-rush/constants.js';

/** World avatar torso height (feet at y = 0). */
export const SHOOTERS_SHOOT_TORSO_HEIGHT = 1.0;

/** Head sphere radius — matches ShootersShootHostCanvas. */
export const SHOOTERS_SHOOT_HEAD_RADIUS = 0.27;

/** Head sphere center Y from feet. */
export const SHOOTERS_SHOOT_HEAD_CENTER_Y =
  SHOOTERS_SHOOT_TORSO_HEIGHT / 2 + SHOOTERS_SHOOT_TORSO_HEIGHT / 2 + SHOOTERS_SHOOT_HEAD_RADIUS;

/** Camera Y — center of head; forward offset — front of head sphere (nose). */
export const SHOOTERS_SHOOT_CAMERA_Y = SHOOTERS_SHOOT_HEAD_CENTER_Y;
export const SHOOTERS_SHOOT_CAMERA_FORWARD = SHOOTERS_SHOOT_HEAD_RADIUS;

/** Hits before elimination */
export const SHOOTERS_SHOOT_MAX_HITS = 3;

/** Body hit capsule radius for raycast */
export const SHOOTERS_SHOOT_HIT_RADIUS = 0.45;

/**
 * Vertical hit capsule spans knee height up to head level so level shots
 * still connect with the head cap.
 */
export const SHOOTERS_SHOOT_HITBOX_BOTTOM_Y = 0.15;
export const SHOOTERS_SHOOT_HITBOX_TOP_Y = 1.45;

/** Max raycast distance */
export const SHOOTERS_SHOOT_MAX_RANGE = 40;

/** Minimum ms between shots */
export const SHOOTERS_SHOOT_FIRE_COOLDOWN_MS = 380;

/** Melee reach (world units) */
export const SHOOTERS_SHOOT_MELEE_RANGE = 2.8;

/** Melee half-angle cone (radians) — must face target */
export const SHOOTERS_SHOOT_MELEE_CONE = 0.75;

/** Minimum ms between melee swings */
export const SHOOTERS_SHOOT_MELEE_COOLDOWN_MS = 550;

/** Melee punch animation length on host/controller view */
export const SHOOTERS_SHOOT_MELEE_SWING_MS = 300;

/** Brief invulnerability after taking a hit */
export const SHOOTERS_SHOOT_HIT_INVULN_MS = 350;

/** How long tracers stay visible in room state */
export const SHOOTERS_SHOOT_TRACER_DURATION_MS = 180;

/** Metal spark flash duration at bullet impacts */
export const SHOOTERS_SHOOT_IMPACT_DURATION_MS = 240;

/** Arena wall height for bullet collision */
export const SHOOTERS_SHOOT_WALL_HEIGHT = 2.5;

/** Dead bodies float upward (units per second) */
export const SHOOTERS_SHOOT_DEATH_FLOAT_SPEED = 1.4;

/** Max float height before stopping */
export const SHOOTERS_SHOOT_DEATH_FLOAT_MAX = 14;

/** Initial upward velocity on jump (units per second) — apex ~2.75, enough for 2.6 pillars */
export const SHOOTERS_SHOOT_JUMP_SPEED = 10.5;

/** Downward acceleration applied while airborne (units per second^2) */
export const SHOOTERS_SHOOT_GRAVITY = 20;

/** Horizontal collision radius for a player against boxes/props */
export const SHOOTERS_SHOOT_PLAYER_RADIUS = 0.5;

/** Ground speed multiplier while sprinting forward */
export const SHOOTERS_SHOOT_SPRINT_MULT = 1.7;

/** Ground speed multiplier while crouched */
export const SHOOTERS_SHOOT_CROUCH_MULT = 0.46;

/** How fast ground movement reaches the wish speed (units per second²) */
export const SHOOTERS_SHOOT_GROUND_ACCEL = 48;

/** How fast ground movement bleeds speed (1/seconds) */
export const SHOOTERS_SHOOT_GROUND_FRICTION = 12;

/**
 * Air steering rate (1/seconds). A full jump only nudges momentum;
 * it does not let the player reverse direction before landing.
 */
export const SHOOTERS_SHOOT_AIR_STEER = 0.55;

/** Acceleration applied in the air when nearly stopped (units per second²) */
export const SHOOTERS_SHOOT_AIR_PUSH = 3.2;

/** Fastest horizontal speed you can build from a standstill jump */
export const SHOOTERS_SHOOT_AIR_PUSH_CAP = 1.6;

/** Camera and hitbox drop while crouched */
export const SHOOTERS_SHOOT_CROUCH_EYE_DROP = 0.5;

/** Rounds in a fresh magazine */
export const SHOOTERS_SHOOT_MAG_SIZE = 12;

/** Rounds carried on the body at spawn */
export const SHOOTERS_SHOOT_RESERVE_AMMO = 36;

/** Reload length */
export const SHOOTERS_SHOOT_RELOAD_MS = 2000;

/** A solid box prop in the arena. (x,z) center, half extents hw/hd, height h. */
export interface ShootersShootBox {
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
export const SHOOTERS_SHOOT_BOXES: readonly ShootersShootBox[] = [
  { x: 0, z: 9.5, hw: 1.65, hd: 1.65, h: 2.6, variant: 'pillar' },
  { x: 0, z: -9.5, hw: 1.65, hd: 1.65, h: 2.6, variant: 'pillar' },
  { x: 9.5, z: 0, hw: 1.65, hd: 1.65, h: 2.6, variant: 'pillar' },
  { x: -9.5, z: 0, hw: 1.65, hd: 1.65, h: 2.6, variant: 'pillar' },
  { x: 6, z: 6, hw: 1.85, hd: 1.85, h: 1.1, variant: 'crate' },
  { x: -6, z: 6, hw: 1.85, hd: 1.85, h: 1.1, variant: 'crate' },
  { x: 6, z: -6, hw: 1.85, hd: 1.85, h: 1.1, variant: 'crate' },
  { x: -6, z: -6, hw: 1.85, hd: 1.85, h: 1.1, variant: 'crate' },
];
