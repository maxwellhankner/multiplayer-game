import { BALLOON_DROP_ARENA_WIDTH, BALLOON_DROP_PLAYER_RADIUS } from './constants.js';

/** Team assignment from join order (lane) and lobby size. */
export function getBalloonTeam(lane: number, playerCount: number): number {
  const n = Math.max(1, Math.min(playerCount, 8));
  if (n === 1) return 0;
  if (n === 2 || n === 3 || n === 5 || n === 7) return lane;
  if (n === 4) return lane < 2 ? 0 : 1;
  if (n === 6) return lane < 3 ? 0 : 1;
  return lane < 4 ? 0 : 1;
}

export function isBalloonTeamMode(playerCount: number): boolean {
  return playerCount === 4 || playerCount === 6 || playerCount === 8;
}

/** One host column per arena — 2 in team mode, otherwise one per player. */
export function getBalloonArenaCount(playerCount: number): number {
  const n = Math.max(0, Math.min(playerCount, 8));
  if (n === 0) return 0;
  if (n === 1) return 1;
  if (isBalloonTeamMode(n)) return 2;
  return n;
}

/** Shared arena key — teammates share an arena id. */
export function getBalloonArenaId(
  lane: number,
  playerId: string,
  playerCount: number,
): string {
  if (isBalloonTeamMode(playerCount)) {
    return String(getBalloonTeam(lane, playerCount));
  }
  if (playerCount === 1) return '0';
  return playerId;
}

export function getBalloonTeamLabel(team: number, playerCount: number): string {
  if (!isBalloonTeamMode(playerCount)) {
    return playerCount === 1 ? 'Solo' : 'Free-for-all';
  }
  return `Team ${team + 1}`;
}

export function getBalloonArenaLabel(arenaId: string, playerCount: number): string {
  if (isBalloonTeamMode(playerCount)) {
    return `Team ${Number(arenaId) + 1}`;
  }
  return '';
}

/** Slot index within a shared arena (0 = leftmost slice). */
export function getPlayerArenaSlot(
  lane: number,
  playerCount: number,
): { index: number; count: number } {
  if (isBalloonTeamMode(playerCount)) {
    const arenaSize = playerCount / 2;
    const team = getBalloonTeam(lane, playerCount);
    const index = team === 0 ? lane : lane - arenaSize;
    return { index, count: arenaSize };
  }
  return { index: 0, count: 1 };
}

/** Horizontal movement bounds for a player within their arena slice. */
export function getPlayerXBounds(
  lane: number,
  playerCount: number,
): { min: number; max: number } {
  const margin = BALLOON_DROP_PLAYER_RADIUS + 1;
  const { index, count } = getPlayerArenaSlot(lane, playerCount);
  if (count <= 1) {
    return { min: margin, max: BALLOON_DROP_ARENA_WIDTH - margin };
  }
  const sliceWidth = BALLOON_DROP_ARENA_WIDTH / count;
  return {
    min: sliceWidth * index + margin,
    max: sliceWidth * (index + 1) - margin,
  };
}
