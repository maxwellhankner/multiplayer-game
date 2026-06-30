import type { SessionMode } from '../../shared/session';
import { SESSION_MODES } from '../../shared/session';

interface SessionModePickerProps {
  selected: SessionMode | null;
  onSelect: (mode: SessionMode) => void;
  disabled?: boolean;
}

function connectionLine(x1: number, y1: number, x2: number, y2: number) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      opacity="0.55"
    />
  );
}

function PhoneIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="14" height="24" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="7" cy="20" r="1.5" fill="currentColor" />
    </g>
  );
}

function ComputerIcon({ x, y, w = 28, h = 18 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width={w} height={h} rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="3" y="3" width={w - 6} height={h - 6} rx="1" fill="currentColor" opacity="0.2" />
      <path
        d={`M${w / 2 - 6} ${h + 2}v4M${w / 2 + 6} ${h + 2}v4M${w / 2 - 8} ${h + 6}h16`}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

function SessionModeIcon({ mode }: { mode: SessionMode }) {
  if (mode === 'pc-host') {
    const screenCx = 40;
    const screenBottom = 30;
    const phones = [
      { x: 8, y: 48 },
      { x: 33, y: 48 },
      { x: 58, y: 48 },
    ];
    return (
      <svg viewBox="0 0 80 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ComputerIcon x={screenCx - 14} y={4} w={28} h={20} />
        {phones.map((p) => (
          <g key={`${p.x}-${p.y}`}>
            {connectionLine(screenCx, screenBottom, p.x + 7, p.y)}
            <PhoneIcon x={p.x} y={p.y} />
          </g>
        ))}
      </svg>
    );
  }

  if (mode === 'mobile-only') {
    const phones = [
      { x: 33, y: 6 },
      { x: 8, y: 48 },
      { x: 58, y: 48 },
    ];
    const centers = phones.map((p) => ({ x: p.x + 7, y: p.y + 12 }));
    return (
      <svg viewBox="0 0 80 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {connectionLine(centers[0].x, centers[0].y, centers[1].x, centers[1].y)}
        {connectionLine(centers[1].x, centers[1].y, centers[2].x, centers[2].y)}
        {connectionLine(centers[2].x, centers[2].y, centers[0].x, centers[0].y)}
        {phones.map((p) => (
          <PhoneIcon key={`${p.x}-${p.y}`} x={p.x} y={p.y} />
        ))}
      </svg>
    );
  }

  const computers = [
    { x: 26, y: 6 },
    { x: 6, y: 44 },
    { x: 46, y: 44 },
  ];
  const centers = computers.map((c) => ({ x: c.x + 14, y: c.y + 12 }));
  return (
    <svg viewBox="0 0 80 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {connectionLine(centers[0].x, centers[0].y, centers[1].x, centers[1].y)}
      {connectionLine(centers[1].x, centers[1].y, centers[2].x, centers[2].y)}
      {connectionLine(centers[2].x, centers[2].y, centers[0].x, centers[0].y)}
      {computers.map((c) => (
        <ComputerIcon key={`${c.x}-${c.y}`} x={c.x} y={c.y} />
      ))}
    </svg>
  );
}

export default function SessionModePicker({ selected, onSelect, disabled }: SessionModePickerProps) {
  return (
    <div className="session-mode-grid" role="listbox" aria-label="Room type">
      {SESSION_MODES.map((mode) => {
        const isSelected = selected === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={`session-mode-card${isSelected ? ' selected' : ''}`}
            disabled={disabled}
            onClick={() => onSelect(mode.id)}
          >
            <span className="session-mode-icon">
              <SessionModeIcon mode={mode.id} />
            </span>
            <span className="session-mode-body">
              <span className="session-mode-title">{mode.title}</span>
              <span className="session-mode-desc">{mode.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
