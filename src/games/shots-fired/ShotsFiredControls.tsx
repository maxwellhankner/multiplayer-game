import { useEffect, useRef } from 'react';
import type { CoinStickInput } from '../../../shared/types';
import MobileControllerCountdown from '../../components/mobile/MobileControllerCountdown';
import VirtualJoystick from '../coin-rush/VirtualJoystick';
import ShotsFiredHealthBar from './ShotsFiredHealthBar';

interface ShotsFiredControlsProps {
  playerName: string;
  playerColor: string;
  kills: number;
  hitsLeft: number;
  onInput: (input: CoinStickInput) => void;
  onShoot: () => void;
  onMelee: () => void;
  onJump: () => void;
  countdown?: number | string;
  countdownHint?: string;
  waitingHint?: string;
}

const ZERO: CoinStickInput = { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };

export default function ShotsFiredControls({
  playerName,
  playerColor,
  kills,
  hitsLeft,
  onInput,
  onShoot,
  onMelee,
  onJump,
  countdown,
  countdownHint,
  waitingHint,
}: ShotsFiredControlsProps) {
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
    <div className="controller-game-play shots-fired-landscape-play">
      {countdown !== undefined && countdownHint && (
        <MobileControllerCountdown count={countdown} hint={countdownHint} overlay />
      )}
      {waitingHint && (
        <div className="controller-orient-waiting-overlay" aria-live="polite">
          <p>{waitingHint}</p>
        </div>
      )}
      <div className="shots-fired-controller-top-hud">
        <span className="shots-fired-controller-name">{playerName}</span>
        <ShotsFiredHealthBar lives={hitsLeft} className="shots-fired-health-bar--controller" />
        <span className="shots-fired-kills-line">Kills: {kills}</span>
      </div>
      <VirtualJoystick label="Move" className="shots-fired-move-joystick" onChange={setMove} />
      <div className="shots-fired-action-grid">
        <button
          type="button"
          className="shots-fired-action-btn shots-fired-melee-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            onMelee();
          }}
          aria-label="Melee attack"
        >
          MELEE
        </button>
        <button
          type="button"
          className="shots-fired-action-btn shots-fired-jump-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            onJump();
          }}
          aria-label="Jump"
        >
          JUMP
        </button>
        <button
          type="button"
          className="shots-fired-action-btn shots-fired-fire-btn"
          style={{ backgroundColor: playerColor }}
          onPointerDown={(e) => {
            e.preventDefault();
            onShoot();
          }}
          aria-label="Fire pistol"
        >
          FIRE
        </button>
        <VirtualJoystick label="Look" className="shots-fired-look-joystick" onChange={setLook} />
      </div>
    </div>
  );
}
