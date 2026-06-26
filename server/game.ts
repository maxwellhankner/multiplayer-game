import type { GamePhase, ObstacleState, PlayerState, RoomState } from '../shared/types.js';
import { GAME_CONSTANTS, GAMEPLAY, getHorseHitboxBounds, getJumpHeightAtPhase, MAX_PLAYERS, PLAYER_COLORS, isPlayerColor, isTestBotColor } from '../shared/constants.js';
import { BOT_JUMP_DISTANCE, BOT_PLAYERS, isBot, TEST_MODE } from './bots.js';

const PLAYER_COLORS_LIST = PLAYER_COLORS;

const MAX_LIVES = 3;
const SCROLL_SPEED = 5;
const DEFAULT_TRACK_WIDTH = 1200;
const COUNTDOWN_SECONDS = 3;


interface Room {
  id: string;
  phase: GamePhase;
  players: Map<string, PlayerState>;
  obstacles: ObstacleState[];
  scrollX: number;
  countdown: number;
  winnerId: string | null;
  gameTime: number;
  lastSpawnX: number;
  nextObstacleId: number;
  countdownTimer: number;
  trackWidth: number;
}

const rooms = new Map<string, Room>();

function randomRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function createPlayer(id: string, name: string, lane: number, color: string): PlayerState {
  return {
    id,
    name,
    ready: false,
    lives: MAX_LIVES,
    lane,
    jumpPhase: 0,
    isJumping: false,
    eliminated: false,
    invulnUntil: 0,
    flipPhase: 0,
    color,
  };
}

function isColorTaken(room: Room, color: string, exceptId?: string): boolean {
  return [...room.players.values()].some((p) => p.id !== exceptId && p.color === color);
}

export function createRoom(): Room {
  let id = randomRoomId();
  while (rooms.has(id)) {
    id = randomRoomId();
  }

  const room: Room = {
    id,
    phase: 'lobby',
    players: new Map(),
    obstacles: [],
    scrollX: 0,
    countdown: COUNTDOWN_SECONDS,
    winnerId: null,
    gameTime: 0,
    lastSpawnX: 0,
    nextObstacleId: 1,
    countdownTimer: 0,
    trackWidth: DEFAULT_TRACK_WIDTH,
  };

  rooms.set(id, room);
  ensureTestBots(room);
  return room;
}

export { TEST_MODE };

function ensureTestBots(room: Room): void {
  if (!TEST_MODE) return;

  for (let i = 0; i < BOT_PLAYERS.length; i++) {
    const { id, name } = BOT_PLAYERS[i];
    let player = room.players.get(id);
    if (!player) {
      player = createPlayer(id, name, i, PLAYER_COLORS_LIST[i] ?? PLAYER_COLORS_LIST[0]);
      room.players.set(id, player);
    }
    player.lane = i;
    player.color = PLAYER_COLORS_LIST[i] ?? PLAYER_COLORS_LIST[0];
  }

  let lane = BOT_PLAYERS.length;
  for (const player of room.players.values()) {
    if (isBot(player.id)) continue;
    player.lane = lane;
    lane += 1;
  }
}

function updateBotAI(room: Room): void {
  if (!TEST_MODE || room.phase !== 'playing') return;

  const horseX = getHorseScreenX(room.trackWidth);

  for (const player of room.players.values()) {
    if (!isBot(player.id) || player.eliminated || player.isJumping) continue;

    const upcoming = room.obstacles
      .filter((o) => o.lane === player.lane)
      .map((o) => ({ o, screenX: o.worldX - room.scrollX }))
      .filter(({ screenX }) => screenX > horseX - 30 && screenX < horseX + 320)
      .sort((a, b) => a.screenX - b.screenX)[0];

    if (!upcoming) continue;

    const distance = upcoming.screenX - horseX;
    if (distance > 0 && distance <= BOT_JUMP_DISTANCE) {
      triggerJump(room, player.id);
    }
  }
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id.toUpperCase());
}

export function removeRoom(id: string): void {
  rooms.delete(id.toUpperCase());
}

export function addPlayer(room: Room, socketId: string, name: string, color: string): PlayerState | null {
  if (isBot(socketId)) return null;
  if (room.phase !== 'lobby' && room.phase !== 'winner') {
    return null;
  }
  if (room.players.size >= MAX_PLAYERS) return null;

  const trimmed = name.trim().slice(0, 16);
  if (!trimmed) return null;
  if (!isPlayerColor(color)) return null;
  if (TEST_MODE && isTestBotColor(color)) return null;
  if (isColorTaken(room, color)) return null;

  const existing = [...room.players.values()].find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return null;

  const player = createPlayer(socketId, trimmed, 0, color);
  room.players.set(socketId, player);
  ensureTestBots(room);
  return player;
}

