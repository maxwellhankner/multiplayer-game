export type SessionMode = 'pc-host' | 'mobile-only' | 'personal-computers';

export interface SessionModeInfo {
  id: SessionMode;
  title: string;
  description: string;
}

/** Order matters — shown top to bottom on host setup */
export const SESSION_MODES: SessionModeInfo[] = [
  {
    id: 'pc-host',
    title: 'PC Host with Mobile Devices',
    description:
      'One computer shows the game on a big screen. Phones join as controllers — best in person on the same Wi‑Fi or local network.',
  },
  {
    id: 'mobile-only',
    title: 'Mobile Devices Only',
    description:
      'No PC. Every player uses their phone for the game and controls — works on cellular or any network, together or apart.',
  },
  {
    id: 'personal-computers',
    title: 'Personal Computers',
    description:
      'Everyone plays on their own computer with a full screen — join over the internet from separate locations.',
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
  if (value === 'pc-host' || value === 'mobile-only' || value === 'personal-computers') {
    return value;
  }
  return null;
}
