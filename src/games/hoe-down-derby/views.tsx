import GameCanvas from './GameCanvas';
import WinnerScreen from './WinnerScreen';
import type { GameControllerProps, GameHostProps } from '../types';

export function HoeDownHostView({ state }: GameHostProps) {
  return (
    <>
      <GameCanvas state={state} />
      {state.phase === 'winner' && <WinnerScreen state={state} />}
    </>
  );
}

export function HoeDownControllerView({ state, playerId, onJump }: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return null;

  if (state.phase === 'countdown') {
    return (
      <div className="controller-game-center">
        <div className="countdown-mobile">{state.countdown > 0 ? state.countdown : 'GO!'}</div>
        <p className="controller-game-hint">Get ready to jump</p>
      </div>
    );
  }

  if (state.phase === 'playing') {
    return (
      <>
        <div className="hud">
          <span style={{ color: me.color }}>{me.name}</span>
          <span className="apples-display">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < me.lives ? 'filled' : 'empty'}>
                🍎
              </span>
            ))}
          </span>
        </div>
        <div className="controller-game-center">
          {me.eliminated ? (
            <div className="eliminated-msg">
              <p>You're out</p>
              <p>Watch the main screen</p>
            </div>
          ) : (
            <button
              className="btn-jump"
              onTouchStart={(e) => {
                e.preventDefault();
                onJump?.();
              }}
              onClick={() => onJump?.()}
            >
              JUMP
            </button>
          )}
        </div>
      </>
    );
  }

  return null;
}
