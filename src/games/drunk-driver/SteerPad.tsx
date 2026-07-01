import { useCallback, useRef } from 'react';

interface SteerPadProps {
  onChange: (steer: number) => void;
}

export default function SteerPad({ onChange }: SteerPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);

  const updateFromEvent = useCallback(
    (clientX: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const steer = Math.max(-1, Math.min(1, (x - 0.5) * 2));
      onChange(steer);
    },
    [onChange],
  );

  return (
    <div
      ref={padRef}
      className="drunk-driver-steer-pad"
      role="slider"
      aria-label="Steering wheel"
      aria-valuemin={-1}
      aria-valuemax={1}
      onPointerDown={(e) => {
        activeRef.current = true;
        padRef.current?.setPointerCapture(e.pointerId);
        updateFromEvent(e.clientX);
      }}
      onPointerMove={(e) => {
        if (!activeRef.current) return;
        updateFromEvent(e.clientX);
      }}
      onPointerUp={() => {
        activeRef.current = false;
        onChange(0);
      }}
      onPointerCancel={() => {
        activeRef.current = false;
        onChange(0);
      }}
    >
      <div className="drunk-driver-steer-wheel" aria-hidden>
        <span className="drunk-driver-steer-spoke" />
        <span className="drunk-driver-steer-spoke drunk-driver-steer-spoke--b" />
      </div>
      <span className="drunk-driver-steer-label">Steer</span>
    </div>
  );
}
