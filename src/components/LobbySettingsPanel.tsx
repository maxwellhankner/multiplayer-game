import { useEffect, useState } from 'react';
import {
  SHOOTERS_KILL_OPTIONS,
  SHOOTERS_TIME_OPTIONS,
  normalizeShootersShootSettings,
  shootersTimeLabel,
  type ShootersShootLobbySettings,
} from '../../shared/games/shooters-shoot/lobby';
import type { LobbySettings } from '../../shared/platform';
import {
  getGameById,
  getPlayableGamesForSessionMode,
} from '../../shared/games/registry';
import type { SessionMode } from '../../shared/session';
import { getSessionModeLabel } from '../../shared/session';
import SoundToggle from './SoundToggle';

interface LobbySettingsPanelProps {
  sessionMode: SessionMode;
  settings: LobbySettings;
  onChange: (patch: Partial<LobbySettings>) => void;
  onReset?: () => void;
}

function ShootersShootSettings({
  settings,
  onChange,
}: {
  settings: ShootersShootLobbySettings;
  onChange: (next: ShootersShootLobbySettings) => void;
}) {
  const killsMode = settings.winMode === 'kills';

  return (
    <section className="shooters-settings" aria-label="Shooters Shoot match">
      <p className="game-mode-options-label">Game Type</p>
      <div className="game-mode-toggle" role="group" aria-label="How the match ends">
        <button
          type="button"
          className={`game-mode-btn${killsMode ? ' game-mode-btn--active' : ''}`}
          aria-pressed={killsMode}
          onClick={() => onChange({ ...settings, winMode: 'kills' })}
        >
          Kills to win
        </button>
        <button
          type="button"
          className={`game-mode-btn${!killsMode ? ' game-mode-btn--active' : ''}`}
          aria-pressed={!killsMode}
          onClick={() => onChange({ ...settings, winMode: 'timed' })}
        >
          Timed match
        </button>
      </div>

      {killsMode ? (
        <>
          <p className="game-mode-options-label">Kills</p>
          <div className="shooters-option-grid" role="group" aria-label="Kills to win">
            {SHOOTERS_KILL_OPTIONS.map((kills) => (
              <button
                key={kills}
                type="button"
                className={`game-mode-btn${settings.killsToWin === kills ? ' game-mode-btn--active' : ''}`}
                aria-pressed={settings.killsToWin === kills}
                onClick={() => onChange({ ...settings, killsToWin: kills })}
              >
                {kills}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="game-mode-options-label">Time</p>
          <div className="shooters-option-grid" role="group" aria-label="Time limit">
            {SHOOTERS_TIME_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={`game-mode-btn${settings.timeLimitMin === minutes ? ' game-mode-btn--active' : ''}`}
                aria-pressed={settings.timeLimitMin === minutes}
                onClick={() => onChange({ ...settings, timeLimitMin: minutes })}
              >
                {shootersTimeLabel(minutes)}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
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
  onReset,
}: LobbySettingsPanelProps) {
  const [infoGameId, setInfoGameId] = useState<string | null>(null);
  const infoGame = infoGameId ? getGameById(infoGameId) : null;
  const playableGames = getPlayableGamesForSessionMode(sessionMode);
  const shootersSettings = normalizeShootersShootSettings(settings.shootersShoot);
  const showShootersSettings = playableGames.some((game) => game.id === 'shooters-shoot');
  const playableIds = playableGames.map((g) => g.id);
  const hideGamePicker = sessionMode === 'local-controllers';

  const gameLabel = (id: string) => getGameById(id)?.name ?? id;

  const isRandomMode =
    settings.gameSelectionMode === 'random-from-pool' || settings.gameSelectionMode === 'random';
  const isSelectedMode = settings.gameSelectionMode === 'specific';

  const storedPool =
    settings.gameSelectionMode === 'random'
      ? playableIds
      : settings.gamePool.filter((id) => playableIds.includes(id));
  const randomPoolIds = storedPool.length > 0 ? storedPool : playableIds;

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
        <div className="lobby-panel-header">
          <h1>Game Options</h1>
          <div className="lobby-panel-header-actions">
            <SoundToggle className="lobby-panel-btn" iconOnly />
            {onReset && (
              <button type="button" className="lobby-panel-btn" onClick={onReset}>
                Reset
              </button>
            )}
          </div>
        </div>
        <p className="settings-empty">
          No games registered for <strong>{getSessionModeLabel(sessionMode)}</strong> yet.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="lobby-panel-header">
        <h1>Game Options</h1>
        <div className="lobby-panel-header-actions">
          <SoundToggle className="lobby-panel-btn" iconOnly />
          {onReset && (
            <button type="button" className="lobby-panel-btn" onClick={onReset}>
              Reset
            </button>
          )}
        </div>
      </div>

      {!hideGamePicker && (
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
      )}

      {showShootersSettings && (
        <ShootersShootSettings
          settings={shootersSettings}
          onChange={(shootersShoot) => onChange({ shootersShoot })}
        />
      )}

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
            data-controller-modal
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="game-info-popup-close"
              aria-label="Close"
              data-controller-initial
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
