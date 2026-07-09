import type { BalloonInput, BalloonState, CoinStickInput, CoinState, DrunkDriverInput, GamePhase, LobbySettings, ObstacleState, PlayerState, RoomState, ScribblePhase, ScribbleStroke, SessionMode, ShotImpactState, ShotTracerState } from '../shared/types.js';
import { GAME_CONSTANTS, GAMEPLAY, getHorseHitboxBounds, getJumpHeightAtPhase, MAX_PLAYERS, PLAYER_COLORS } from '../shared/constants.js';
import { getSessionWinPlayerIds } from '../shared/games/session-wins.js';
import { isBot, allHumansReady } from '../shared/games/bots.js';
import { getGameById, getGamesForSessionMode } from '../shared/games/registry.js';
import { getDefaultLobbySettings, resolveGameId } from '../shared/platform.js';
import { isValidRoomCode, normalizeRoomCode, randomRoomCode } from '../shared/routes.js';
import { getGameServerModule } from './games/registry.js';
import { initCoinRush, setCoinStickInput, tickCoinRush } from './games/coin-rush/gameplay.js';
import { clearCoinRushBots } from './games/coin-rush/module.js';
import {
  fireShotsFiredShot,
  initShotsFired,
  jumpShotsFired,
  meleeShotsFiredAttack,
  setShotsFiredInput,
  tickShotsFired,
} from './games/shots-fired/gameplay.js';
import { initBalloonDrop, setBalloonInput, tickBalloonDrop } from './games/balloon-drop/gameplay.js';
import { clearBalloonDropBots } from './games/balloon-drop/module.js';
import {
  clearScribbleTimeState,
  initScribbleTime,
  pickScribbleFavorite,
  serializeScribbleDrawings,
  setScribbleDrawing,
  setScribblePrompt,
  tickScribbleTime,
} from './games/scribble-time/index.js';
import { clearScribbleTimeBots } from './games/scribble-time/module.js';
import { clearHoeDownBotJumpPlans } from './games/hoe-down-derby/index.js';
import {
  clearDrunkDriverState,
  initDrunkDriver,
  setDrunkDriverInput,
  tickDrunkDriver,
} from './games/drunk-driver/gameplay.js';
import { clearDrunkDriverBots } from './games/drunk-driver/module.js';
import {
  addBotToRoom,
  canAddBot,
  countBots,
  countHumans,
  removeBotFromRoom,
  setBotsReady,
} from './room/bots.js';

const MAX_LIVES = 3;
const SCROLL_SPEED = 5;
const DEFAULT_TRACK_WIDTH = 1200;
const COUNTDOWN_SECONDS = 3;

function gameUsesOrientPhase(gameId: string | null): boolean {
  return gameId === 'coin-rush' || gameId === 'drunk-driver' || gameId === 'shots-fired';
}

interface Room {
  id: string;
  phase: GamePhase;
  sessionMode: SessionMode;
  lobbySettings: LobbySettings;
  activeGameId: string | null;
  players: Map<string, PlayerState>;
  obstacles: ObstacleState[];
  coins: CoinState[];
  balloons: BalloonState[];
  coinInputs: Map<string, CoinStickInput>;
  shotsFiredInputs: Map<string, CoinStickInput>;
  shotTracers: ShotTracerState[];
  shotImpacts: ShotImpactState[];
  nextTracerId: number;
  nextImpactId: number;
  lastFireAt: Map<string, number>;
  lastMeleeAt: Map<string, number>;
  jumpVel: Map<string, number>;
  balloonInputs: Map<string, BalloonInput>;
  drunkInputs: Map<string, DrunkDriverInput>;
  scrollX: number;
  countdown: number;
  winnerId: string | null;
  gameTime: number;
  lastSpawnX: number;
  nextObstacleId: number;
  nextCoinId: number;
  countdownTimer: number;
  trackWidth: number;
  scribblePhase: ScribblePhase | null;
  scribblePrompterId: string | null;
  scribblePrompt: string | null;
  scribbleDrawings: Map<string, ScribbleStroke[]>;
  scribbleDrawMsLeft: number;
  scribbleDrawTimer: number;
  scribbleBotDrawAt: Map<string, number>;
  hostOnline: boolean;
  winsAwarded: boolean;
}

