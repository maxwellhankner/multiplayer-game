import {
  getBalloonTeam,
  isBalloonTeamMode,
} from '../../../shared/games/balloon-drop/teams';
import type { RoomState } from '../../../shared/types';
import GamePhaseWinner from '../shared/GamePhaseWinner';

interface BalloonDropWinnerProps {
  state: RoomState;
}

function formatSeconds(ms: number): string {
  return `${Math.floor(ms / 1000)}s`;
}

function getWinnerNames(state: RoomState): string[] {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  if (!winner) return [];

  const playerCount = state.players.length;
  if (isBalloonTeamMode(playerCount)) {
    const team = getBalloonTeam(winner.lane, playerCount);
    return state.players
      .filter((p) => getBalloonTeam(p.lane, playerCount) === team)
      .sort((a, b) => a.lane - b.lane)
      .map((p) => p.name);
  }

  return [winner.name];
}

function getWinnerIds(state: RoomState): Set<string> | undefined {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  if (!winner) return undefined;

  const playerCount = state.players.length;
  if (isBalloonTeamMode(playerCount)) {
    const team = getBalloonTeam(winner.lane, playerCount);
    return new Set(
      state.players
        .filter((p) => getBalloonTeam(p.lane, playerCount) === team)
        .map((p) => p.id),
    );
  }

  return new Set([winner.id]);
}

function getStat(state: RoomState): string {
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  if (!winner) return 'Every balloon hit the floor';

  if (state.players.length === 1) {
    const seconds = formatSeconds(winner.score || state.gameTime);
    return `${seconds} keeping the balloon up`;
  }

  if (isBalloonTeamMode(state.players.length)) {
    return 'Last team with a balloon in the air';
  }

  return 'Last player with a balloon in the air';
}

export default function BalloonDropWinner({ state }: BalloonDropWinnerProps) {
  return (
    <GamePhaseWinner
      icon="🎈"
      winnerNames={getWinnerNames(state)}
      stat={getStat(state)}
      players={state.players}
      winnerIds={getWinnerIds(state)}
    />
  );
}
