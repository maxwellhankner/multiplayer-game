import { BALLOON_DROP_ARENA_WIDTH, BALLOON_DROP_PLAYER_RADIUS } from './constants.js';
import { isBot } from '../bots.js';

export interface BalloonDropLanePlayer {
  id: string;
  lane: number;
}

/** Team mode: spread humans across teams (e.g. 2 humans + 2 bots → one human per team). */
export function rebalanceBalloonDropTeamLanes(players: BalloonDropLanePlayer[]): void {
  const count = players.length;
  if (!isBalloonTeamMode(count)) return;

  const humans = players.filter((p) => !isBot(p.id)).sort((a, b) => a.lane - b.lane);
  const bots = players.filter((p) => isBot(p.id)).sort((a, b) => a.lane - b.lane);
  if (humans.length < 2) return;

  const teams: BalloonDropLanePlayer[][] = [[], []];

  for (let i = 0; i < humans.length; i++) {
    teams[i % 2].push(humans[i]);
  }

  for (const bot of bots) {
    const team = teams[0].length <= teams[1].length ? 0 : 1;
    teams[team].push(bot);
  }

  let lane = 0;
  const laneById = new Map<string, number>();
  for (const player of teams[0]) {
    laneById.set(player.id, lane++);
  }
  for (const player of teams[1]) {
    laneById.set(player.id, lane++);
  }

  for (const player of players) {
    const nextLane = laneById.get(player.id);
    if (nextLane !== undefined) player.lane = nextLane;
  }
}

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

const TEAM_SPAWN_CENTER_BLEND = 0.75;

/** Starting X — in team mode, pull each player toward arena center (under the balloon). */
export function getPlayerSpawnX(lane: number, playerCount: number): number {
  const { min, max } = getPlayerXBounds(lane, playerCount);
  const sliceCenter = (min + max) / 2;
  if (!isBalloonTeamMode(playerCount)) {
    return sliceCenter;
  }
  const arenaCenter = BALLOON_DROP_ARENA_WIDTH / 2;
  const px = sliceCenter + (arenaCenter - sliceCenter) * TEAM_SPAWN_CENTER_BLEND;
  return Math.max(min, Math.min(max, px));
}
