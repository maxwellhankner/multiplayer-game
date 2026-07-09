import { getSplitPanes } from '../coin-rush/splitLayout';
import type { RoomState } from '../../../shared/types';
import ShotsFiredCrosshair from './ShotsFiredCrosshair';

export type ShotsFiredPaneMode = 'play' | 'orient' | 'countdown' | 'winner';

interface ShotsFiredPaneGridProps {
  players: RoomState['players'];
  mode: ShotsFiredPaneMode;
  winnerId?: string | null;
}

export default function ShotsFiredPaneGrid({ players, mode, winnerId = null }: ShotsFiredPaneGridProps) {
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
            className={`shots-fired-pane shots-fired-pane--${mode}${isWinner ? ' shots-fired-pane--champion' : ''}`}
            style={{
              left: `${pane.left * 100}%`,
              top: `${pane.top * 100}%`,
              width: `${pane.width * 100}%`,
              height: `${pane.height * 100}%`,
              ['--pane-color' as string]: player.color,
            }}
          >
            {(mode === 'play' || mode === 'countdown') && !player.eliminated && (
              <ShotsFiredCrosshair />
            )}
            {mode === 'play' && (
              <div className="shots-fired-pane-play-body">
                <span className="shots-fired-pane-name game-player-name pane-player-color">
                  {player.name}
                </span>
                <span className="shots-fired-pane-score pane-player-color">
                  {(player.bullets ?? 0)} bullets · {hitsLeft} hits left
                  {player.eliminated ? ' · DEAD' : ''}
                </span>
              </div>
            )}
            {mode === 'orient' && (
              <div className="shots-fired-pane-orient">
                <p className="shots-fired-pane-center-name game-player-name pane-player-color">
                  {player.name}
                </p>
                <p
                  className={
                    player.landscapeReady
                      ? 'shots-fired-pane-orient-status shots-fired-pane-orient-status--ready'
                      : 'shots-fired-pane-orient-status'
                  }
                >
                  {player.landscapeReady ? 'Ready' : 'Rotate phone'}
                </p>
              </div>
            )}
            {mode === 'countdown' && (
              <p className="shots-fired-pane-center-name game-player-name pane-player-color">
                {player.name}
              </p>
            )}
            {mode === 'winner' && (
              <div className="shots-fired-pane-winner-body">
                {isWinner && <span className="shots-fired-pane-winner-badge">Winner</span>}
                <p className="shots-fired-pane-center-name game-player-name pane-player-color">
                  {player.name}
                </p>
                <p className="shots-fired-pane-winner-score pane-player-color">
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
