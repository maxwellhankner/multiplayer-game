/** Road / background bands (must sum to 1.0) */
export const SCREEN_LAYOUT = {
  TOP_SKY: 0.05,
  ROAD: 0.9,
  ROAD_SHADOW: 0.02,
  BOTTOM_SKY: 0.03,
} as const;

/** Player field bands — independent from road (must sum to 1.0) */
export const PLAYER_FIELD_LAYOUT = {
  TOP_GAP: 0.1,
  FIELD: 0.8,
  BOTTOM_GAP: 0.1,
  /** Set true to show the gold field border */
  SHOW_FIELD_BORDER: false,
} as const;

/** Fixed pixel layout for player lanes (within the player field) */
export const LANE_LAYOUT = {
  /** Height of each player segment */
  SEGMENT_HEIGHT_PX: 200,
  /** Rider/label offset above the segment floor */
  RIDER_OFFSET_PX: 36,
  /** Set true to show the semi-transparent gray lane segment boxes */
  SHOW_SEGMENT_BACKGROUND: false,
} as const;

export const GAME_CONSTANTS = {
  HORSE_SCREEN_X: 0.14,
} as const;

/** Server-side jump / collision tuning (pixel units) */
export const GAMEPLAY = {
  /** Peak jump height — shared by canvas render and server collision */
  JUMP_HEIGHT_PX: 120,
  JUMP_DURATION_MS: 1078,
  OBSTACLE_WIDTH: 36,
  OBSTACLE_HEIGHT: 90,
  /** Spawn slightly past the right edge of the host screen (px) */
  OBSTACLE_SPAWN_OFFSCREEN_PX: 60,
  OBSTACLE_SPAWN_JITTER_PX: 80,
  /** Min world-space gap between obstacle rows */
  OBSTACLE_MIN_SPAWN_GAP: 320,
  /** Horse sprite foot/body bounds (unscaled draw units; multiply by scale for screen px) */
  HORSE_FOOT_LEFT_X: 4,
  HORSE_FOOT_RIGHT_X: 48,
  HORSE_BODY_HEIGHT: 84,
  /** Reference scale for server collision when canvas scale is unavailable */
  HORSE_REFERENCE_SCALE: 1.15,
  /** Jump height must reach this fraction of obstacle height to clear */
  CLEARANCE_RATIO: 0.4,
  /** Debug overlay for server collision boxes */
  SHOW_COLLISION_BOXES: false,
} as const;

/** Ground-relative horse hitbox (Y increases upward from lane floor) */
export function getHorseHitboxBounds(horseX: number, jumpHeight: number, scale: number) {
  const left = horseX + GAMEPLAY.HORSE_FOOT_LEFT_X * scale;
  const right = horseX + GAMEPLAY.HORSE_FOOT_RIGHT_X * scale;
  const bottom = jumpHeight;
  const top = jumpHeight + GAMEPLAY.HORSE_BODY_HEIGHT * scale;
  return { left, right, bottom, top };
}

export function getJumpHeightAtPhase(jumpPhase: number, isJumping: boolean): number {
  if (!isJumping) return 0;
  return Math.sin(jumpPhase * Math.PI) * GAMEPLAY.JUMP_HEIGHT_PX;
}

export const MAX_PLAYERS = 8;

export const TEST_BOT_COUNT = 3;

/** Player horse / label colors — 8 distinct hues, one per slot */
export const PLAYER_COLORS = [
  '#a83340', // red
  '#b86218', // orange
  '#b89420', // gold
  '#3d8550', // green
  '#2a7f96', // teal
  '#2d5fa8', // blue
  '#6d48a0', // purple
  '#a8457a', // rose
] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];

export function isPlayerColor(color: string): color is PlayerColor {
  return (PLAYER_COLORS as readonly string[]).includes(color);
}

/** Colors reserved for test-mode bots (first N slots in the palette) */
export function getTestBotColors(): readonly string[] {
  return PLAYER_COLORS.slice(0, TEST_BOT_COUNT);
}

