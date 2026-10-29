export const SHOOTERS_KILL_OPTIONS = [5, 10, 15, 20] as const;
export const SHOOTERS_TIME_OPTIONS = [1, 5, 10, 0] as const;

export type ShootersKillTarget = (typeof SHOOTERS_KILL_OPTIONS)[number];
/** Minutes. 0 is no time limit. */
export type ShootersTimeLimit = (typeof SHOOTERS_TIME_OPTIONS)[number];
export type ShootersWinMode = 'kills' | 'timed';

export interface ShootersShootLobbySettings {
  winMode: ShootersWinMode;
  killsToWin: ShootersKillTarget;
  timeLimitMin: ShootersTimeLimit;
}

export function defaultShootersShootSettings(): ShootersShootLobbySettings {
  return { winMode: 'kills', killsToWin: 10, timeLimitMin: 5 };
}

export function normalizeShootersShootSettings(
  value: Partial<ShootersShootLobbySettings> | null | undefined,
): ShootersShootLobbySettings {
  const base = defaultShootersShootSettings();
  const killsToWin = SHOOTERS_KILL_OPTIONS.find((option) => option === value?.killsToWin) ?? base.killsToWin;
  const timeLimitMin = SHOOTERS_TIME_OPTIONS.find((option) => option === value?.timeLimitMin) ?? base.timeLimitMin;
  return {
    winMode: value?.winMode === 'timed' ? 'timed' : 'kills',
    killsToWin,
    timeLimitMin,
  };
}

export function shootersTimeLabel(minutes: ShootersTimeLimit): string {
  return minutes === 0 ? 'Unlimited' : `${minutes} min`;
}

/** Players come back after a death instead of sitting out the round. */
export function shootersShootRespawns(settings: ShootersShootLobbySettings): boolean {
  if (settings.winMode === 'kills') return true;
  return settings.timeLimitMin > 0;
}

export function shootersShootRuleLabel(settings: ShootersShootLobbySettings): string {
  if (settings.winMode === 'kills') return `First to ${settings.killsToWin} kills`;
  if (settings.timeLimitMin === 0) return 'Last player standing';
  return `${settings.timeLimitMin} min · most kills`;
}

export function shootersShootTimeLimitMs(settings: ShootersShootLobbySettings): number | null {
  if (settings.winMode !== 'timed' || settings.timeLimitMin <= 0) return null;
  return settings.timeLimitMin * 60_000;
}
