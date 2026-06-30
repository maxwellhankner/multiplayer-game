import { useEffect, useState } from 'react';
import type { LobbySettings } from '../../shared/platform';
import {
  getGameById,
  getPlayableGamesForSessionMode,
} from '../../shared/games/registry';
import type { SessionMode } from '../../shared/session';
import { getSessionModeLabel } from '../../shared/session';

interface LobbySettingsPanelProps {
  sessionMode: SessionMode;
  settings: LobbySettings;
  onChange: (patch: Partial<LobbySettings>) => void;
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

export default function LobbySettingsPanel({
  sessionMode,
  settings,
  onChange,
}: LobbySettingsPanelProps) {
  const [infoGameId, setInfoGameId] = useState<string | null>(null);
  const infoGame = infoGameId ? getGameById(infoGameId) : null;
  const playableGames = getPlayableGamesForSessionMode(sessionMode);
  const playableIds = playableGames.map((g) => g.id);

  const gameLabel = (id: string) => getGameById(id)?.name ?? id;

  const isRandomMode =
    settings.gameSelectionMode === 'random-from-pool' || settings.gameSelectionMode === 'random';
  const isSelectedMode = settings.gameSelectionMode === 'specific';

  const randomPoolIds =
    settings.gameSelectionMode === 'random'
      ? playableIds
      : settings.gamePool.filter((id) => playableIds.includes(id));

  const selectedGameId =
    settings.specificGameId ?? playableGames[0]?.id ?? '';

  const selectRandomMode = () => {
    const pool = randomPoolIds.length > 0 ? randomPoolIds : playableIds;
    onChange({
      gameSelectionMode: 'random-from-pool',
      gamePool: pool.length > 0 ? pool : [...settings.gamePool],
    });
  };

  const selectSelectedMode = () => {
    onChange({
      gameSelectionMode: 'specific',
      specificGameId: selectedGameId || null,
    });
  };

  const isGameChecked = (gameId: string) => {
    if (isSelectedMode) return selectedGameId === gameId;
    return randomPoolIds.includes(gameId);
  };

  const onGameToggle = (gameId: string) => {
    if (isSelectedMode) {
      onChange({
        gameSelectionMode: 'specific',
        specificGameId: gameId,
      });
      return;
    }

    const pool = randomPoolIds.includes(gameId)
      ? randomPoolIds.filter((id) => id !== gameId)
      : [...randomPoolIds, gameId];
    onChange({
      gameSelectionMode: 'random-from-pool',
      gamePool: pool.length > 0 ? pool : [gameId],
    });
  };

  useEffect(() => {
    if (!infoGameId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInfoGameId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [infoGameId]);

  if (playableGames.length === 0) {
    return (
      <>
        <h2>Game Options</h2>
        <p className="settings-empty">
          No games registered for <strong>{getSessionModeLabel(sessionMode)}</strong> yet.
        </p>
      </>
    );
  }

  return (
    <>
      <h2>Game Options</h2>

      <section className="game-options-section" aria-label="Game selection">
        <div className="game-mode-toggle" role="group" aria-label="Game selection mode">
          <button
            type="button"
            className={`game-mode-btn${isRandomMode ? ' game-mode-btn--active' : ''}`}
            aria-pressed={isRandomMode}
            onClick={selectRandomMode}
          >
            Random
          </button>
          <button
            type="button"
            className={`game-mode-btn${isSelectedMode ? ' game-mode-btn--active' : ''}`}
            aria-pressed={isSelectedMode}
            onClick={selectSelectedMode}
          >
            Selected
          </button>
        </div>

        <p className="game-mode-options-label">Games</p>

        <div className="settings-game-pool">
          {playableGames.map((game) => (
            <div key={game.id} className="settings-game-row">
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={isGameChecked(game.id)}
                  onChange={() => onGameToggle(game.id)}
                />
                <span>{gameLabel(game.id)}</span>
              </label>
              <button
                type="button"
                className="game-info-btn"
                aria-label={`About ${game.name}`}
                onClick={() => setInfoGameId(game.id)}
              >
                <InfoIcon />
              </button>
            </div>
          ))}
        </div>
      </section>

      {infoGame && (
        <div
          className="game-info-popup-backdrop"
          onClick={() => setInfoGameId(null)}
          role="presentation"
        >
          <div
            className="game-info-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-info-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="game-info-popup-close"
              aria-label="Close"
              onClick={() => setInfoGameId(null)}
            >
              ×
            </button>
            <h3 id="game-info-title" className="game-info-popup-title">
              {infoGame.name}
            </h3>
            <p className="game-info-popup-description">{infoGame.description}</p>
          </div>
        </div>
      )}
    </>
  );
}
