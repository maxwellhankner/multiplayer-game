import type { PlayerState } from '../../../shared/types';
import { formatWinnerTitle, formatWinCount } from './gamePhaseText';
import GamePhaseCard from './GamePhaseCard';
import GamePhaseOverlay from './GamePhaseOverlay';

interface GamePhaseWinnerProps {
  icon: string;
  winnerNames: readonly string[];
  stat: string;
  players: readonly PlayerState[];
  winnerIds?: ReadonlySet<string>;
  hint?: string;
  variant?: 'host' | 'controller';
}

function sortLeaderboard(players: readonly PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    const winsDiff = (b.wins ?? 0) - (a.wins ?? 0);
    if (winsDiff !== 0) return winsDiff;
    return a.name.localeCompare(b.name);
  });
}

export default function GamePhaseWinner({
  icon,
  winnerNames,
  stat,
  players,
  winnerIds,
  hint = 'Everyone tap Back to lobby on their phones',
  variant = 'host',
}: GamePhaseWinnerProps) {
  const title = formatWinnerTitle(winnerNames);
  const leaderboard = sortLeaderboard(players);

  return (
    <GamePhaseOverlay variant={variant}>
      <GamePhaseCard scroll className="game-phase-card--winner" role="dialog" aria-label="Round results">
        <div className="game-phase-winner-body">
          <div className="game-phase-emoji" aria-hidden>
            {icon}
          </div>
          <h2 className="game-phase-title">{title}</h2>
          <p className="game-phase-subtitle">{stat}</p>
          <ul className="game-phase-leaderboard">
            {leaderboard.map((player) => (
              <li
                key={player.id}
                className={winnerIds?.has(player.id) ? 'is-winner' : undefined}
              >
                <span className="game-phase-leaderboard-dot" style={{ background: player.color }} />
                <span className="game-phase-leaderboard-name game-player-name">{player.name}</span>
                <span className="game-phase-leaderboard-wins">{formatWinCount(player.wins ?? 0)}</span>
              </li>
            ))}
          </ul>
          <p className="game-phase-hint">{hint}</p>
        </div>
      </GamePhaseCard>
    </GamePhaseOverlay>
  );
}
