import { equippedGun, playerGunIndex, playerGuns, shooterGun } from '../../../shared/games/shooters-shoot/guns';
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
  gunName,
  otherName,
  bullets,
  magSize,
  reserve,
  reloadUntil,
  reloadMs,
  gameTime,
}: {
  gunName: string;
  otherName: string;
  bullets: number;
  magSize: number;
  reserve: number;
  reloadUntil: number;
  reloadMs: number;
  gameTime: number;
}) {
  const reloadLeft = reloadUntil - gameTime;
  const reloading = reloadLeft > 0;
  const progress = reloading ? 1 - reloadLeft / Math.max(1, reloadMs) : 0;
  const empty = bullets <= 0 && !reloading;

  return (
    <div className={`shooters-shoot-ammo${empty ? ' shooters-shoot-ammo--empty' : ''}`}>
      <span className="shooters-shoot-ammo-name">{gunName}</span>
      {reloading && (
        <span className="shooters-shoot-reload-track" aria-label="Reloading">
          <span className="shooters-shoot-reload-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </span>
      )}
      <span className="shooters-shoot-ammo-count">
        {bullets}/{magSize} - {reserve}
      </span>
      <span className="shooters-shoot-ammo-other">Y · {otherName}</span>
    </div>
  );
}

function tally(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function ShootersShootPaneGrid({
  players,
  mode,
  winnerId = null,
  gameTime = 0,
}: ShootersShootPaneGridProps) {
  const panes = getSplitPanes(players.length, { preserveAspect: true });

  return (
    <>
      {players.map((player, index) => {
        const pane = panes[index];
        if (!pane) return null;
        const isWinner = mode === 'winner' && player.id === winnerId;
        const hitsLeft = Math.max(0, player.lives);
        const gun = equippedGun(player);

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
              <div className="shooters-shoot-status">
                {!player.eliminated && (
                  <ShootersShootHealthBar lives={hitsLeft} className="shooters-shoot-health--host" />
                )}
                <span className="shooters-shoot-kd">
                  {tally(player.score, 'kill', 'kills')} · {tally(player.deaths ?? 0, 'death', 'deaths')}
                </span>
              </div>
            )}
            {mode === 'play' && !player.eliminated && (
              <ShootersShootAmmo
                gunName={gun.name}
                otherName={shooterGun(playerGuns(player)[playerGunIndex(player) === 0 ? 1 : 0]).name}
                bullets={player.bullets ?? 0}
                magSize={gun.magSize}
                reserve={player.ammoReserve ?? 0}
                reloadUntil={player.reloadUntil ?? 0}
                reloadMs={gun.reloadMs}
                gameTime={gameTime}
              />
            )}
            {mode === 'play' && player.eliminated && (
              <span className="shooters-shoot-pane-dead">
                {(player.respawnAt ?? 0) > 0 ? 'RESPAWN' : 'DEAD'}
              </span>
            )}
            {mode === 'orient' && (
              <div className="shooters-shoot-pane-orient">
                <p className="shooters-shoot-pane-center-name game-player-name">
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
              <p className="shooters-shoot-pane-center-name game-player-name">
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
