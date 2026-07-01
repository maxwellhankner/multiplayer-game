import { showsAsLandscapeReady } from '../../../shared/games/bots';
import type { PlayerState } from '../../../shared/types';
import { getSplitPanes } from './splitLayout';

export type CoinRushPaneMode = 'play' | 'orient' | 'countdown' | 'winner';

interface CoinRushPaneGridProps {
  players: PlayerState[];
  mode: CoinRushPaneMode;
  winnerId?: string | null;
  winCoins?: number;
}

export default function CoinRushPaneGrid({
  players,
  mode,
  winnerId = null,
  winCoins = 5,
}: CoinRushPaneGridProps) {
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
            className={`coin-rush-pane coin-rush-pane--${mode}${isWinner ? ' coin-rush-pane--champion' : ''}`}
            style={{
              left: `${pane.left * 100}%`,
              top: `${pane.top * 100}%`,
              width: `${pane.width * 100}%`,
              height: `${pane.height * 100}%`,
              ['--pane-color' as string]: player.color,
            }}
          >
            {mode === 'play' && (
              <div className="coin-rush-pane-play-body">
                <span className="coin-rush-pane-name game-player-name pane-player-color">
                  {player.name}
                </span>
                <span className="coin-rush-pane-score pane-player-color">
                  {player.score}/{winCoins}
                </span>
              </div>
            )}

            {mode === 'orient' && (
              <div className="coin-rush-pane-orient">
                <p className="coin-rush-pane-center-name game-player-name pane-player-color">
                  {player.name}
                </p>
                <p
                  className={
                    showsAsLandscapeReady(player)
                      ? 'coin-rush-pane-orient-status coin-rush-pane-orient-status--ready'
                      : 'coin-rush-pane-orient-status'
                  }
                >
                  {showsAsLandscapeReady(player) ? 'Ready' : 'Rotate phone'}
                </p>
              </div>
            )}

            {mode === 'countdown' && (
              <p className="coin-rush-pane-center-name game-player-name pane-player-color">
                {player.name}
              </p>
            )}

            {mode === 'winner' && (
              <div className="coin-rush-pane-winner-body">
                {isWinner && <span className="coin-rush-pane-winner-badge">Winner</span>}
                <p className="coin-rush-pane-center-name game-player-name pane-player-color">
                  {player.name}
                </p>
                <p className="coin-rush-pane-winner-score pane-player-color">
                  {player.score} coin{player.score === 1 ? '' : 's'}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