const rooms = new Map<string, Room>();

function buildEmptyRoom(id: string, sessionMode: SessionMode): Room {
  const lobbySettings = getDefaultLobbySettings(sessionMode);
  return {
    id: id.toUpperCase(),
    phase: 'lobby',
    sessionMode,
    lobbySettings: { ...lobbySettings, gamePool: [...lobbySettings.gamePool] },
    activeGameId: null,
    players: new Map(),
    obstacles: [],
    coins: [],
    balloons: [],
    coinInputs: new Map(),
    shotsFiredInputs: new Map(),
    shotTracers: [],
    shotImpacts: [],
    nextTracerId: 1,
    nextImpactId: 1,
    lastFireAt: new Map(),
    lastMeleeAt: new Map(),
    jumpVel: new Map(),
    balloonInputs: new Map(),
    drunkInputs: new Map(),
    scrollX: 0,
    countdown: COUNTDOWN_SECONDS,
    winnerId: null,
    gameTime: 0,
    lastSpawnX: 0,
    nextObstacleId: 1,
    nextCoinId: 1,
    countdownTimer: 0,
    trackWidth: DEFAULT_TRACK_WIDTH,
    scribblePhase: null,
    scribblePrompterId: null,
    scribblePrompt: null,
    scribbleDrawings: new Map(),
    scribbleDrawMsLeft: 0,
    scribbleDrawTimer: 0,
    scribbleBotDrawAt: new Map(),
    hostOnline: false,
    winsAwarded: false,
  };
}

function createPlayer(id: string, name: string, lane: number, color: string): PlayerState {
  return {
    id,
    name,
    ready: false,
    landscapeReady: false,
    wins: 0,
    lives: MAX_LIVES,
    lane,
    jumpPhase: 0,
    isJumping: false,
    eliminated: false,
    invulnUntil: 0,
    flipPhase: 0,
    color,
    score: 0,
    px: 0,
    pz: 0,
    py: 0,
    yaw: 0,
    pitch: 0,
    bullets: 0,
  };
}

function pickRandomColor(room: Room): string {
  const used = new Set([...room.players.values()].map((p) => p.color));
  const available = PLAYER_COLORS.filter((c) => !used.has(c));

  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  const fallback = PLAYER_COLORS.filter((c) => !used.has(c));
  if (fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return PLAYER_COLORS[room.players.size % PLAYER_COLORS.length];
}

export function createRoom(sessionMode: SessionMode = 'pc-host'): Room {
  let id = randomRoomCode();
  while (rooms.has(id)) {
    id = randomRoomCode();
  }

  const room = buildEmptyRoom(id, sessionMode);
  rooms.set(id, room);
  return room;
}

/** Recreate a lobby at a fixed code (e.g. host tab after server restart). */
export function createRoomWithId(
  id: string,
  sessionMode: SessionMode = 'pc-host',
): Room | null {
  const normalized = normalizeRoomCode(id);
  if (!isValidRoomCode(normalized) || rooms.has(normalized)) {
    return null;
  }

  const room = buildEmptyRoom(normalized, sessionMode);
  rooms.set(normalized, room);
  return room;
}

function botContext(room: Room) {
  return {
    sessionMode: room.sessionMode,
    lobbySettings: room.lobbySettings,
    players: room.players,
    phase: room.phase,
  };
}

export function addBot(room: Room): boolean {
  const bot = addBotToRoom(botContext(room));
  if (!bot) return false;
  reindexLanes(room);
  return true;
}

export function removeBot(room: Room, botId: string): boolean {
  if (!removeBotFromRoom(botContext(room), botId)) return false;
  reindexLanes(room);
  return true;
}

export function canRoomAddBot(room: Room): boolean {
  return canAddBot(botContext(room));
}

export function canStartBotsOnlyRace(room: Room): boolean {
  if (room.phase !== 'lobby') return false;
  if (countHumans(room.players) !== 0) return false;
  if (countBots(room.players) === 0) return false;
  if (getGamesForSessionMode(room.sessionMode).length === 0) return false;

  const gameId = resolveGameId(room.lobbySettings, room.sessionMode);
  const game = getGameById(gameId);
  if (!game || game.status !== 'playable') return false;
  if (room.players.size < game.minPlayers) return false;
  return true;
}

export function startBotsOnlyRace(room: Room): boolean {
  if (!canStartBotsOnlyRace(room)) return false;
  readyBots(room);
  beginRace(room);
  return true;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id.toUpperCase());
}

