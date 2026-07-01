import { useCallback, useEffect, useRef } from 'react';
import type { BalloonInput } from '../../../shared/types';
import MobileControllerCountdown from '../../components/mobile/MobileControllerCountdown';

interface BalloonDropControlsProps {
  playerName: string;
  playerColor: string;
  eliminated: boolean;
  solo: boolean;
  survivalMs: number;
  onInput: (input: BalloonInput) => void;
  countdown?: number | string;
  countdownHint?: string;
}

export default function BalloonDropControls({
  playerName,
  playerColor,
  eliminated,
  solo,
  survivalMs,
  onInput,
  countdown,
  countdownHint,
}: BalloonDropControlsProps) {
  const moveRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    const send = () => {
      onInput({ moveX: moveRef.current });
      raf = requestAnimationFrame(send);
    };
    raf = requestAnimationFrame(send);
    return () => cancelAnimationFrame(raf);
  }, [onInput]);

  const setMove = useCallback((dir: -1 | 0 | 1) => {
    moveRef.current = dir;
  }, []);

  if (eliminated) {
    return (
      <div className="controller-game-eliminated">
        <p className="controller-game-eliminated-title">Balloon hit the floor!</p>
        {solo && (
          <p className="controller-game-eliminated-detail">
            {Math.floor(survivalMs / 1000)}s survived
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="controller-game-play">
      {countdown !== undefined && countdownHint && (
        <MobileControllerCountdown count={countdown} hint={countdownHint} overlay />
      )}
      <div className="controller-game-hud">
        <span className="game-player-name" style={{ color: playerColor }}>{playerName}</span>
        {solo && (
          <span className="controller-game-hud-muted">{Math.floor(survivalMs / 1000)}s</span>
        )}
      </div>
      <div className="controller-game-btn-pad">
        <button
          type="button"
          className="controller-game-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            setMove(-1);
          }}
          onPointerUp={() => setMove(0)}
          onPointerLeave={() => setMove(0)}
          onPointerCancel={() => setMove(0)}
        >
          ◀ Left
        </button>
        <button
          type="button"
          className="controller-game-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            setMove(1);
          }}
          onPointerUp={() => setMove(0)}
          onPointerLeave={() => setMove(0)}
          onPointerCancel={() => setMove(0)}
        >
          Right ▶
        </button>
      </div>
    </div>
  );
}