export function removePlayer(room: Room, socketId: string): void {
  if (isBot(socketId)) return;
  room.players.delete(socketId);
  reindexLanes(room);
  ensureTestBots(room);
}

export function kickPlayer(room: Room, targetId: string): boolean {
  if (isBot(targetId)) return false;
  if (room.phase !== 'lobby' && room.phase !== 'winner') return false;
  if (!room.players.has(targetId)) return false;
  removePlayer(room, targetId);
  return true;
}

function reindexLanes(room: Room): void {
  [...room.players.values()]
    .sort((a, b) => a.lane - b.lane)
    .forEach((player, index) => {
      player.lane = index;
    });
}

function allPlayersReady(room: Room): boolean {
  if (room.players.size === 0) return false;
  return [...room.players.values()].every((p) => p.ready);
}

function readyBotsForTestMode(room: Room): void {
  if (!TEST_MODE) return;
  for (const p of room.players.values()) {
    if (isBot(p.id)) p.ready = true;
  }
}

function beginRace(room: Room): void {
  room.phase = 'countdown';
  room.countdown = COUNTDOWN_SECONDS;
  room.countdownTimer = 0;
  room.obstacles = [];
  room.scrollX = 0;
  room.gameTime = 0;
  room.lastSpawnX = 0;
  room.winnerId = null;

  for (const p of room.players.values()) {
    p.lives = MAX_LIVES;
    p.eliminated = false;
    p.jumpPhase = 0;
    p.isJumping = false;
    p.invulnUntil = 0;
    p.flipPhase = 0;
    p.ready = false;
  }
}

export function setPlayerReady(room: Room, socketId: string): boolean {
  const player = room.players.get(socketId);
  if (!player || room.phase !== 'lobby' || player.ready) return false;

  player.ready = true;
  readyBotsForTestMode(room);

  if (allPlayersReady(room)) {
    beginRace(room);
  }
  return true;
}

function spawnObstaclesForLanes(room: Room): void {
  const laneCount = room.players.size;
  if (laneCount === 0) return;

  const spawnScreenX =
    room.trackWidth +
    GAMEPLAY.OBSTACLE_SPAWN_OFFSCREEN_PX +
    Math.random() * GAMEPLAY.OBSTACLE_SPAWN_JITTER_PX;
  const worldX = room.scrollX + spawnScreenX;

  if (worldX - room.lastSpawnX < GAMEPLAY.OBSTACLE_MIN_SPAWN_GAP) return;

  for (let lane = 0; lane < laneCount; lane++) {
    room.obstacles.push({
      id: `obs-${room.nextObstacleId++}`,
      worldX,
      width: GAMEPLAY.OBSTACLE_WIDTH,
      height: GAMEPLAY.OBSTACLE_HEIGHT,
      lane,
    });
  }

  room.lastSpawnX = worldX;
}

export function setTrackWidth(room: Room, width: number): void {
  room.trackWidth = Math.max(400, Math.round(width));
}

function getHorseScreenX(trackWidth: number): number {
  return trackWidth * GAME_CONSTANTS.HORSE_SCREEN_X;
}

function getJumpHeight(player: PlayerState): number {
  return getJumpHeightAtPhase(player.jumpPhase, player.isJumping);
}

function checkCollision(
  player: PlayerState,
  obstacle: ObstacleState,
  scrollX: number,
  now: number,
  trackWidth: number,
): boolean {
  if (player.eliminated || now < player.invulnUntil) return false;
  if (typeof obstacle.lane === 'number' && obstacle.lane !== player.lane) return false;

  const horseX = getHorseScreenX(trackWidth);
  const screenX = obstacle.worldX - scrollX;
  const jumpHeight = getJumpHeight(player);
  const scale = GAMEPLAY.HORSE_REFERENCE_SCALE;

  const horse = getHorseHitboxBounds(horseX, jumpHeight, scale);
  const obsLeft = screenX - obstacle.width / 2;
  const obsRight = screenX + obstacle.width / 2;
  const obsBottom = 0;
  const obsTop = obstacle.height;

  const horizontalOverlap = horse.right > obsLeft && horse.left < obsRight;
  const verticalOverlap = horse.top > obsBottom && horse.bottom < obsTop;

  return horizontalOverlap && verticalOverlap;
}

