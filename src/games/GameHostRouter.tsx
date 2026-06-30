import type { RoomState } from '../../shared/types';
import { getGameClientModule, getGameThemeClass } from './registry';

interface GameHostRouterProps {
  state: RoomState;
}

export default function GameHostRouter({ state }: GameHostRouterProps) {
  const gameId = state.activeGameId;
  const module = getGameClientModule(gameId);
  const themeClass = getGameThemeClass(gameId);

  if (!module || !gameId) {
    return (
      <div className="game-placeholder">
        <p>No active game</p>
      </div>
    );
  }

  const { HostView } = module;
  return (
    <div className={`game-view ${themeClass}`.trim()}>
      <HostView state={state} />
    </div>
  );
}
