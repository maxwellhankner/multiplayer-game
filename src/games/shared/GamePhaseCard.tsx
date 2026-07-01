import type { HTMLAttributes, ReactNode } from 'react';

interface GamePhaseCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  scroll?: boolean;
}

export default function GamePhaseCard({
  children,
  className,
  compact = false,
  scroll = false,
  ...rest
}: GamePhaseCardProps) {
  const classes = [
    'game-phase-card',
    compact ? 'game-phase-card--compact' : '',
    scroll ? 'game-phase-card--scroll' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
