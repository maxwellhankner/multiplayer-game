import { DRUNK_CAR_RADIUS, DRUNK_LANE_GAP } from './constants.js';

/** Lateral start position — spaced so cars do not overlap on the line. */
export function getStartLaneX(lane: number, playerCount: number): number {
  const n = Math.max(1, Math.min(playerCount, 8));
  if (n === 1) return 0;

  const laneSpacing = DRUNK_CAR_RADIUS * 2 + DRUNK_LANE_GAP;
  const totalSpan = laneSpacing * (n - 1);
  return -totalSpan / 2 + lane * laneSpacing;
}

/** Max lateral offset allowed (half the spread at max player count). */
export function getMaxLateral(playerCount: number): number {
  const n = Math.max(1, Math.min(playerCount, 8));
  if (n === 1) return DRUNK_CAR_RADIUS + 1;
  const laneSpacing = DRUNK_CAR_RADIUS * 2 + DRUNK_LANE_GAP;
  return totalSpanHalf(laneSpacing, n) + DRUNK_CAR_RADIUS;
}

function totalSpanHalf(laneSpacing: number, n: number): number {
  return (laneSpacing * (n - 1)) / 2;
}