export interface DevRoomSnapshot {
  id: string;
  sessionMode: SessionMode;
  lobbySettings: LobbySettings;
  trackWidth: number;
  players: PlayerState[];
}

export function exportDevRoomSnapshots(): DevRoomSnapshot[] {
  return [...rooms.values()].map((room) => ({
    id: room.id,
    sessionMode: room.sessionMode,
    lobbySettings: {
      ...room.lobbySettings,
      gamePool: [...room.lobbySettings.gamePool],
    },
    trackWidth: room.trackWidth,
    players: [...room.players.values()].sort((a, b) => a.lane - b.lane),
  }));
}

export function importDevRoomSnapshots(snapshots: DevRoomSnapshot[]): void {
  rooms.clear();
  for (const snapshot of snapshots) {
    const room: Room = {
      id: snapshot.id,
      phase: 'lobby',
      sessionMode: snapshot.sessionMode,
      lobbySettings: {
        ...snapshot.lobbySettings,
        gamePool: [...snapshot.lobbySettings.gamePool],
      },
      activeGameId: null,
      players: new Map(
        snapshot.players.map((player) => {
          const { holding: _holding, holdStart: _holdStart, ...playerRest } = player as PlayerState & {
            holding?: boolean;
            holdStart?: number;
          };
          return [
            player.id,
            {
              ...playerRest,
              ready: isBot(player.id),
              landscapeReady: false,
              wins: player.wins ?? 0,
              lives: MAX_LIVES,
              eliminated: false,
              flipPhase: 0,
              jumpPhase: 0,
              isJumping: false,
              invulnUntil: 0,
              score: 0,
              px: 0,
              pz: 0,
              py: 0,
              yaw: 0,
              pitch: 0,
              bullets: 0,
            },
          ] as const;
        }),
      ),
      obstacles: [],
      coins: [],
      balloons: [],
      coinInputs: new Map(),
      shotsFiredInputs: new Map(),
      shotTracers: [],
      shotImpacts: [],
      nextTracerId: 1,
      nextImpactId: 1,
      lastFireAt: new Map(),
      lastMeleeAt: new Map(),
      jumpVel: new Map(),
      balloonInputs: new Map(),
      drunkInputs: new Map(),
      scrollX: 0,
      countdown: COUNTDOWN_SECONDS,
      winnerId: null,
      gameTime: 0,
      lastSpawnX: 0,
      nextObstacleId: 1,
      nextCoinId: 1,
      countdownTimer: 0,
      trackWidth: snapshot.trackWidth,
      scribblePhase: null,
      scribblePrompterId: null,
      scribblePrompt: null,
      scribbleDrawings: new Map(),
      scribbleDrawMsLeft: 0,
      scribbleDrawTimer: 0,
      scribbleBotDrawAt: new Map(),
      hostOnline: false,
      winsAwarded: false,
    };
    reindexLanes(room);
    rooms.set(room.id, room);
  }
}

