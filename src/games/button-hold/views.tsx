import Scoreboard from '../shared/Scoreboard';
import ScoreGameWinner from '../shared/ScoreGameWinner';
import { formatHoldMs } from '../shared/simple-game';
import type { GameControllerProps, GameHostProps } from '../types';

export function ButtonHoldHostView({ state }: GameHostProps) {
  return (
    <>
      <Scoreboard state={state} title="Button Hold" scoreLabel={formatHoldMs} />
      {state.phase === 'winner' && (
        <ScoreGameWinner state={state} scoreLabel={(score) => formatHoldMs(score)} />
      )}
    </>
  );
}

export function ButtonHoldControllerView({
  state,
  playerId,
  onHoldStart,
  onHoldEnd,
}: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return null;

  if (state.phase === 'countdown') {
    return (
      <div className="controller-game-center">
        <div className="countdown-mobile">{state.countdown > 0 ? state.countdown : 'GO!'}</div>
        <p className="controller-game-hint">Get ready to hold</p>
      </div>
    );
  }

  if (state.phase === 'playing') {
    return (
      <>
        <div className="hud">
          <span style={{ color: me.color }}>{me.name}</span>
          <span className="simple-game-hud-score">Best {formatHoldMs(me.score)}</span>
        </div>
        <div className="controller-game-center">
          <button
            type="button"
            className={`btn-game-action${me.holding ? ' btn-game-action--active' : ''}`}
            onTouchStart={(e) => {
              e.preventDefault();
              onHoldStart?.();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onHoldEnd?.();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              onHoldStart?.();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              onHoldEnd?.();
            }}
            onMouseLeave={() => {
              if (me.holding) onHoldEnd?.();
            }}
          >
            {me.holding ? 'HOLDING…' : 'HOLD'}
          </button>
        </div>
      </>
    );
  }

  return null;
}
