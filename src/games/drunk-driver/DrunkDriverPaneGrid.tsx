import { DRUNK_FINISH_DISTANCE } from '../../../shared/games/drunk-driver/constants';
import { showsAsLandscapeReady } from '../../../shared/games/bots';
import type { PlayerState } from '../../../shared/types';
import { getSplitPanes } from '../coin-rush/splitLayout';

export type DrunkDriverPaneMode = 'play' | 'orient' | 'startlight' | 'winner';

interface DrunkDriverPaneGridProps {
  players: PlayerState[];
  mode: DrunkDriverPaneMode;
  winnerId?: string | null;
}

function formatDistance(pz: number): string {
  const pct = Math.min(100, Math.round((pz / DRUNK_FINISH_DISTANCE) * 100));
  return `${pct}%`;
}

export default function DrunkDriverPaneGrid({
  players,
  mode,
  winnerId = null,
}: DrunkDriverPaneGridProps) {
  const panes = getSplitPanes(players.length);

  return (
    <>
      {players.map((player, i) => {
        const pane = panes[i];
        if (!pane) return null;

        const isWinner = mode === 'winner' && player.id === winnerId;

        return (
          <div
            key={player.id}
            className={`drunk-driver-pane drunk-driver-pane--${mode}${isWinner ? ' drunk-driver-pane--champion' : ''}`}
            style={{
              left: `${pane.left * 100}%`,
              top: `${pane.top * 100}%`,
              width: `${pane.width * 100}%`,
              height: `${pane.height * 100}%`,
              ['--pane-color' as string]: player.color,
            }}
          >
            {mode === 'play' && (
              <div className="drunk-driver-pane-play-body">
                <span className="drunk-driver-pane-name game-player-name pane-player-color">
                  {player.name}
                </span>
                <span className="drunk-driver-pane-score pane-player-color">{formatDistance(player.pz)}</span>
              </div>
            )}

            {mode === 'orient' && (
              <div className="drunk-driver-pane-orient">
                <p className="drunk-driver-pane-center-name game-player-name pane-player-color">
                  {player.name}
                </p>
                <p
                  className={
                    showsAsLandscapeReady(player)
                      ? 'drunk-driver-pane-orient-status drunk-driver-pane-orient-status--ready'
                      : 'drunk-driver-pane-orient-status'
                  }
                >
                  {showsAsLandscapeReady(player) ? 'Ready' : 'Tilt phone sideways'}
                </p>
              </div>
            )}

            {mode === 'startlight' && (
              <p className="drunk-driver-pane-center-name game-player-name pane-player-color">
                {player.name}
              </p>
            )}

            {mode === 'winner' && (
              <div className="drunk-driver-pane-winner-body">
                {isWinner && <span className="drunk-driver-pane-winner-badge">Winner</span>}
                <p className="drunk-driver-pane-center-name game-player-name pane-player-color">
                  {player.name}
                </p>
                <p className="drunk-driver-pane-winner-score pane-player-color">{formatDistance(player.pz)} to line</p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function getSpotlightColor(countdown: number): 'red' | 'yellow' | 'green' {
  if (countdown >= 3) return 'red';
  if (countdown === 2) return 'yellow';
  return 'green';
}

export function DrunkDriverSpotlight({ countdown }: { countdown: number }) {
  const color = getSpotlightColor(countdown);

  return (
    <div className="drunk-driver-spotlight" aria-live="polite">
      <div className="drunk-driver-spotlight-panel">
        <div className="drunk-driver-spotlight-fixture">
          <div className={`drunk-driver-spotlight-beam drunk-driver-spotlight-beam--${color}`} />
          <div className={`drunk-driver-spotlight-lens drunk-driver-spotlight-lens--${color}`} />
        </div>
        <p className="drunk-driver-spotlight-hint">First across the line wins</p>
      </div>
    </div>
  );
}
