import { isBot } from '../../../shared/games/bots.js';
import type { ScribbleDrawing, ScribblePoint, ScribbleStroke } from '../../../shared/types.js';
import {
  SCRIBBLE_BOT_DRAW_MAX_MS,
  SCRIBBLE_BOT_DRAW_MIN_MS,
  SCRIBBLE_BOT_PICK_DELAY_MS,
  SCRIBBLE_BOT_PROMPT_DELAY_MS,
  SCRIBBLE_CANVAS_SIZE,
  SCRIBBLE_DRAW_SECONDS,
  SCRIBBLE_POINTS_MAX,
  SCRIBBLE_PROMPT_MAX_LENGTH,
  SCRIBBLE_STROKE_MAX,
} from '../../../shared/games/scribble-time/constants.js';
import type { ScribblePhase } from '../../../shared/types.js';

export interface ScribbleTimeRoom {
  phase: string;
  activeGameId: string | null;
  players: Map<string, { id: string; name: string }>;
  winnerId: string | null;
  scribblePhase: ScribblePhase | null;
  scribblePrompterId: string | null;
  scribblePrompt: string | null;
  scribbleDrawings: Map<string, ScribbleStroke[]>;
  scribbleDrawMsLeft: number;
  scribbleDrawTimer: number;
  scribbleBotDrawAt: Map<string, number>;
}

const BOT_PROMPTS = [
  'a cat wearing sunglasses',
  'a rocket ship',
  'a slice of pizza',
  'a snowman',
  'a bicycle',
  'a treehouse',
  'a smiling sun',
  'a birthday cake',
];

function pickRandomPrompter(room: ScribbleTimeRoom): string | null {
  const ids = [...room.players.keys()];
  if (ids.length === 0) return null;
  return ids[Math.floor(Math.random() * ids.length)];
}

function artistIds(room: ScribbleTimeRoom): string[] {
  if (!room.scribblePrompterId) return [];
  return [...room.players.keys()].filter((id) => id !== room.scribblePrompterId);
}

