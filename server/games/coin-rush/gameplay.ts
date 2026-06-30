import type { CoinStickInput, CoinState, PlayerState } from '../../../shared/types.js';
import {
  COIN_RUSH_ARENA_HALF,
  COIN_RUSH_COIN_COUNT,
  COIN_RUSH_COLLECT_RADIUS,
  COIN_RUSH_LOOK_SPEED,
  COIN_RUSH_MAX_PITCH,
  COIN_RUSH_MOVE_SPEED,
  COIN_RUSH_PITCH_SPEED,
  COIN_RUSH_WIN_COINS,
} from '../../../shared/games/coin-rush/constants.js';

export interface CoinRushRoom {
  phase: string;
  players: Map<string, PlayerState>;
  coins: CoinState[];
  winnerId: string | null;
  gameTime: number;
  nextCoinId: number;
  coinInputs: Map<string, CoinStickInput>;
}

const ZERO_INPUT: CoinStickInput = { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };

function clampToArena(x: number, z: number): { x: number; z: number } {
  const limit = COIN_RUSH_ARENA_HALF - 1;
  return {
    x: Math.max(-limit, Math.min(limit, x)),
    z: Math.max(-limit, Math.min(limit, z)),
  };
}

function clampStick(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

export function normalizeCoinInput(input: CoinStickInput): CoinStickInput {
  const moveX = clampStick(input.moveX);
  const moveY = clampStick(input.moveY);
  const lookX = clampStick(input.lookX);
  const lookY = clampStick(input.lookY);
  const moveMag = Math.hypot(moveX, moveY);
  const moveScale = moveMag > 1 ? 1 / moveMag : 1;
  return {
    moveX: moveX * moveScale,
    moveY: moveY * moveScale,
    lookX,
    lookY,
  };
}

function randomArenaPosition(): { x: number; z: number } {
  const span = COIN_RUSH_ARENA_HALF * 1.6;
  return {
    x: (Math.random() - 0.5) * span,
    z: (Math.random() - 0.5) * span,
  };
}

function spawnCoins(room: CoinRushRoom, count: number): void {
  room.coins = [];
  for (let i = 0; i < count; i++) {
    const pos = randomArenaPosition();
    room.coins.push({
      id: `coin-${room.nextCoinId++}`,
      x: pos.x,
      z: pos.z,
    });
  }
}

export function initCoinRush(room: CoinRushRoom): void {
  room.nextCoinId = 1;
  room.coinInputs.clear();
  spawnCoins(room, COIN_RUSH_COIN_COUNT);

  const players = [...room.players.values()];
  players.forEach((player, index) => {
    const angle = (index / Math.max(players.length, 1)) * Math.PI * 2;
    const radius = 4 + (index % 3);
    player.px = Math.sin(angle) * radius;
    player.pz = Math.cos(angle) * radius;
    player.yaw = angle + Math.PI;
    player.pitch = 0;
    player.score = 0;
    player.eliminated = false;
    room.coinInputs.set(player.id, { ...ZERO_INPUT });
  });
}

function collectCoins(player: PlayerState, room: CoinRushRoom): boolean {
  let changed = false;
  const remaining: CoinState[] = [];

  for (const coin of room.coins) {
    const dx = coin.x - player.px;
    const dz = coin.z - player.pz;
    if (Math.hypot(dx, dz) <= COIN_RUSH_COLLECT_RADIUS) {
      player.score += 1;
      changed = true;
    } else {
      remaining.push(coin);
    }
  }

  if (changed) {
    room.coins = remaining;
  }
  return changed;
}

function checkCoinRushWinner(room: CoinRushRoom): void {
  for (const player of room.players.values()) {
    if (player.score >= COIN_RUSH_WIN_COINS) {
      room.phase = 'winner';
      room.winnerId = player.id;
      return;
    }
  }
}

function applyStickInput(player: PlayerState, input: CoinStickInput, dtMs: number): void {
  const dt = dtMs / 1000;
  const yaw = player.yaw;

  // Match Three.js camera forward (rotation.y = PI - yaw) projected onto XZ
  const forwardX = -Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = Math.sin(yaw);

  const speed = COIN_RUSH_MOVE_SPEED * dt;
  const fwd = input.moveY * speed;
  const str = -input.moveX * speed;
  const nx = player.px + forwardX * fwd + rightX * str;
  const nz = player.pz + forwardZ * fwd + rightZ * str;
  const clamped = clampToArena(nx, nz);
  player.px = clamped.x;
  player.pz = clamped.z;

  player.yaw += input.lookX * COIN_RUSH_LOOK_SPEED * dt;
  player.pitch = Math.max(
    -COIN_RUSH_MAX_PITCH,
    Math.min(COIN_RUSH_MAX_PITCH, player.pitch - input.lookY * COIN_RUSH_PITCH_SPEED * dt),
  );
}

export function setCoinStickInput(room: CoinRushRoom, playerId: string, input: CoinStickInput): boolean {
  if (!room.players.has(playerId)) return false;
  room.coinInputs.set(playerId, normalizeCoinInput(input));
  return true;
}

export function tickCoinRush(room: CoinRushRoom, dt: number): void {
  room.gameTime += dt;

  for (const player of room.players.values()) {
    const input = room.coinInputs.get(player.id) ?? ZERO_INPUT;
    applyStickInput(player, input, dt);
    collectCoins(player, room);
  }

  checkCoinRushWinner(room);
}

export function nearestCoin(
  player: PlayerState,
  coins: CoinState[],
): CoinState | null {
  if (coins.length === 0) return null;
  let best: CoinState | null = null;
  let bestDist = Infinity;
  for (const coin of coins) {
    const dist = Math.hypot(coin.x - player.px, coin.z - player.pz);
    if (dist < bestDist) {
      bestDist = dist;
      best = coin;
    }
  }
  return best;
}

export function angleToTarget(
  px: number,
  pz: number,
  tx: number,
  tz: number,
): number {
  return Math.atan2(tx - px, tz - pz);
}

export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
