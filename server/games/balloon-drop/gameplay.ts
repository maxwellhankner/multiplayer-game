import type { BalloonInput, BalloonState, PlayerState } from '../../../shared/types.js';
import {
  getBalloonArenaId,
  getBalloonTeam,
  getPlayerXBounds,
  isBalloonTeamMode,
} from '../../../shared/games/balloon-drop/teams.js';
import {
  BALLOON_DROP_ARENA_WIDTH,
  BALLOON_DROP_BALLOON_RADIUS,
  BALLOON_DROP_BOUNCE_UP,
  BALLOON_DROP_CEILING_Y,
  BALLOON_DROP_DRIFT,
  BALLOON_DROP_FLOOR_Y,
  BALLOON_DROP_GRAVITY,
  BALLOON_DROP_HEAD_RADIUS,
  BALLOON_DROP_INPUT_DEADZONE,
  BALLOON_DROP_MAX_VX,
  BALLOON_DROP_MAX_VY,
  BALLOON_DROP_MOVE_SPEED,
  BALLOON_DROP_PLAYER_RADIUS,
  BALLOON_DROP_PLAYER_Y,
  BALLOON_DROP_WALL_BOUNCE,
} from '../../../shared/games/balloon-drop/constants.js';

export interface BalloonDropRoom {
  phase: string;
  players: Map<string, PlayerState>;
  balloons: BalloonState[];
  winnerId: string | null;
  gameTime: number;
  balloonInputs: Map<string, BalloonInput>;
}

const ZERO_INPUT: BalloonInput = { moveX: 0 };

