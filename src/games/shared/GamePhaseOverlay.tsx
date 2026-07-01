import type { ReactNode } from 'react';

interface GamePhaseOverlayProps {
  children: ReactNode;
  className?: string;
  /** Controller overlays sit inside play area instead of the viewport. */
  variant?: 'host' | 'controller';
}

export default function GamePhaseOverlay({
  children,
  className,
  variant = 'host',
}: GamePhaseOverlayProps) {
  const classes = [
    'game-phase-overlay',
    variant === 'controller' ? 'game-phase-overlay--controller' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} aria-hidden={false}>
      {children}
    </div>
  );
}
