import type { SessionMode } from '../../shared/session';
import { SESSION_MODES } from '../../shared/session';

interface SessionModePickerProps {
  onLaunch: (mode: SessionMode) => void;
  disabled?: boolean;
  pendingMode?: SessionMode | null;
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

function linkBoxes(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  const center = (box: { x: number; y: number; w: number; h: number }) => ({
    x: box.x + box.w / 2,
    y: box.y + box.h / 2,
  });
  const edgeToward = (
    box: { x: number; y: number; w: number; h: number },
    toward: { x: number; y: number },
  ) => {
    const origin = center(box);
    const dx = toward.x - origin.x;
    const dy = toward.y - origin.y;
    const scale = 1 / Math.max(Math.abs(dx) / (box.w / 2), Math.abs(dy) / (box.h / 2));
    return { x: origin.x + dx * scale, y: origin.y + dy * scale };
  };
  const from = edgeToward(a, center(b));
  const to = edgeToward(b, center(a));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const gap = 1.5;
  return connectionLine(
    from.x + (dx / length) * gap,
    from.y + (dy / length) * gap,
    to.x - (dx / length) * gap,
    to.y - (dy / length) * gap,
  );
}

function PhoneIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="16" height="28" rx="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="8" cy="23" r="1.6" fill="currentColor" />
    </g>
  );
}

function ComputerIcon({ x, y, w = 32, h = 20 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width={w} height={h} rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="3" y="3" width={w - 6} height={h - 6} rx="1" fill="currentColor" opacity="0.2" />
      <path
        d={`M${w / 2 - 6} ${h + 2}v4M${w / 2 + 6} ${h + 2}v4M${w / 2 - 9} ${h + 6}h18`}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

function SessionModeIcon({ mode }: { mode: SessionMode }) {
  if (mode === 'pc-host') {
    const phones = [
      { x: 12, y: 44 },
      { x: 40, y: 44 },
      { x: 68, y: 44 },
    ];
    return (
      <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ComputerIcon x={32} y={4} w={32} h={18} />
        {phones.map((p) => (
          <g key={`${p.x}-${p.y}`}>
            {connectionLine(48, 30, p.x + 8, p.y)}
            <PhoneIcon x={p.x} y={p.y} />
          </g>
        ))}
      </svg>
    );
  }

  if (mode === 'local-controllers') {
    const remotes = [
      { x: 4, y: 48 },
      { x: 54, y: 48 },
    ];
    return (
      <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ComputerIcon x={32} y={2} w={32} h={16} />
        {remotes.map((remote) => (
          <g key={remote.x}>
            {connectionLine(48, 26, remote.x + 19, remote.y)}
            <g transform={`translate(${remote.x}, ${remote.y})`}>
              <rect x="0" y="2" width="38" height="20" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="11" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="25" cy="9" r="1.8" fill="currentColor" />
              <circle cx="30" cy="15" r="1.8" fill="currentColor" />
            </g>
          </g>
        ))}
      </svg>
    );
  }

  if (mode === 'mobile-only') {
    const phones = [
      { x: 40, y: 2 },
      { x: 12, y: 46 },
      { x: 68, y: 46 },
    ];
    const phoneBoxes = phones.map((p) => ({ x: p.x, y: p.y, w: 16, h: 28 }));
    return (
      <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {linkBoxes(phoneBoxes[0], phoneBoxes[1])}
        {linkBoxes(phoneBoxes[1], phoneBoxes[2])}
        {linkBoxes(phoneBoxes[2], phoneBoxes[0])}
        {phones.map((p) => (
          <PhoneIcon key={`${p.x}-${p.y}`} x={p.x} y={p.y} />
        ))}
      </svg>
    );
  }

  const computers = [
    { x: 32, y: 0 },
    { x: 6, y: 42 },
    { x: 58, y: 42 },
  ];
  const computerBoxes = computers.map((c) => ({ x: c.x, y: c.y, w: 32, h: 24 }));
  return (
    <svg viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(0, 6)">
      {linkBoxes(computerBoxes[0], computerBoxes[1])}
      {linkBoxes(computerBoxes[1], computerBoxes[2])}
      {linkBoxes(computerBoxes[2], computerBoxes[0])}
      {computers.map((c) => (
        <ComputerIcon key={`${c.x}-${c.y}`} x={c.x} y={c.y} w={32} h={18} />
      ))}
      </g>
    </svg>
  );
}

export default function SessionModePicker({ onLaunch, disabled, pendingMode }: SessionModePickerProps) {
  return (
    <div className="session-mode-grid" role="group" aria-label="Host a lobby">
      {SESSION_MODES.map((mode) => {
        const pending = pendingMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            className={`session-mode-card${pending ? ' is-pending' : ''}`}
            disabled={disabled}
            aria-busy={pending || undefined}
            onClick={() => onLaunch(mode.id)}
          >
            <span className="session-mode-icon">
              <SessionModeIcon mode={mode.id} />
            </span>
            <span className="session-mode-body">
              <span className="session-mode-title">{mode.title}</span>
              <span className="session-mode-desc">{pending ? 'Opening lobby…' : mode.description}</span>
            </span>
            <svg className="session-mode-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
