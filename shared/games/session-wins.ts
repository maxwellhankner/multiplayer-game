import { getBalloonTeam, isBalloonTeamMode } from './balloon-drop/teams';
import type { PlayerState } from '../types';

export function getSessionWinPlayerIds(
  activeGameId: string | null,
  players: PlayerState[],
  winnerId: string | null,
): string[] {
  if (!winnerId || !activeGameId) return [];

  const count = players.length;

  if (activeGameId === 'balloon-drop' && isBalloonTeamMode(count)) {
    const winner = players.find((p) => p.id === winnerId);
    if (!winner) return [];
    const team = getBalloonTeam(winner.lane, count);
    return players.filter((p) => getBalloonTeam(p.lane, count) === team).map((p) => p.id);
  }

  return [winnerId];
}