function clampStick(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function clampPlayerX(px: number, lane: number, playerCount: number): number {
  const { min, max } = getPlayerXBounds(lane, playerCount);
  return Math.max(min, Math.min(max, px));
}

function getBalloonForArena(room: BalloonDropRoom, arenaId: string): BalloonState | undefined {
  return room.balloons.find((b) => b.arenaId === arenaId);
}

function playersInArena(
  room: BalloonDropRoom,
  arenaId: string,
  playerCount: number,
): PlayerState[] {
  return [...room.players.values()].filter(
    (p) => getBalloonArenaId(p.lane, p.id, playerCount) === arenaId,
  );
}

function spawnBalloon(arenaId: string): BalloonState {
  return {
    arenaId,
    x: BALLOON_DROP_ARENA_WIDTH / 2,
    y: 55 + Math.random() * 12,
    vx: (Math.random() - 0.5) * BALLOON_DROP_DRIFT,
    vy: -6 - Math.random() * 4,
  };
}

export function initBalloonDrop(room: BalloonDropRoom): void {
  room.balloonInputs.clear();
  room.balloons = [];

  const players = [...room.players.values()];
  const playerCount = players.length;
  const arenaIds = new Set<string>();

  for (const player of players) {
    const arenaId = getBalloonArenaId(player.lane, player.id, playerCount);
    arenaIds.add(arenaId);
    player.eliminated = false;
    player.score = 0;
    room.balloonInputs.set(player.id, { ...ZERO_INPUT });
  }

  for (const arenaId of arenaIds) {
    const arenaPlayers = playersInArena(room, arenaId, playerCount);
    arenaPlayers.forEach((player) => {
      const { min, max } = getPlayerXBounds(player.lane, playerCount);
      player.px = (min + max) / 2;
    });
    room.balloons.push(spawnBalloon(arenaId));
  }
}

export function setBalloonInput(room: BalloonDropRoom, playerId: string, input: BalloonInput): boolean {
  if (!room.players.has(playerId)) return false;
  const moveX = clampStick(input.moveX);
  room.balloonInputs.set(playerId, {
    moveX: Math.abs(moveX) < BALLOON_DROP_INPUT_DEADZONE ? 0 : moveX,
  });
  return true;
}

function bounceHead(balloon: BalloonState, player: PlayerState): void {
  const headY = BALLOON_DROP_PLAYER_Y + BALLOON_DROP_PLAYER_RADIUS * 0.6;
  const dx = balloon.x - player.px;
  const dy = balloon.y - headY;
  const dist = Math.hypot(dx, dy);
  const minDist = BALLOON_DROP_BALLOON_RADIUS + BALLOON_DROP_HEAD_RADIUS;
  if (dist >= minDist || dist < 0.001) return;

  const nx = dx / dist;
  const ny = dy / dist;
  balloon.x = player.px + nx * minDist;
  balloon.y = headY + ny * minDist;

  const bounce = BALLOON_DROP_BOUNCE_UP + Math.random() * 10;
  balloon.vy = Math.abs(bounce);
  balloon.vx += nx * 6 + (Math.random() - 0.5) * BALLOON_DROP_DRIFT;
}

function stepBalloon(
  balloon: BalloonState,
  players: PlayerState[],
  dt: number,
): boolean {
  balloon.vy -= BALLOON_DROP_GRAVITY * dt;
  balloon.vx += (Math.random() - 0.5) * BALLOON_DROP_DRIFT * dt * 0.35;
  balloon.vx = Math.max(-BALLOON_DROP_MAX_VX, Math.min(BALLOON_DROP_MAX_VX, balloon.vx));
  balloon.vy = Math.max(-BALLOON_DROP_MAX_VY, Math.min(BALLOON_DROP_MAX_VY, balloon.vy));

  balloon.x += balloon.vx * dt;
  balloon.y += balloon.vy * dt;

  const r = BALLOON_DROP_BALLOON_RADIUS;
  if (balloon.x < r) {
    balloon.x = r;
    balloon.vx = Math.abs(balloon.vx) * BALLOON_DROP_WALL_BOUNCE;
  } else if (balloon.x > BALLOON_DROP_ARENA_WIDTH - r) {
    balloon.x = BALLOON_DROP_ARENA_WIDTH - r;
    balloon.vx = -Math.abs(balloon.vx) * BALLOON_DROP_WALL_BOUNCE;
  }

  if (balloon.y > BALLOON_DROP_CEILING_Y) {
    balloon.y = BALLOON_DROP_CEILING_Y;
    balloon.vy = -Math.abs(balloon.vy) * 0.55;
  }

  for (const player of players) {
    if (!player.eliminated) bounceHead(balloon, player);
  }

  if (balloon.y - r <= BALLOON_DROP_FLOOR_Y) {
    return true;
  }
  return false;
}

function eliminatePlayer(player: PlayerState, room: BalloonDropRoom): void {
  if (player.eliminated) return;
  player.eliminated = true;
  player.score = Math.floor(room.gameTime);
}

function eliminateArena(room: BalloonDropRoom, arenaId: string, playerCount: number): void {
  for (const player of playersInArena(room, arenaId, playerCount)) {
    eliminatePlayer(player, room);
  }
}

function arenaAlive(room: BalloonDropRoom, arenaId: string, playerCount: number): boolean {
  return playersInArena(room, arenaId, playerCount).some((p) => !p.eliminated);
}

function checkBalloonWinner(room: BalloonDropRoom): void {
  const players = [...room.players.values()];
  const count = players.length;
  const alive = players.filter((p) => !p.eliminated);

  if (count === 1) {
    if (alive.length === 0) {
      room.phase = 'winner';
      room.winnerId = players[0].id;
    }
    return;
  }

  if (isBalloonTeamMode(count)) {
    const aliveArenas = ['0', '1'].filter((id) => arenaAlive(room, id, count));
    if (aliveArenas.length === 1) {
      room.phase = 'winner';
      const winningArena = aliveArenas[0];
      const team = Number(winningArena);
      const winner = players.find(
        (p) => getBalloonTeam(p.lane, count) === team && !p.eliminated,
      );
      room.winnerId = winner?.id ?? players.find((p) => getBalloonTeam(p.lane, count) === team)?.id ?? null;
    }
    return;
  }

  if (alive.length === 1) {
    room.phase = 'winner';
    room.winnerId = alive[0].id;
  } else if (alive.length === 0 && players.length > 0) {
    room.phase = 'winner';
    room.winnerId = null;
  }
}

export function tickBalloonDrop(room: BalloonDropRoom, dtMs: number): void {
  const dt = dtMs / 1000;
  room.gameTime += dtMs;
  const playerCount = room.players.size;

  for (const player of room.players.values()) {
    if (player.eliminated) continue;
    const input = room.balloonInputs.get(player.id) ?? ZERO_INPUT;
    player.px = clampPlayerX(
      player.px + input.moveX * BALLOON_DROP_MOVE_SPEED * dt,
      player.lane,
      playerCount,
    );
  }

  for (const balloon of room.balloons) {
    const arenaPlayers = playersInArena(room, balloon.arenaId, playerCount);
    if (arenaPlayers.every((p) => p.eliminated)) continue;

    const hitFloor = stepBalloon(
      balloon,
      arenaPlayers.filter((p) => !p.eliminated),
      dt,
    );
    if (hitFloor) {
      eliminateArena(room, balloon.arenaId, playerCount);
    }
  }

  checkBalloonWinner(room);
}
