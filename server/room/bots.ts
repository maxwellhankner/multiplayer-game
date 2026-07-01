import type { PlayerState } from '../../shared/types.js';
import { MAX_PLAYERS, PLAYER_COLORS } from '../../shared/constants.js';
import { createBotId, isBot, pickBotName } from '../../shared/games/bots.js';
import { getLobbyGameDefinition } from '../../shared/games/registry.js';
import type { SessionMode } from '../../shared/session.js';
import type { LobbySettings } from '../../shared/platform.js';

export interface BotRoomContext {
  sessionMode: SessionMode;
  lobbySettings: LobbySettings;
  players: Map<string, PlayerState>;
  phase: string;
}

function pickRandomColor(players: Map<string, PlayerState>): string {
  const used = new Set([...players.values()].map((p) => p.color));
  const available = PLAYER_COLORS.filter((c) => !used.has(c));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return PLAYER_COLORS[players.size % PLAYER_COLORS.length];
}

export function countBots(players: Map<string, PlayerState>): number {
  return [...players.values()].filter((p) => isBot(p.id)).length;
}

export function countHumans(players: Map<string, PlayerState>): number {
  return [...players.values()].filter((p) => !isBot(p.id)).length;
}

export function setBotsReady(players: Map<string, PlayerState>): void {
  for (const p of players.values()) {
    if (isBot(p.id)) p.ready = true;
  }
}

export function createBotPlayer(
  id: string,
  name: string,
  lane: number,
  color: string,
): PlayerState {
  return {
    id,
    name,
    ready: true,
    landscapeReady: false,
    wins: 0,
    lives: 3,
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
    yaw: 0,
    pitch: 0,
  };
}

export function addBotToRoom(room: BotRoomContext): PlayerState | null {
  if (room.phase !== 'lobby' && room.phase !== 'winner') return null;
  if (room.players.size >= MAX_PLAYERS) return null;

  const gameDef = getLobbyGameDefinition(room.sessionMode, room.lobbySettings.specificGameId);
  if (!gameDef) return null;

  const bots = countBots(room.players);
  if (bots >= gameDef.maxBots) return null;

  const takenNames = new Set(
    [...room.players.values()].map((p) => p.name.toLowerCase()),
  );
  const id = createBotId();
  const name = pickBotName(takenNames, bots);
  const color = pickRandomColor(room.players);
  const lane = room.players.size;

  const bot = createBotPlayer(id, name, lane, color);
  room.players.set(id, bot);
  return bot;
}

export function removeBotFromRoom(room: BotRoomContext, botId: string): boolean {
  if (room.phase !== 'lobby' && room.phase !== 'winner') return false;
  if (!isBot(botId)) return false;
  if (!room.players.has(botId)) return false;
  room.players.delete(botId);
  return true;
}

export function canAddBot(room: BotRoomContext): boolean {
  const gameDef = getLobbyGameDefinition(room.sessionMode, room.lobbySettings.specificGameId);
  if (!gameDef) return false;
  if (room.players.size >= MAX_PLAYERS) return false;
  return countBots(room.players) < gameDef.maxBots;
}

export function getBotLimit(room: BotRoomContext): number {
  const gameDef = getLobbyGameDefinition(room.sessionMode, room.lobbySettings.specificGameId);
  return gameDef?.maxBots ?? 0;
}

export { isBot };
