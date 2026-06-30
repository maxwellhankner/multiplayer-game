/** Guest room URL path segment (no trailing slash) */
export const ROOM_PATH = '/room';

/** Host room URL path segment (no trailing slash) */
export const HOST_PATH = '/host';

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
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
