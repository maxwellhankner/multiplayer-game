import Scoreboard from '../shared/Scoreboard';
import ScoreGameWinner from '../shared/ScoreGameWinner';
import { getSecondsLeft } from '../shared/simple-game';
import type { GameControllerProps, GameHostProps } from '../types';

export function TapCounterHostView({ state }: GameHostProps) {
  return (
    <>
      <Scoreboard state={state} title="Tap Counter" scoreLabel={(score) => String(score)} />
      {state.phase === 'winner' && (
        <ScoreGameWinner state={state} scoreLabel={(score) => `${score} taps`} />
      )}
    </>
  );
}

export function TapCounterControllerView({ state, playerId, onTap }: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return null;

  if (state.phase === 'countdown') {
    return (
      <div className="controller-game-center">
        <div className="countdown-mobile">{state.countdown > 0 ? state.countdown : 'GO!'}</div>
        <p className="controller-game-hint">Get ready to tap</p>
      </div>
    );
  }

  if (state.phase === 'playing') {
    return (
      <div className="controller-game-playing">
        <div className="hud">
          <span className="hud-player" style={{ color: me.color }}>
            {me.name}
          </span>
          <span className="simple-game-hud-score">
            {me.score} taps · {getSecondsLeft(state.gameTime)}s
          </span>
        </div>
        <div className="controller-game-center">
          <button
            type="button"
            className="btn-game-action"
            onTouchStart={(e) => {
              e.preventDefault();
              onTap?.();
            }}
            onClick={() => onTap?.()}
          >
            TAP
          </button>
        </div>
      </div>
    );
  }

  return null;
}
