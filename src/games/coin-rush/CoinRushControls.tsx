import { useEffect, useRef } from 'react';
import type { CoinStickInput } from '../../../shared/types';
import MobileControllerCountdown from '../../components/mobile/MobileControllerCountdown';
import VirtualJoystick from './VirtualJoystick';

interface CoinRushControlsProps {
  playerName: string;
  playerColor: string;
  score: number;
  winCoins: number;
  onInput: (input: CoinStickInput) => void;
  countdown?: number | string;
  countdownHint?: string;
  waitingHint?: string;
}

const ZERO: CoinStickInput = { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };

export default function CoinRushControls({
  playerName,
  playerColor,
  score,
  winCoins,
  onInput,
  countdown,
  countdownHint,
  waitingHint,
}: CoinRushControlsProps) {
  const inputRef = useRef<CoinStickInput>({ ...ZERO });

  useEffect(() => {
    let raf = 0;
    const send = () => {
      onInput(inputRef.current);
      raf = requestAnimationFrame(send);
    };
    raf = requestAnimationFrame(send);
    return () => cancelAnimationFrame(raf);
  }, [onInput]);

  const setMove = (moveX: number, moveY: number) => {
    inputRef.current = { ...inputRef.current, moveX, moveY };
  };

  const setLook = (lookX: number, lookY: number) => {
    inputRef.current = { ...inputRef.current, lookX, lookY };
  };

  return (
    <div className="controller-game-play coin-rush-landscape-play">
      {countdown !== undefined && countdownHint && (
        <MobileControllerCountdown count={countdown} hint={countdownHint} overlay />
      )}
      {waitingHint && (
        <div className="controller-orient-waiting-overlay" aria-live="polite">
          <p>{waitingHint}</p>
        </div>
      )}
      <div className="controller-game-hud">
        <span style={{ color: playerColor }}>{playerName}</span>
        <span className="controller-game-hud-muted">
          {score}/{winCoins}
        </span>
      </div>
      <VirtualJoystick label="Move" className="controller-joystick--left" onChange={setMove} />
      <VirtualJoystick label="Look" className="controller-joystick--right" onChange={setLook} />
    </div>
  );
}
