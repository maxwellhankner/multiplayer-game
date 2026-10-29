import {
  SHOOTER_GUN_IDS,
  SHOOTER_GUNS,
  playerGuns,
  type ShooterGunId,
} from '../../shared/games/shooters-shoot/guns';
import type { PlayerState } from '../../shared/types';

interface LocalMatchMenuProps {
  players: readonly PlayerState[];
  showGuns?: boolean;
  onResume: () => void;
  onReset: () => void;
  onQuit: () => void;
  onSetGun?: (playerId: string, slot: 0 | 1, gunId: ShooterGunId) => void;
}

function byKills(a: PlayerState, b: PlayerState): number {
  const kills = b.score - a.score;
  if (kills !== 0) return kills;
  return a.name.localeCompare(b.name);
}

export default function LocalMatchMenu({
  players,
  showGuns = false,
  onResume,
  onReset,
  onQuit,
  onSetGun,
}: LocalMatchMenuProps) {
  const rows = [...players].sort(byKills);

  return (
    <div className="local-match-menu">
      <div
        className="local-match-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-label="Match menu"
        data-controller-modal
      >
        <h1>Match</h1>
        <table className="local-match-chart">
          <thead>
            <tr>
              <th>Player</th>
              <th>Kills</th>
              <th>Deaths</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => (
              <tr key={player.id}>
                <td>
                  <span className="local-match-player">
                    <span className="player-dot" style={{ background: player.color }} />
                    {player.name}
                  </span>
                </td>
                <td>{player.score}</td>
                <td>{player.deaths ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {showGuns && (
          <div className="local-match-guns">
            <h2>Guns</h2>
            {rows.map((player) => {
              const guns = playerGuns(player);
              return (
                <div key={player.id} className="local-gun-player">
                  <p className="local-gun-name">
                    <span className="player-dot" style={{ background: player.color }} />
                    {player.name}
                  </p>
                  {([0, 1] as const).map((slot) => (
                    <div key={slot} className="local-gun-row">
                      <span className="local-gun-slot">{slot === 0 ? 'Primary' : 'Secondary'}</span>
                      <div className="local-gun-grid">
                        {SHOOTER_GUN_IDS.map((id) => (
                          <button
                            key={id}
                            type="button"
                            className={`local-gun-btn${guns[slot] === id ? ' local-gun-btn--active' : ''}`}
                            aria-pressed={guns[slot] === id}
                            onClick={() => onSetGun?.(player.id, slot, id)}
                          >
                            {SHOOTER_GUNS[id].name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <div className="local-match-actions">
          <button type="button" className="btn btn-primary" data-controller-initial onClick={onResume}>
            Resume
          </button>
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Reset game
          </button>
          <button type="button" className="btn btn-secondary" onClick={onQuit}>
            Quit
          </button>
        </div>
        <p className="local-match-hint">
          Stick or D-pad to move. A or X to select. Start to close.
          {showGuns ? ' Y or Triangle swaps guns during play.' : ''}
        </p>
      </div>
    </div>
  );
}
