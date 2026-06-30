import { getGameById } from '../../../shared/games/registry';

interface PlaceholderViewProps {
  gameId: string;
  role: 'host' | 'controller';
}

export default function PlaceholderView({ gameId, role }: PlaceholderViewProps) {
  const game = getGameById(gameId);
  const name = game?.name ?? gameId;

  return (
    <div className="game-placeholder">
      <p className="game-placeholder-label">{name}</p>
      <p className="game-placeholder-status">Coming soon</p>
      <p className="game-placeholder-hint">
        {role === 'host'
          ? 'This game is registered but not implemented yet.'
          : 'Wait for the host — gameplay will appear here when this game ships.'}
      </p>
    </div>
  );
}