export function rejoinPlayer(
  room: Room,
  oldPlayerId: string,
  newSocketId: string,
): PlayerState | null {
  if (isBot(oldPlayerId)) return null;
  const existing = room.players.get(oldPlayerId);
  if (!existing) return null;
  if (room.players.has(newSocketId)) {
    return room.players.get(newSocketId) ?? null;
  }

  const inLobby = room.phase === 'lobby' || room.phase === 'winner';
  const player: PlayerState = inLobby
    ? { ...existing, id: newSocketId }
    : {
        ...existing,
        id: newSocketId,
        ready: false,
        lives: MAX_LIVES,
        eliminated: false,
        flipPhase: 0,
        jumpPhase: 0,
        isJumping: false,
        invulnUntil: 0,
        score: 0,
        px: 0,
        pz: 0,
        py: 0,
        yaw: 0,
        pitch: 0,
        bullets: 0,
      };

  room.players.delete(oldPlayerId);
  room.coinInputs.delete(oldPlayerId);
  room.shotsFiredInputs.delete(oldPlayerId);
  room.lastFireAt.delete(oldPlayerId);
  room.lastMeleeAt.delete(oldPlayerId);
  room.balloonInputs.delete(oldPlayerId);
  room.drunkInputs.delete(oldPlayerId);
  room.players.set(newSocketId, player);
  reindexLanes(room);
  return player;
}

export function rejoinOrClaimPlayer(
  room: Room,
  oldPlayerId: string | null | undefined,
  name: string | null | undefined,
  newSocketId: string,
  isSocketConnected: (id: string) => boolean,
): PlayerState | null {
  if (oldPlayerId) {
    const byId = rejoinPlayer(room, oldPlayerId, newSocketId);
    if (byId) return byId;
  }

  const trimmed = name?.trim().slice(0, 16);
  if (!trimmed) return null;

  const existing = [...room.players.values()].find(
    (p) => !isBot(p.id) && p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!existing || isSocketConnected(existing.id)) return null;

  return rejoinPlayer(room, existing.id, newSocketId);
}

export function removeRoom(id: string): void {
  rooms.delete(id.toUpperCase());
}

export function addPlayer(
  room: Room,
  socketId: string,
  name: string,
  isSocketConnected?: (id: string) => boolean,
): PlayerState | null {
  if (isBot(socketId)) return null;
  if (room.phase !== 'lobby' && room.phase !== 'winner') {
    return null;
  }
  if (room.players.size >= MAX_PLAYERS) return null;

  const trimmed = name.trim().slice(0, 16);
  if (!trimmed) return null;

  const existing = [...room.players.values()].find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    if (isSocketConnected && !isBot(existing.id) && !isSocketConnected(existing.id)) {
      return rejoinPlayer(room, existing.id, socketId);
    }
    return null;
  }

  const color = pickRandomColor(room);
  const player = createPlayer(socketId, trimmed, 0, color);
  room.players.set(socketId, player);
  reindexLanes(room);
  return player;
}

export function removePlayer(room: Room, socketId: string): void {
  if (isBot(socketId)) return;
  room.players.delete(socketId);
  room.coinInputs.delete(socketId);
  room.shotsFiredInputs.delete(socketId);
  room.lastFireAt.delete(socketId);
  room.lastMeleeAt.delete(socketId);
  room.balloonInputs.delete(socketId);
  room.drunkInputs.delete(socketId);
  reindexLanes(room);
  if (room.phase === 'orient') {
    tryBeginCountdown(room);
  }
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
  return allHumansReady(room.players.values());
}

function allPlayersLandscapeReady(room: Room): boolean {
  if (room.players.size === 0) return false;
  return [...room.players.values()].every((p) => isBot(p.id) || p.landscapeReady);
}

function tryBeginCountdown(room: Room): void {
  if (room.phase !== 'orient' || !gameUsesOrientPhase(room.activeGameId)) return;
  if (!allPlayersLandscapeReady(room)) return;
  room.phase = 'countdown';
  room.countdown = COUNTDOWN_SECONDS;
  room.countdownTimer = 0;
}

function readyBots(room: Room): void {
  setBotsReady(room.players);
}

