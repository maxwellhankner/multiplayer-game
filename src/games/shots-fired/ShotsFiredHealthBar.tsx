import { SHOTS_FIRED_MAX_HITS } from '../../../shared/games/shots-fired/constants';

interface ShotsFiredHealthBarProps {
  lives: number;
  maxLives?: number;
  className?: string;
}

function healthTier(lives: number): 'green' | 'orange' | 'red' | 'empty' {
  if (lives >= 3) return 'green';
  if (lives === 2) return 'orange';
  if (lives === 1) return 'red';
  return 'empty';
}

export default function ShotsFiredHealthBar({
  lives,
  maxLives = SHOTS_FIRED_MAX_HITS,
  className = '',
}: ShotsFiredHealthBarProps) {
  const clamped = Math.max(0, Math.min(lives, maxLives));
  const pct = maxLives > 0 ? (clamped / maxLives) * 100 : 0;
  const tier = healthTier(clamped);

  return (
    <div
      className={`shots-fired-health-bar ${className}`.trim()}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={maxLives}
      aria-label={`Health: ${clamped} of ${maxLives}`}
    >
      <div className="shots-fired-health-bar-track">
        <div
          className={`shots-fired-health-bar-fill shots-fired-health-bar-fill--${tier}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
