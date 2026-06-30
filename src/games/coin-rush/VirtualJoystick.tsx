import { useCallback, useRef, useState } from 'react';
import { COIN_RUSH_STICK_DEADZONE } from '../../../shared/games/coin-rush/constants';

interface VirtualJoystickProps {
  label: string;
  onChange: (x: number, y: number) => void;
  className?: string;
}

function applyDeadzone(x: number, y: number): { x: number; y: number } {
  const mag = Math.hypot(x, y);
  if (mag <= COIN_RUSH_STICK_DEADZONE) return { x: 0, y: 0 };
  const scaled = (mag - COIN_RUSH_STICK_DEADZONE) / (1 - COIN_RUSH_STICK_DEADZONE);
  const norm = scaled / mag;
  return { x: x * norm, y: y * norm };
}

export default function VirtualJoystick({ label, onChange, className }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;

      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = dist > radius ? radius / dist : 1;
      const nx = (dx * clamped) / radius;
      const ny = (dy * clamped) / radius;

      setThumb({ x: nx, y: ny });
      const out = applyDeadzone(nx, -ny);
      onChange(out.x, out.y);
    },
    [onChange],
  );

  const reset = useCallback(() => {
    activePointer.current = null;
    setThumb({ x: 0, y: 0 });
    onChange(0, 0);
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    activePointer.current = e.pointerId;
    baseRef.current?.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    e.preventDefault();
    updateFromPointer(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    e.preventDefault();
    baseRef.current?.releasePointerCapture(e.pointerId);
    reset();
  };

  return (
    <div className={`controller-joystick${className ? ` ${className}` : ''}`}>
      <div
        ref={baseRef}
        className="controller-joystick-base"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="presentation"
      >
        <div
          className="controller-joystick-thumb"
          style={{
            transform: `translate(calc(-50% + ${thumb.x * 42}%), calc(-50% + ${thumb.y * 42}%))`,
          }}
        />
      </div>
      <span className="controller-joystick-label">{label}</span>
    </div>
  );
}