function getAlivePlayers(room: Room): PlayerState[] {
  return [...room.players.values()].filter((p) => !p.eliminated);
}

function checkWinner(room: Room): void {
  const alive = getAlivePlayers(room);

  if (room.players.size === 1) {
    if (alive.length === 0) {
      room.phase = 'winner';
      room.winnerId = null;
    }
    return;
  }

  if (alive.length === 1) {
    room.phase = 'winner';
    room.winnerId = alive[0].id;
    alive[0].flipPhase = 0.01;
  } else if (alive.length === 0) {
    room.phase = 'winner';
    room.winnerId = null;
  }
}

export function triggerJump(room: Room, socketId: string): boolean {
  const player = room.players.get(socketId);
  if (!player || room.phase !== 'playing' || player.eliminated || player.isJumping) {
    return false;
  }
  player.isJumping = true;
  player.jumpPhase = 0;
  return true;
}

export function prepareRematch(room: Room, socketId: string): boolean {
  const player = room.players.get(socketId);
  if (!player || room.phase !== 'winner' || player.ready) return false;

  player.ready = true;
  readyBotsForTestMode(room);

  if (!allPlayersReady(room)) return true;

  beginRace(room);
  return true;
}

function resetRoomToLobby(room: Room): void {
  room.phase = 'lobby';
  room.winnerId = null;
  room.obstacles = [];
  room.scrollX = 0;
  room.gameTime = 0;
  room.lastSpawnX = 0;
  room.countdown = COUNTDOWN_SECONDS;
  room.countdownTimer = 0;

  for (const p of room.players.values()) {
    p.ready = false;
    p.lives = MAX_LIVES;
    p.eliminated = false;
    p.flipPhase = 0;
    p.jumpPhase = 0;
    p.isJumping = false;
    p.invulnUntil = 0;
  }

  ensureTestBots(room);
}

export function returnToLobby(room: Room): boolean {
  if (room.phase === 'lobby') return false;
  resetRoomToLobby(room);
  return true;
}

export function tickRoom(room: Room, dt: number): void {
  const now = Date.now();

  if (room.phase === 'countdown') {
    room.countdownTimer += dt;
    if (room.countdownTimer >= 1000) {
      room.countdownTimer = 0;
      room.countdown -= 1;
      if (room.countdown <= 0) {
        room.phase = 'playing';
        room.gameTime = 0;
      }
    }
    return;
  }

  if (room.phase === 'playing') {
    room.gameTime += dt;
    room.scrollX += SCROLL_SPEED * (dt / 16.67);

    if (room.gameTime > 1500 && Math.random() < 0.03) {
      spawnObstaclesForLanes(room);
    }

    room.obstacles = room.obstacles.filter((o) => o.worldX - room.scrollX > -100);

    updateBotAI(room);

    for (const player of room.players.values()) {
      if (player.isJumping) {
        player.jumpPhase += dt / GAMEPLAY.JUMP_DURATION_MS;
        if (player.jumpPhase >= 1) {
          player.jumpPhase = 0;
          player.isJumping = false;
        }
      }

      if (player.eliminated) continue;

      for (const obstacle of room.obstacles) {
        if (typeof obstacle.lane === 'number' && obstacle.lane !== player.lane) continue;
        if (checkCollision(player, obstacle, room.scrollX, now, room.trackWidth)) {
          player.lives -= 1;
          player.invulnUntil = now + 1200;
          if (player.lives <= 0) {
            player.eliminated = true;
          }
          break;
        }
      }
    }

    checkWinner(room);
    return;
  }

  if (room.phase === 'winner' && room.winnerId) {
    const winner = room.players.get(room.winnerId);
    if (winner && winner.flipPhase > 0 && winner.flipPhase < 1) {
      winner.flipPhase = Math.min(1, winner.flipPhase + dt / 1200);
    }
  }
}

export function serializeRoom(room: Room): RoomState {
  const winner = room.winnerId ? room.players.get(room.winnerId) : null;
  return {
    id: room.id,
    phase: room.phase,
    players: [...room.players.values()].sort((a, b) => a.lane - b.lane),
    obstacles: room.obstacles,
    scrollX: room.scrollX,
    countdown: room.countdown,
    winnerId: room.winnerId,
    winnerName: winner?.name ?? null,
    gameTime: room.gameTime,
    testMode: TEST_MODE,
  };
}