function beginRace(room: Room): void {
  if (getGamesForSessionMode(room.sessionMode).length === 0) return;

  const gameId = resolveGameId(room.lobbySettings, room.sessionMode);
  const game = getGameById(gameId);
  if (!game || game.status !== 'playable') return;

  room.activeGameId = gameId;
  const isCoinRush = gameId === 'coin-rush';
  const isShotsFired = gameId === 'shots-fired';
  const isDrunkDriver = gameId === 'drunk-driver';
  const isOrientGame = gameUsesOrientPhase(gameId);
  room.phase = isOrientGame ? 'orient' : 'countdown';
  room.countdown = COUNTDOWN_SECONDS;
  room.countdownTimer = 0;
  room.obstacles = [];
  room.scrollX = 0;
  room.gameTime = 0;
  room.lastSpawnX = 0;
  room.winnerId = null;

  const isBalloonDrop = gameId === 'balloon-drop';
  const isScribbleTime = gameId === 'scribble-time';
  if (isCoinRush) {
    clearCoinRushBots();
    initCoinRush(room);
  }
  if (isShotsFired) {
    initShotsFired(room);
  }
  if (isDrunkDriver) {
    clearDrunkDriverBots();
    initDrunkDriver(room);
  }
  if (isBalloonDrop) {
    clearBalloonDropBots();
    initBalloonDrop(room);
  }
  if (isScribbleTime) {
    clearScribbleTimeBots();
    initScribbleTime(room);
  }
  if (gameId === 'hoe-down-derby') {
    clearHoeDownBotJumpPlans();
  }

  for (const p of room.players.values()) {
    p.ready = false;
    p.landscapeReady = isBot(p.id);
    if (!isCoinRush && !isShotsFired && !isBalloonDrop && !isScribbleTime && !isDrunkDriver) {
      p.lives = MAX_LIVES;
      p.eliminated = false;
      p.jumpPhase = 0;
      p.isJumping = false;
      p.invulnUntil = 0;
      p.flipPhase = 0;
    }
    p.score = 0;
  }

  if (isOrientGame) {
    tryBeginCountdown(room);
  }
}

export function setPlayerReady(room: Room, socketId: string): boolean {
  const player = room.players.get(socketId);
  if (!player || room.phase !== 'lobby' || player.ready) return false;

  player.ready = true;
  readyBots(room);

  if (allPlayersReady(room)) {
    beginRace(room);
  }
  return true;
}