export function isTestBotColor(color: string): boolean {
  return (getTestBotColors() as readonly string[]).includes(color);
}

// Cowboy palette
export const COLORS = {
  navy: '#2f1810',
  dirt: '#d0b995',
  dirtEdge: '#9a7348',
  obstacle: '#4a2810',
  namePlate: '#5c3317',
  namePlateBorder: '#3d2314',
  apple: '#b7410e',
  appleStem: '#4a5c28',
  grass: '#6b7c3a',
  grassDark: '#556b2f',
  footprint: '#a08050',
  tumbleweed: '#8b7355',
} as const;

export interface TrackLayout {
  width: number;
  height: number;
  roadTop: number;
  roadHeight: number;
  roadBottom: number;
  shadowHeight: number;
  shadowTop: number;
  fieldTop: number;
  fieldHeight: number;
  fieldBottom: number;
  playerCount: number;
  /** Fixed height of each player segment (px) */
  laneSegmentHeight: number;
  horseX: number;
  /** Segment floor — bottom edge; horse feet and obstacles sit here (px) */
  laneGroundY: (index: number) => number;
  /** Top of that player's segment (px) */
  laneSegmentTop: (index: number) => number;
  /** Bottom of that player's segment — same as laneGroundY (px) */
  laneSegmentBottom: (index: number) => number;
  /** Rider/label vertical center (px) */
  laneCenterY: (index: number) => number;
  jumpHeight: number;
}

/** Lane indices sorted back → front (top player first, bottom player last) */
export function getLanesBackToFront(layout: Pick<TrackLayout, 'playerCount' | 'laneGroundY'>): number[] {
  return Array.from({ length: layout.playerCount }, (_, i) => i).sort(
    (a, b) => layout.laneGroundY(a) - layout.laneGroundY(b),
  );
}

/** Anchor line within the player field: (index + 1) / (playerCount + 1) — segment is centered here */
export function laneAnchorFraction(index: number, playerCount: number): number {
  const count = Math.max(playerCount, 1);
  return (index + 1) / (count + 1);
}

export function computeTrackLayout(
  width: number,
  height: number,
  playerCount: number,
): TrackLayout {
  const count = Math.max(playerCount, 1);

  const roadTop = Math.round(height * SCREEN_LAYOUT.TOP_SKY);
  const roadHeight = Math.round(height * SCREEN_LAYOUT.ROAD);
  const roadBottom = roadTop + roadHeight;
  const shadowHeight = Math.round(height * SCREEN_LAYOUT.ROAD_SHADOW);
  const shadowTop = roadBottom;

  const fieldTop = Math.round(height * PLAYER_FIELD_LAYOUT.TOP_GAP);
  const fieldHeight = Math.round(height * PLAYER_FIELD_LAYOUT.FIELD);
  const fieldBottom = fieldTop + fieldHeight;

  const laneSegmentHeight = LANE_LAYOUT.SEGMENT_HEIGHT_PX;
  const jumpHeight = GAMEPLAY.JUMP_HEIGHT_PX;
  const halfSegment = laneSegmentHeight / 2;

  const laneAnchorY = (index: number) =>
    fieldTop + fieldHeight * laneAnchorFraction(index, count);

  const laneSegmentBottom = (index: number) =>
    Math.round(laneAnchorY(index) + halfSegment);

  const laneSegmentTop = (index: number) =>
    Math.round(laneAnchorY(index) - halfSegment);

  const laneGroundY = laneSegmentBottom;

  return {
    width,
    height,
    roadTop,
    roadHeight,
    roadBottom,
    shadowHeight,
    shadowTop,
    fieldTop,
    fieldHeight,
    fieldBottom,
    playerCount: count,
    laneSegmentHeight,
    horseX: Math.round(width * GAME_CONSTANTS.HORSE_SCREEN_X),
    laneGroundY,
    laneSegmentTop,
    laneSegmentBottom,
    laneCenterY: (index) => laneGroundY(index) - LANE_LAYOUT.RIDER_OFFSET_PX,
    jumpHeight,
  };
}
