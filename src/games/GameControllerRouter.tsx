import type { RoomState } from '../../shared/types';
import { getGameClientModule, getGameThemeClass } from './registry';

interface GameControllerRouterProps {
  state: RoomState;
  playerId: string;
  onJump: () => void;
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}

export default function GameControllerRouter({
  state,
  playerId,
  onJump,
  onTap,
  onHoldStart,
  onHoldEnd,
}: GameControllerRouterProps) {
  const gameId = state.activeGameId;
  const module = getGameClientModule(gameId);
  const themeClass = getGameThemeClass(gameId);

  if (!module?.ControllerView || !gameId) {
    return <p className="status-msg">Waiting for game…</p>;
  }

  const { ControllerView } = module;

  if (state.phase === 'countdown' || state.phase === 'playing') {
    return (
      <div className={`${themeClass} controller-game`.trim()}>
        <ControllerView
          state={state}
          playerId={playerId}
          onJump={onJump}
          onTap={onTap}
          onHoldStart={onHoldStart}
          onHoldEnd={onHoldEnd}
        />
      </div>
    );
  }

  return null;
}
