import GamePhaseStart from './GamePhaseStart';

interface GameCountdownProps {
  count: number | string;
  hint: string;
  variant?: 'host' | 'controller';
}

export default function GameCountdown({ count, hint, variant = 'host' }: GameCountdownProps) {
  return <GamePhaseStart count={count} hint={hint} variant={variant} />;
}
