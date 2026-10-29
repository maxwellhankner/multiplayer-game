export type SessionMode = 'pc-host' | 'local-controllers' | 'mobile-only' | 'personal-computers';

export interface SessionModeInfo {
  id: SessionMode;
  title: string;
  description: string;
}

/** Order matters — shown top to bottom on host setup */
export const SESSION_MODES: SessionModeInfo[] = [
  {
    id: 'local-controllers',
    title: 'PC Host with Controllers',
    description: 'This screen shows the game. Controllers or a keyboard.',
  },
  {
    id: 'pc-host',
    title: 'PC Host with Mobile Devices',
    description: 'This screen shows the game. Phones are the controllers.',
  },
  {
    id: 'mobile-only',
    title: 'Mobile Devices Only',
    description: 'Each player uses a phone for both the game and controls.',
  },
  {
    id: 'personal-computers',
    title: 'Personal Computers',
    description: 'Each player uses their own computer with a full screen.',
  },
];

export function getSessionModeLabel(mode: SessionMode): string {
  return SESSION_MODES.find((m) => m.id === mode)?.title ?? mode;
}

export function getSessionModeInfo(mode: SessionMode): SessionModeInfo | undefined {
  return SESSION_MODES.find((m) => m.id === mode);
}

/** Map legacy session mode ids from earlier builds */
export function normalizeSessionMode(value: string | null | undefined): SessionMode | null {
  if (!value) return null;
  if (value === 'living-room') return 'pc-host';
  if (value === 'remote') return 'personal-computers';
  if (
    value === 'pc-host' ||
    value === 'local-controllers' ||
    value === 'mobile-only' ||
    value === 'personal-computers'
  ) {
    return value;
  }
  return null;
}

export function isSessionMode(value: unknown): value is SessionMode {
  return normalizeSessionMode(typeof value === 'string' ? value : null) === value;
}
