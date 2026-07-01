import { useEffect, useRef } from 'react';
import type { DrunkDriverInput } from '../../../shared/types';
import { DrunkDriverSpotlight } from './DrunkDriverPaneGrid';
import SteerPad from './SteerPad';

interface DrunkDriverControlsProps {
  playerName: string;
  playerColor: string;
  progressPct: number;
  onInput: (input: DrunkDriverInput) => void;
  startLight?: boolean;
  countdown?: number;
  waitingHint?: string;
}

const ZERO: DrunkDriverInput = { gas: false, steer: 0 };

export default function DrunkDriverControls({
  playerName,
  playerColor,
  progressPct,
  onInput,
  startLight = false,
  countdown = 3,
  waitingHint,
}: DrunkDriverControlsProps) {
  const inputRef = useRef<DrunkDriverInput>({ ...ZERO });

  useEffect(() => {
    let raf = 0;
    const send = () => {
      onInput(inputRef.current);
      raf = requestAnimationFrame(send);
    };
    raf = requestAnimationFrame(send);
    return () => cancelAnimationFrame(raf);
  }, [onInput]);

  const setSteer = (steer: number) => {
    inputRef.current = { ...inputRef.current, steer };
  };

  const setGas = (gas: boolean) => {
    inputRef.current = { ...inputRef.current, gas };
  };

  return (
    <div className="controller-game-play drunk-driver-landscape-play">
      {startLight && (
        <div className="drunk-driver-mobile-startlight">
          <DrunkDriverSpotlight countdown={countdown > 0 ? countdown : 1} />
        </div>
      )}
      {waitingHint && (
        <div className="controller-orient-waiting-overlay" aria-live="polite">
          <p>{waitingHint}</p>
        </div>
      )}
      <div className="controller-game-hud">
        <span style={{ color: playerColor }}>{playerName}</span>
        <span className="controller-game-hud-muted">{progressPct}%</span>
      </div>
      <button
        type="button"
        className="drunk-driver-gas-pedal"
        aria-label="Gas pedal"
        onPointerDown={() => setGas(true)}
        onPointerUp={() => setGas(false)}
        onPointerLeave={() => setGas(false)}
        onPointerCancel={() => setGas(false)}
      >
        GAS
      </button>
      <SteerPad onChange={setSteer} />
    </div>
  );
}