function hashBotId(botId: string): number {
  let hash = 0;
  for (let i = 0; i < botId.length; i++) {
    hash = (hash * 31 + botId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function botDrawDelayMs(botId: string): number {
  const span = SCRIBBLE_BOT_DRAW_MAX_MS - SCRIBBLE_BOT_DRAW_MIN_MS;
  return SCRIBBLE_BOT_DRAW_MIN_MS + (hashBotId(botId) % span);
}

function clampCoord(value: number): number {
  return Math.max(0, Math.min(SCRIBBLE_CANVAS_SIZE, value));
}

function polyline(points: ScribblePoint[]): ScribbleStroke {
  return { points };
}

function circle(cx: number, cy: number, radius: number, segments = 28): ScribbleStroke {
  const points = Array.from({ length: segments }, (_, i) => {
    const angle = (i / segments) * Math.PI * 2;
    return {
      x: clampCoord(cx + Math.cos(angle) * radius),
      y: clampCoord(cy + Math.sin(angle) * radius),
    };
  });
  return polyline(points);
}

function rect(x: number, y: number, w: number, h: number): ScribbleStroke {
  return polyline([
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ]);
}

/** Recognizable scribbles centered on the canvas (normalized 0–1000). */
function botScribbleStrokes(botId: string): ScribbleStroke[] {
  const seed = hashBotId(botId);
  const variant = seed % 4;
  const jx = ((seed % 90) - 45);
  const jy = (((seed >> 4) % 90) - 45);
  const cx = 500 + jx;
  const cy = 480 + jy;

  if (variant === 0) {
    return [
      circle(cx, cy - 120, 100),
      rect(cx - 150, cy - 10, 300, 200),
      polyline([
        { x: cx - 120, y: cy + 190 },
        { x: cx - 60, y: cy + 280 },
        { x: cx + 60, y: cy + 280 },
        { x: cx + 120, y: cy + 190 },
      ]),
    ];
  }

  if (variant === 1) {
    return [
      polyline([
        { x: cx - 140, y: cy + 160 },
        { x: cx, y: cy - 180 },
        { x: cx + 140, y: cy + 160 },
        { x: cx - 140, y: cy + 160 },
      ]),
      circle(cx, cy + 20, 80),
    ];
  }

  if (variant === 2) {
    return [
      circle(cx, cy - 150, 70),
      polyline([
        { x: cx - 120, y: cy - 60 },
        { x: cx + 120, y: cy - 60 },
      ]),
      polyline([
        { x: cx, y: cy - 60 },
        { x: cx, y: cy + 120 },
      ]),
      polyline([
        { x: cx, y: cy + 10 },
        { x: cx - 100, y: cy + 90 },
      ]),
      polyline([
        { x: cx, y: cy + 10 },
        { x: cx + 100, y: cy + 90 },
      ]),
      polyline([
        { x: cx, y: cy + 120 },
        { x: cx - 80, y: cy + 220 },
      ]),
      polyline([
        { x: cx, y: cy + 120 },
        { x: cx + 80, y: cy + 220 },
      ]),
    ];
  }

  return [
    polyline([
      { x: cx - 160, y: cy + 140 },
      { x: cx - 80, y: cy - 120 },
      { x: cx + 80, y: cy - 120 },
      { x: cx + 160, y: cy + 140 },
      { x: cx - 160, y: cy + 140 },
    ]),
    rect(cx - 50, cy + 60, 100, 90),
    circle(cx + 120, cy - 40, 45),
  ];
}

export function normalizeScribbleStrokes(raw: unknown): ScribbleStroke[] {
  const list = Array.isArray(raw) ? raw : (raw as { strokes?: unknown })?.strokes;
  if (!Array.isArray(list)) return [];

  const out: ScribbleStroke[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const points = (item as ScribbleStroke).points;
    if (!Array.isArray(points)) continue;

    const normalized: ScribblePoint[] = [];
    for (const point of points) {
      if (!point || typeof point !== 'object') continue;
      const x = Number((point as ScribblePoint).x);
      const y = Number((point as ScribblePoint).y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      normalized.push({
        x: clampCoord(x),
        y: clampCoord(y),
      });
    }

    if (normalized.length >= 2) {
      out.push({ points: normalized });
    }
  }

  return out;
}

function trimStrokes(strokes: ScribbleStroke[]): ScribbleStroke[] {
  const out: ScribbleStroke[] = [];
  let pointCount = 0;
  for (const stroke of strokes.slice(0, SCRIBBLE_STROKE_MAX)) {
    const points = stroke.points?.filter(
      (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
    ) ?? [];
    if (points.length < 2) continue;
    const remaining = SCRIBBLE_POINTS_MAX - pointCount;
    if (remaining <= 0) break;
    const clipped = points.slice(0, remaining);
    pointCount += clipped.length;
    out.push({ points: clipped });
  }
  return out;
}

function scheduleBotDrawTimes(room: ScribbleTimeRoom): void {
  room.scribbleBotDrawAt.clear();
  for (const id of artistIds(room)) {
    if (isBot(id)) {
      room.scribbleBotDrawAt.set(id, botDrawDelayMs(id));
    }
  }
}

export function initScribbleTime(room: ScribbleTimeRoom): void {
  room.scribblePhase = 'prompt';
  room.scribblePrompterId = pickRandomPrompter(room);
  room.scribblePrompt = null;
  room.scribbleDrawings.clear();
  room.scribbleBotDrawAt.clear();
  room.scribbleDrawMsLeft = SCRIBBLE_DRAW_SECONDS * 1000;
  room.scribbleDrawTimer = 0;
  room.winnerId = null;
}

export function setScribblePrompt(
  room: ScribbleTimeRoom,
  playerId: string,
  prompt: string,
): boolean {
  if (room.activeGameId !== 'scribble-time' || room.phase !== 'playing') return false;
  if (room.scribblePhase !== 'prompt') return false;
  if (playerId !== room.scribblePrompterId) return false;

  const text = prompt.trim().slice(0, SCRIBBLE_PROMPT_MAX_LENGTH);
  if (!text) return false;

  room.scribblePrompt = text;
  room.scribblePhase = 'draw';
  room.scribbleDrawMsLeft = SCRIBBLE_DRAW_SECONDS * 1000;
  room.scribbleDrawTimer = 0;
  room.scribbleDrawings.clear();
  scheduleBotDrawTimes(room);
  return true;
}

export function setScribbleDrawing(
  room: ScribbleTimeRoom,
  playerId: string,
  strokes: ScribbleStroke[] | unknown,
): boolean {
  if (room.activeGameId !== 'scribble-time' || room.phase !== 'playing') return false;
  if (room.scribblePhase !== 'draw' && room.scribblePhase !== 'pick') return false;
  if (playerId === room.scribblePrompterId) return false;
  if (!artistIds(room).includes(playerId)) return false;

  const normalized = trimStrokes(normalizeScribbleStrokes(strokes));
  room.scribbleDrawings.set(playerId, normalized);
  return true;
}

function allArtistsSubmitted(room: ScribbleTimeRoom): boolean {
  const artists = artistIds(room);
  return artists.length > 0 && artists.every((id) => room.scribbleDrawings.has(id));
}

function beginPickPhase(room: ScribbleTimeRoom): void {
  for (const id of artistIds(room)) {
    if (!room.scribbleDrawings.has(id)) {
      room.scribbleDrawings.set(id, isBot(id) ? botScribbleStrokes(id) : []);
    }
  }
  room.scribblePhase = 'pick';
  room.scribbleDrawMsLeft = 0;
  room.scribbleDrawTimer = 0;
}

export function pickScribbleFavorite(
  room: ScribbleTimeRoom,
  prompterId: string,
  artistId: string,
): boolean {
  if (room.activeGameId !== 'scribble-time' || room.phase !== 'playing') return false;
  if (room.scribblePhase !== 'pick') return false;
  if (prompterId !== room.scribblePrompterId) return false;
  if (!artistIds(room).includes(artistId)) return false;

  room.winnerId = artistId;
  room.phase = 'winner';
  room.scribblePhase = null;
  return true;
}

export function tickScribbleTime(room: ScribbleTimeRoom, dtMs: number): void {
  if (room.activeGameId !== 'scribble-time' || room.phase !== 'playing') return;

  if (room.scribblePhase === 'prompt' && room.scribblePrompterId && isBot(room.scribblePrompterId)) {
    room.scribbleDrawTimer += dtMs;
    if (room.scribbleDrawTimer >= SCRIBBLE_BOT_PROMPT_DELAY_MS) {
      const prompt = BOT_PROMPTS[Math.floor(Math.random() * BOT_PROMPTS.length)];
      setScribblePrompt(room, room.scribblePrompterId, prompt);
    }
    return;
  }

  if (room.scribblePhase === 'pick' && room.scribblePrompterId && isBot(room.scribblePrompterId)) {
    room.scribbleDrawTimer += dtMs;
    if (room.scribbleDrawTimer >= SCRIBBLE_BOT_PICK_DELAY_MS) {
      const artists = artistIds(room);
      if (artists.length > 0) {
        const pick = artists[Math.floor(Math.random() * artists.length)];
        pickScribbleFavorite(room, room.scribblePrompterId, pick);
      }
    }
    return;
  }

  if (room.scribblePhase !== 'draw') return;

  tickScribbleBots(room);

  room.scribbleDrawMsLeft = Math.max(0, room.scribbleDrawMsLeft - dtMs);

  if (room.scribbleDrawMsLeft <= 0 || allArtistsSubmitted(room)) {
    beginPickPhase(room);
  }
}

export function serializeScribbleDrawings(room: ScribbleTimeRoom): ScribbleDrawing[] {
  return artistIds(room).map((playerId) => ({
    playerId,
    strokes: room.scribbleDrawings.get(playerId) ?? [],
  }));
}

export function clearScribbleTimeState(room: ScribbleTimeRoom): void {
  room.scribblePhase = null;
  room.scribblePrompterId = null;
  room.scribblePrompt = null;
  room.scribbleDrawings.clear();
  room.scribbleBotDrawAt.clear();
  room.scribbleDrawMsLeft = 0;
  room.scribbleDrawTimer = 0;
}

export function tickScribbleBots(room: ScribbleTimeRoom): void {
  if (room.scribblePhase !== 'draw') return;

  const drawElapsed = SCRIBBLE_DRAW_SECONDS * 1000 - room.scribbleDrawMsLeft;

  for (const id of artistIds(room)) {
    if (!isBot(id) || room.scribbleDrawings.has(id)) continue;
    const readyAt = room.scribbleBotDrawAt.get(id) ?? SCRIBBLE_BOT_DRAW_MIN_MS;
    if (drawElapsed >= readyAt) {
      room.scribbleDrawings.set(id, botScribbleStrokes(id));
    }
  }
}
