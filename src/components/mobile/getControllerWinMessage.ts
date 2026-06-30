import { getBalloonTeam, isBalloonTeamMode } from '../../../shared/games/balloon-drop/teams';
import type { PlayerState, RoomState } from '../../../shared/types';

export interface ControllerWinMessage {
  title: string;
  subtitle?: string;
}

function formatNamesWon(names: string[]): string {
  if (names.length === 0) return 'Round over';
  if (names.length === 1) return `${names[0]} won!`;
  if (names.length === 2) return `${names[0]} and ${names[1]} won!`;
  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(', ');
  return `${rest}, and ${last} won!`;
}

function youAndTeammatesWon(playerId: string, teammates: PlayerState[]): string {
  const others = teammates.filter((p) => p.id !== playerId).map((p) => p.name);
  if (others.length === 0) return 'You won!';
  if (others.length === 1) return `You and ${others[0]} won!`;
  if (others.length === 2) return `You, ${others[0]}, and ${others[1]} won!`;
  return `You and ${others.length} teammates won!`;
}

export function getControllerWinMessage(state: RoomState, playerId: string): ControllerWinMessage {
  const me = state.players.find((p) => p.id === playerId);
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const playerCount = state.players.length;
  const gameId = state.activeGameId;

  if (!me) {
    return { title: 'Round over' };
  }

  if (!state.winnerId || !winner) {
    return { title: 'Round over', subtitle: "It's a tie" };
  }

  if (gameId === 'balloon-drop' && playerCount === 1) {
    const seconds = Math.floor((me.score || state.gameTime) / 1000);
    return { title: 'Nice run!', subtitle: `You survived ${seconds}s` };
  }

  if (gameId === 'balloon-drop' && isBalloonTeamMode(playerCount)) {
    const winningTeam = getBalloonTeam(winner.lane, playerCount);
    const winningTeamPlayers = state.players
      .filter((p) => getBalloonTeam(p.lane, playerCount) === winningTeam)
      .sort((a, b) => a.lane - b.lane);
    const myTeam = getBalloonTeam(me.lane, playerCount);

    if (myTeam === winningTeam) {
      return { title: youAndTeammatesWon(playerId, winningTeamPlayers) };
    }

    return { title: formatNamesWon(winningTeamPlayers.map((p) => p.name)) };
  }

  if (gameId === 'scribble-time') {
    const prompter = state.scribblePrompterId
      ? state.players.find((p) => p.id === state.scribblePrompterId)
      : null;
    if (state.winnerId === playerId) {
      return {
        title: 'Your drawing was picked!',
        subtitle: prompter ? `${prompter.name} loved your scribble` : undefined,
      };
    }
    if (state.scribblePrompterId === playerId) {
      return { title: `${winner.name} won!`, subtitle: 'Thanks for judging' };
    }
    return { title: `${winner.name} won!` };
  }

  if (state.winnerId === playerId) {
    return { title: 'You won!' };
  }

  return { title: `${winner.name} won!` };
}