export function setPlayerLandscapeReady(room: Room, socketId: string): boolean {
  if (room.phase !== 'orient' || !gameUsesOrientPhase(room.activeGameId)) return false;
  const player = room.players.get(socketId);
  if (!player || isBot(socketId) || player.landscapeReady) return false;

  player.landscapeReady = true;
  tryBeginCountdown(room);
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

function awardSessionWins(room: Room): void {
  const ids = getSessionWinPlayerIds(
    room.activeGameId,
    [...room.players.values()],
    room.winnerId,
  );
  for (const id of ids) {
    const player = room.players.get(id);
    if (player) player.wins += 1;
  }
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
  if (room.activeGameId !== 'hoe-down-derby') return false;
  const player = room.players.get(socketId);
  if (!player || room.phase !== 'playing' || player.eliminated || player.isJumping) {
    return false;
  }
  player.isJumping = true;
  player.jumpPhase = 0;
  return true;
}

export function setPlayerDrunkInput(room: Room, socketId: string, input: DrunkDriverInput): boolean {
  if (room.activeGameId !== 'drunk-driver') return false;
  if (room.phase !== 'playing' && room.phase !== 'countdown') return false;
  return setDrunkDriverInput(room, socketId, input);
}

export function setPlayerCoinInput(room: Room, socketId: string, input: CoinStickInput): boolean {
  if (room.activeGameId !== 'coin-rush') return false;
  if (room.phase !== 'playing' && room.phase !== 'countdown') return false;
  return setCoinStickInput(room, socketId, input);
}

export function setPlayerShotsFiredInput(room: Room, socketId: string, input: CoinStickInput): boolean {
  if (room.activeGameId !== 'shots-fired') return false;
  if (room.phase !== 'playing' && room.phase !== 'countdown') return false;
  return setShotsFiredInput(room, socketId, input);
}

export function triggerShotsFiredShoot(room: Room, socketId: string): boolean {
  if (room.activeGameId !== 'shots-fired') return false;
  return fireShotsFiredShot(room, socketId, Date.now());
}

export function triggerShotsFiredMelee(room: Room, socketId: string): boolean {
  if (room.activeGameId !== 'shots-fired') return false;
  return meleeShotsFiredAttack(room, socketId, Date.now());
}

export function triggerShotsFiredJump(room: Room, socketId: string): boolean {
  if (room.activeGameId !== 'shots-fired') return false;
  return jumpShotsFired(room, socketId);
}

export function setPlayerBalloonInput(room: Room, socketId: string, input: BalloonInput): boolean {
  if (room.activeGameId !== 'balloon-drop') return false;
  if (room.phase !== 'playing' && room.phase !== 'countdown') return false;
  return setBalloonInput(room, socketId, input);
}

export function submitScribblePrompt(room: Room, socketId: string, prompt: string): boolean {
  if (room.activeGameId !== 'scribble-time') return false;
  return setScribblePrompt(room, socketId, prompt);
}

export function submitScribbleDrawing(room: Room, socketId: string, strokes: unknown): boolean {
  if (room.activeGameId !== 'scribble-time') return false;
  return setScribbleDrawing(room, socketId, strokes);
}

export function submitScribblePick(room: Room, socketId: string, artistId: string): boolean {
  if (room.activeGameId !== 'scribble-time') return false;
  return pickScribbleFavorite(room, socketId, artistId);
}

export function prepareLobbyReturn(room: Room, socketId: string): boolean {
  const player = room.players.get(socketId);
  if (!player || room.phase !== 'winner' || player.ready) return false;

  player.ready = true;
  readyBots(room);

  if (!allPlayersReady(room)) return true;

  returnToLobby(room);
  return true;
}

/** @deprecated Use prepareLobbyReturn — kept for socket event name compatibility */
export const prepareRematch = prepareLobbyReturn;

function resetRoomToLobby(room: Room): void {
  room.phase = 'lobby';
  room.activeGameId = null;
  room.winnerId = null;
  room.winsAwarded = false;
  room.obstacles = [];
  room.coins = [];
  room.balloons = [];
  room.coinInputs.clear();
  room.shotsFiredInputs.clear();
  room.shotTracers = [];
  room.shotImpacts = [];
  room.nextTracerId = 1;
  room.nextImpactId = 1;
  room.lastFireAt.clear();
  room.lastMeleeAt.clear();
  room.balloonInputs.clear();
  room.drunkInputs.clear();
  room.scrollX = 0;
  room.gameTime = 0;
  room.lastSpawnX = 0;
  room.countdown = COUNTDOWN_SECONDS;
  room.countdownTimer = 0;
  room.winsAwarded = false;
  clearCoinRushBots();
  clearBalloonDropBots();
  clearDrunkDriverBots();
  clearDrunkDriverState();
  clearScribbleTimeState(room);

  for (const p of room.players.values()) {
    p.ready = false;
    p.landscapeReady = false;
    p.lives = MAX_LIVES;
    p.eliminated = false;
    p.flipPhase = 0;
    p.jumpPhase = 0;
    p.isJumping = false;
    p.invulnUntil = 0;
    p.score = 0;
    p.px = 0;
    p.pz = 0;
    p.py = 0;
    p.yaw = 0;
    p.pitch = 0;
    p.bullets = 0;
    if (isBot(p.id)) p.ready = true;
  }
}

export function returnToLobby(room: Room): boolean {
  if (room.phase === 'lobby') return false;
  resetRoomToLobby(room);
  return true;
}

function runGameBotTick(room: Room, dt: number): void {
  const module = getGameServerModule(room.activeGameId);
  if (!module?.tickBots) return;

  const bots = [...room.players.values()].filter((p) => isBot(p.id));
  if (bots.length === 0) return;

  module.tickBots(bots, {
    room: {
      phase: room.phase,
      activeGameId: room.activeGameId,
      scrollX: room.scrollX,
      trackWidth: room.trackWidth,
      playerCount: room.players.size,
      obstacles: room.obstacles,
      coins: room.coins,
      balloons: room.balloons,
      players: [...room.players.values()],
    },
    triggerJump: (playerId) => {
      triggerJump(room, playerId);
    },
    setCoinInput: (playerId, input) => {
      setCoinStickInput(room, playerId, input);
    },
    setShotsFiredInput: (playerId, input) => {
      setShotsFiredInput(room, playerId, input);
    },
    triggerShotsFiredShoot: (playerId) => {
      fireShotsFiredShot(room, playerId, Date.now());
    },
    triggerShotsFiredMelee: (playerId) => {
      meleeShotsFiredAttack(room, playerId, Date.now());
    },
    setBalloonInput: (playerId, input) => {
      setBalloonInput(room, playerId, input);
    },
    setDrunkInput: (playerId, input) => {
      setDrunkDriverInput(room, playerId, input);
    },
    getHorseScreenX,
  }, dt);
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
    if (room.activeGameId === 'drunk-driver') {
      tickDrunkDriver(room, dt);
      runGameBotTick(room, dt);
      return;
    }

    if (room.activeGameId === 'coin-rush') {
      tickCoinRush(room, dt);
      runGameBotTick(room, dt);
      return;
    }

    if (room.activeGameId === 'shots-fired') {
      tickShotsFired(room, dt, now);
      runGameBotTick(room, dt);
      return;
    }

    if (room.activeGameId === 'balloon-drop') {
      tickBalloonDrop(room, dt);
      runGameBotTick(room, dt);
      return;
    }

    if (room.activeGameId === 'scribble-time') {
      tickScribbleTime(room, dt);
      runGameBotTick(room, dt);
      return;
    }

    if (room.activeGameId !== 'hoe-down-derby') {
      return;
    }

    room.gameTime += dt;
    room.scrollX += SCROLL_SPEED * (dt / 16.67);

    if (room.gameTime > 1500 && Math.random() < 0.03) {
      spawnObstaclesForLanes(room);
    }

    room.obstacles = room.obstacles.filter((o) => o.worldX - room.scrollX > -100);

    runGameBotTick(room, dt);

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
    if (!room.winsAwarded) {
      awardSessionWins(room);
      room.winsAwarded = true;
    }

    const winner = room.players.get(room.winnerId);
    if (winner && winner.flipPhase > 0 && winner.flipPhase < 1) {
      winner.flipPhase = Math.min(1, winner.flipPhase + dt / 1200);
    }
  }
}

