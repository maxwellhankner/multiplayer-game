import { SHOOTERS_SHOOT_MAX_HITS } from '../../../shared/games/shooters-shoot/constants';

interface ShootersShootHealthBarProps {
  lives: number;
  maxLives?: number;
  className?: string;
  color?: string;
}

function healthTier(lives: number, maxLives: number): 'high' | 'mid' | 'low' | 'empty' {
  if (lives <= 0) return 'empty';
  if (lives >= maxLives) return 'high';
  if (lives === 1) return 'low';
  return 'mid';
}

export default function ShootersShootHealthBar({
  lives,
  maxLives = SHOOTERS_SHOOT_MAX_HITS,
  className = '',
  color,
}: ShootersShootHealthBarProps) {
  const clamped = Math.max(0, Math.min(lives, maxLives));
  const hp = maxLives > 0 ? Math.round((clamped / maxLives) * 100) : 0;
  const tier = healthTier(clamped, maxLives);

  return (
    <div
      className={`shooters-shoot-health ${className}`.trim()}
      role="meter"
      aria-valuenow={hp}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Health ${hp}`}
      style={color ? { ['--pane-color' as string]: color } : undefined}
    >
      <span className="shooters-shoot-health-label">HP</span>
      <div className="shooters-shoot-health-segments">
        {Array.from({ length: maxLives }, (_, index) => (
          <span
            key={index}
            className={
              index < clamped
                ? `shooters-shoot-health-seg shooters-shoot-health-seg--${tier}`
                : 'shooters-shoot-health-seg shooters-shoot-health-seg--empty'
            }
          />
        ))}
      </div>
      <span className="shooters-shoot-health-value">{hp}</span>
    </div>
  );
}
