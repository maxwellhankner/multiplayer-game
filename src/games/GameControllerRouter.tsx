import type { BalloonInput, CoinStickInput, DrunkDriverInput, RoomState, ScribbleStroke } from '../../shared/types';
import { getGameClientModule, getGameThemeClass } from './registry';

interface GameControllerRouterProps {
  state: RoomState;
  playerId: string;
  onJump: () => void;
  onCoinInput: (input: CoinStickInput) => void;
  onBalloonInput: (input: BalloonInput) => void;
  onDrunkInput: (input: DrunkDriverInput) => void;
  onScribblePrompt: (prompt: string) => void;
  onScribbleDraw: (strokes: ScribbleStroke[]) => void;
  onScribblePick: (artistId: string) => void;
  onLandscapeReady: () => void;
}

export default function GameControllerRouter({
  state,
  playerId,
  onJump,
  onCoinInput,
  onBalloonInput,
  onDrunkInput,
  onScribblePrompt,
  onScribbleDraw,
  onScribblePick,
  onLandscapeReady,
}: GameControllerRouterProps) {
  const gameId = state.activeGameId;
  const module = getGameClientModule(gameId);
  const themeClass = getGameThemeClass(gameId);

  if (!module?.ControllerView || !gameId) {
    return <p className="status-msg">Waiting for game…</p>;
  }

  const { ControllerView } = module;

  if (state.phase === 'orient' || state.phase === 'countdown' || state.phase === 'playing') {
    return (
      <div className={`${themeClass} controller-game`.trim()}>
        <ControllerView
          state={state}
          playerId={playerId}
          onJump={onJump}
          onCoinInput={onCoinInput}
          onBalloonInput={onBalloonInput}
          onDrunkInput={onDrunkInput}
          onScribblePrompt={onScribblePrompt}
          onScribbleDraw={onScribbleDraw}
          onScribblePick={onScribblePick}
          onLandscapeReady={onLandscapeReady}
        />
      </div>
    );
  }

  return null;
}
