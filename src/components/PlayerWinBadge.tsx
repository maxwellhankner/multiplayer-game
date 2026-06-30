interface PlayerWinBadgeProps {
  wins: number;
}

export default function PlayerWinBadge({ wins }: PlayerWinBadgeProps) {
  if (wins <= 0) return null;

  return (
    <span className="player-win-badge" aria-label={`${wins} win${wins === 1 ? '' : 's'}`}>
      <span className="player-win-badge-star" aria-hidden>
        ★
      </span>
      <span className="player-win-badge-count">{wins}</span>
    </span>
  );
}
