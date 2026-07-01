import GameCanvas from './GameCanvas';
import WinnerScreen from './WinnerScreen';
import GameCountdown from '../shared/GameCountdown';
import MobileControllerCountdown from '../../components/mobile/MobileControllerCountdown';
import type { GameControllerProps, GameHostProps } from '../types';

export function HoeDownHostView({ state }: GameHostProps) {
  return (
    <>
      <GameCanvas state={state} />
      {state.phase === 'countdown' && (
        <GameCountdown
          count={state.countdown > 0 ? state.countdown : 'GO!'}
          hint="Get ready to jump"
        />
      )}
      {state.phase === 'winner' && <WinnerScreen state={state} />}
    </>
  );
}

export function HoeDownControllerView({ state, playerId, onJump }: GameControllerProps) {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return null;

  if (state.phase === 'countdown' || state.phase === 'playing') {
    const inCountdown = state.phase === 'countdown';
    return (
      <div className="controller-game-play">
        {inCountdown && (
          <MobileControllerCountdown
            count={state.countdown > 0 ? state.countdown : 'GO!'}
            hint="Get ready to jump"
            overlay
          />
        )}
        <div className="controller-game-hud">
          <span className="game-player-name" style={{ color: me.color }}>{me.name}</span>
          <span className="controller-game-hud-muted apples-display">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < me.lives ? 'filled' : 'empty'}>
                🍎
              </span>
            ))}
          </span>
        </div>
        <div className="controller-game-center">
          {me.eliminated ? (
            <div className="controller-game-eliminated">
              <p className="controller-game-eliminated-title">You&apos;re out</p>
              <p className="controller-game-eliminated-detail">Watch the main screen</p>
            </div>
          ) : (
            <button
              type="button"
              className="controller-game-btn controller-game-btn--action"
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
      </div>
    );
  }

  return null;
}
