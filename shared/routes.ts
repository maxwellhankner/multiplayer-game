/** Guest room URL path segment (no trailing slash) */
export const ROOM_PATH = '/room';

/** Host room URL path segment (no trailing slash) */
export const HOST_PATH = '/host';

export const ROOM_CODE_LENGTH = 4;

/** Letters only — excludes I and O to reduce confusion when reading codes aloud */
const ROOM_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function normalizeRoomCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

export function isValidRoomCode(code: string): boolean {
  const normalized = normalizeRoomCode(code);
  return normalized.length === ROOM_CODE_LENGTH;
}

export function randomRoomCode(): string {
  let id = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    id += ROOM_CODE_LETTERS[Math.floor(Math.random() * ROOM_CODE_LETTERS.length)];
  }
  return id;
}

export function guestRoomPath(code: string): string {
  return `${ROOM_PATH}/${normalizeRoomCode(code)}`;
}

export function hostRoomPath(code: string): string {
  return `${HOST_PATH}/${normalizeRoomCode(code)}`;
}

export function guestRoomUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, '');
  if (!code) return `${base}${ROOM_PATH}`;
  return `${base}${guestRoomPath(code)}`;
}

export function hostRoomUrl(origin: string, code: string): string {
  return `${origin}${hostRoomPath(code)}`;
}
