import { getLobbyGameList } from '../../../shared/platform';
import type { RoomState } from '../../../shared/types';

export function isCoinRushInLobby(state: RoomState): boolean {
  return getLobbyGameList(state.sessionMode, state.lobbySettings).some((g) => g.id === 'coin-rush');
}