export function updateLobbySettings(room: Room, patch: Partial<LobbySettings>): boolean {
  if (room.phase !== 'lobby') return false;

  const next: LobbySettings = {
    ...room.lobbySettings,
    ...patch,
    gamePool: patch.gamePool ? [...patch.gamePool] : [...room.lobbySettings.gamePool],
  };

  room.lobbySettings = next;

  for (const player of room.players.values()) {
    if (!isBot(player.id)) player.ready = false;
  }
  setBotsReady(room.players);

  return true;
}

export function serializeRoom(room: Room): RoomState {
  const winner = room.winnerId ? room.players.get(room.winnerId) : null;
  return {
    id: room.id,
    phase: room.phase,
    sessionMode: room.sessionMode,
    lobbySettings: {
      ...room.lobbySettings,
      gamePool: [...room.lobbySettings.gamePool],
    },
    activeGameId: room.activeGameId,
    players: [...room.players.values()].sort((a, b) => a.lane - b.lane),
    obstacles: room.obstacles,
    coins: [...room.coins],
    shotTracers: [...room.shotTracers],
    shotImpacts: [...room.shotImpacts],
    balloons: [...room.balloons],
    scrollX: room.scrollX,
    countdown: room.countdown,
    winnerId: room.winnerId,
    winnerName: winner?.name ?? null,
    gameTime: room.gameTime,
    scribblePhase: room.scribblePhase,
    scribblePrompterId: room.scribblePrompterId,
    scribblePrompt:
      room.scribblePhase === 'prompt' ? null : room.scribblePrompt,
    scribbleDrawings:
      room.scribblePhase === 'pick' || room.phase === 'winner'
        ? serializeScribbleDrawings(room)
        : [],
    scribbleDrawSecondsLeft: Math.ceil(room.scribbleDrawMsLeft / 1000),
    hostOnline: room.hostOnline,
  };
}
