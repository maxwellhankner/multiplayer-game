import { SHOOTERS_SHOOT_RELOAD_MS } from '../../../shared/games/shooters-shoot/constants';
import { getSplitPanes } from '../coin-rush/splitLayout';
import type { RoomState } from '../../../shared/types';
import ShootersShootCrosshair from './ShootersShootCrosshair';
import ShootersShootHealthBar from './ShootersShootHealthBar';

export type ShootersShootPaneMode = 'play' | 'orient' | 'countdown' | 'winner';

interface ShootersShootPaneGridProps {
  players: RoomState['players'];
  mode: ShootersShootPaneMode;
  winnerId?: string | null;
  gameTime?: number;
}

function ShootersShootAmmo({
  bullets,
  reserve,
  reloadUntil,
  gameTime,
}: {
  bullets: number;
  reserve: number;
  reloadUntil: number;
  gameTime: number;
}) {
  const reloadLeft = reloadUntil - gameTime;
  const reloading = reloadLeft > 0;
  const progress = reloading ? 1 - reloadLeft / SHOOTERS_SHOOT_RELOAD_MS : 0;
  const empty = bullets <= 0 && !reloading;

  return (
    <div className={`shooters-shoot-ammo${empty ? ' shooters-shoot-ammo--empty' : ''}`}>
      {reloading ? (
        <div className="shooters-shoot-reload">
          <span className="shooters-shoot-reload-label">Reloading</span>
          <span className="shooters-shoot-reload-track">
            <span className="shooters-shoot-reload-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </span>
        </div>
      ) : (
        <span className="shooters-shoot-ammo-key">X</span>
      )}
      <span className="shooters-shoot-ammo-count">
        <span className="shooters-shoot-ammo-stack">
          <span className="shooters-shoot-ammo-caption">Gun</span>
          <span className="shooters-shoot-ammo-mag">{bullets}</span>
        </span>
        <span className="shooters-shoot-ammo-stack">
          <span className="shooters-shoot-ammo-caption">Body</span>
          <span className="shooters-shoot-ammo-reserve">{reserve}</span>
        </span>
      </span>
    </div>
  );
}

export default function ShootersShootPaneGrid({
  players,
  mode,
  winnerId = null,
  gameTime = 0,
}: ShootersShootPaneGridProps) {
  const panes = getSplitPanes(players.length);

  return (
    <>
      {players.map((player, index) => {
        const pane = panes[index];
        if (!pane) return null;
        const isWinner = mode === 'winner' && player.id === winnerId;
        const hitsLeft = Math.max(0, player.lives);

        return (
          <div
            key={player.id}
            className={`shooters-shoot-pane shooters-shoot-pane--${mode}${isWinner ? ' shooters-shoot-pane--champion' : ''}`}
            style={{
              left: `${pane.left * 100}%`,
              top: `${pane.top * 100}%`,
              width: `${pane.width * 100}%`,
              height: `${pane.height * 100}%`,
              ['--pane-color' as string]: player.color,
            }}
          >
            {(mode === 'play' || mode === 'countdown') && !player.eliminated && (
              <ShootersShootCrosshair />
            )}
            {mode === 'play' && (
              <div className="shooters-shoot-pane-play-body">
                <span className="shooters-shoot-pane-name game-player-name pane-player-color">
                  {player.name}
                </span>
                <span className="shooters-shoot-kills-line">
                  {player.score} kill{player.score === 1 ? '' : 's'}
                </span>
              </div>
            )}
            {mode === 'play' && !player.eliminated && (
              <>
                <ShootersShootHealthBar lives={hitsLeft} className="shooters-shoot-health--host" />
                <ShootersShootAmmo
                  bullets={player.bullets ?? 0}
                  reserve={player.ammoReserve ?? 0}
                  reloadUntil={player.reloadUntil ?? 0}
                  gameTime={gameTime}
                />
              </>
            )}
            {mode === 'play' && player.eliminated && (
              <span className="shooters-shoot-pane-dead pane-player-color">DEAD</span>
            )}
            {mode === 'orient' && (
              <div className="shooters-shoot-pane-orient">
                <p className="shooters-shoot-pane-center-name game-player-name pane-player-color">
                  {player.name}
                </p>
                <p
                  className={
                    player.landscapeReady
                      ? 'shooters-shoot-pane-orient-status shooters-shoot-pane-orient-status--ready'
                      : 'shooters-shoot-pane-orient-status'
                  }
                >
                  {player.landscapeReady ? 'Ready' : 'Rotate phone'}
                </p>
              </div>
            )}
            {mode === 'countdown' && (
              <p className="shooters-shoot-pane-center-name game-player-name pane-player-color">
                {player.name}
              </p>
            )}
            {mode === 'winner' && (
              <div className="shooters-shoot-pane-winner-body">
                {isWinner && <span className="shooters-shoot-pane-winner-badge">Winner</span>}
                <p className="shooters-shoot-pane-center-name game-player-name pane-player-color">
                  {player.name}
                </p>
                <p className="shooters-shoot-pane-winner-score pane-player-color">
                  {player.score} kill{player.score === 1 ? '' : 's'}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
