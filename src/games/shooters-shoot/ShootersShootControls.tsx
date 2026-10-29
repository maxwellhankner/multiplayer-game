import { useEffect, useRef } from 'react';
import type { CoinStickInput } from '../../../shared/types';
import MobileControllerCountdown from '../../components/mobile/MobileControllerCountdown';
import VirtualJoystick from '../coin-rush/VirtualJoystick';
import ShootersShootHealthBar from './ShootersShootHealthBar';

interface ShootersShootControlsProps {
  playerName: string;
  playerColor: string;
  kills: number;
  hitsLeft: number;
  bullets: number;
  ammoReserve: number;
  gunName?: string;
  onInput: (input: CoinStickInput) => void;
  onShoot: () => void;
  onMelee: () => void;
  onJump: () => void;
  onReload: () => void;
  countdown?: number | string;
  countdownHint?: string;
  waitingHint?: string;
}

const ZERO: CoinStickInput = { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };

export default function ShootersShootControls({
  playerName,
  playerColor,
  kills,
  hitsLeft,
  bullets,
  ammoReserve,
  gunName,
  onInput,
  onShoot,
  onMelee,
  onJump,
  onReload,
  countdown,
  countdownHint,
  waitingHint,
}: ShootersShootControlsProps) {
  const inputRef = useRef<CoinStickInput>({ ...ZERO });
  const stanceRef = useRef({ sprint: false, crouch: false });

  useEffect(() => {
    let raf = 0;
    const send = () => {
      onInput({
        ...inputRef.current,
        sprint: stanceRef.current.sprint,
        crouch: stanceRef.current.crouch,
      });
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
    <div className="controller-game-play shooters-shoot-landscape-play">
      {countdown !== undefined && countdownHint && (
        <MobileControllerCountdown count={countdown} hint={countdownHint} overlay />
      )}
      {waitingHint && (
        <div className="controller-orient-waiting-overlay" aria-live="polite">
          <p>{waitingHint}</p>
        </div>
      )}
      <div className="shooters-shoot-controller-top-hud">
        <span className="shooters-shoot-controller-name">{playerName}</span>
        <ShootersShootHealthBar lives={hitsLeft} color={playerColor} />
        <span className="shooters-shoot-kills-line">
          Kills: {kills}
          <span className="shooters-shoot-controller-ammo">
            {gunName ? `${gunName} ` : ''}{bullets} / {ammoReserve}
          </span>
        </span>
      </div>
      <VirtualJoystick label="Move" className="shooters-shoot-move-joystick" onChange={setMove} />
      <div className="shooters-shoot-stance-row">
        <button
          type="button"
          className="shooters-shoot-stance-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            stanceRef.current.sprint = true;
          }}
          onPointerUp={() => {
            stanceRef.current.sprint = false;
          }}
          onPointerCancel={() => {
            stanceRef.current.sprint = false;
          }}
        >
          SPRINT
        </button>
        <button
          type="button"
          className="shooters-shoot-stance-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            stanceRef.current.crouch = true;
          }}
          onPointerUp={() => {
            stanceRef.current.crouch = false;
          }}
          onPointerCancel={() => {
            stanceRef.current.crouch = false;
          }}
        >
          CROUCH
        </button>
        <button
          type="button"
          className="shooters-shoot-stance-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            onReload();
          }}
        >
          RELOAD
        </button>
      </div>
      <div className="shooters-shoot-action-grid">
        <button
          type="button"
          className="shooters-shoot-action-btn shooters-shoot-melee-btn"
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
          className="shooters-shoot-action-btn shooters-shoot-jump-btn"
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
          className="shooters-shoot-action-btn shooters-shoot-fire-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            onShoot();
          }}
          aria-label="Fire pistol"
        >
          FIRE
        </button>
        <VirtualJoystick label="Look" className="shooters-shoot-look-joystick" onChange={setLook} />
      </div>
    </div>
  );
}
