import type { LobbySettings } from '../../shared/platform';
import { getResetLobbySettings } from '../../shared/platform';
import { isBot } from '../../shared/games/bots';
import { MAX_PLAYERS } from '../../shared/constants';
import { getLobbyGameDefinition, getPlayableGamesForSessionMode } from '../../shared/games/registry';
import { getSessionModeLabel } from '../../shared/session';
import type { RoomState } from '../../shared/types';
import LobbySettingsPanel from './LobbySettingsPanel';
import PlayerWinBadge from './PlayerWinBadge';
import type { LocalPadInfo, LocalSlotState } from '../local/useLocalControllers';

const CONTROL_COPY: Record<string, { title: string; lines: string[] }> = {
  'shots-fired': {
    title: 'Shots Fired',
    lines: [
      'Move — left stick, or WASD',
      'Look — right stick, or mouse',
      'Shoot — R2 / RT, or left click',
      'Melee — Square / X, or right click',
      'Jump — Cross / A, or Space',
    ],
  },
  'hoe-down-derby': {
    title: 'Hoe Down Derby',
    lines: ['Jump — Cross / A, any face button, or Space'],
  },
};

function legendGameIds(state: RoomState): string[] {
  const playable = getPlayableGamesForSessionMode(state.sessionMode).map((game) => game.id);
  if (state.lobbySettings.gameSelectionMode === 'specific' && state.lobbySettings.specificGameId) {
    return playable.includes(state.lobbySettings.specificGameId) ? [state.lobbySettings.specificGameId] : playable;
  }
  const pool = state.lobbySettings.gamePool.filter((id) => playable.includes(id));
  return pool.length > 0 ? pool : playable;
}

interface LocalPlayerPanelProps {
  state: RoomState;
  slots: LocalSlotState[];
  unassignedPads: LocalPadInfo[];
  notice: string | null;
  showBots: boolean;
  onAddKeyboard: () => void;
  onRemoveSlot: (slotId: string) => void;
  onAddBot?: () => void;
  onRemoveBot?: (botId: string) => void;
}

export function LocalPlayerPanel({
  state,
  slots,
  unassignedPads,
  notice,
  showBots,
  onAddKeyboard,
  onRemoveSlot,
  onAddBot,
  onRemoveBot,
}: LocalPlayerPanelProps) {
  const bots = state.players.filter((player) => isBot(player.id));
  const gameDef = getLobbyGameDefinition(state.sessionMode, state.lobbySettings.specificGameId);
  const keyboardTaken = slots.some((slot) => slot.kind === 'keyboard');
  const canAddBot = showBots && onAddBot && bots.length < (gameDef?.maxBots ?? 0) && state.players.length < MAX_PLAYERS;
  const legends = legendGameIds(state).map((id) => CONTROL_COPY[id]).filter((entry) => entry != null);

  return (
    <div className="local-player-panel">
      <div className="lobby-panel-header">
        <h1>Players ({state.players.length}/{MAX_PLAYERS})</h1>
        <div className="lobby-panel-header-actions">
          {showBots && onAddBot && (
            <button type="button" className="lobby-panel-btn" disabled={!canAddBot} onClick={onAddBot}>
              Add bot
            </button>
          )}
          <button type="button" className="lobby-panel-btn" disabled={keyboardTaken} onClick={onAddKeyboard}>
            Keyboard
          </button>
        </div>
      </div>
      <p className="lobby-status">Press a button on a controller to add a player.</p>
      {notice && <p className="error local-player-notice">{notice}</p>}
      <ul className="player-list">
        {slots.map((slot) => {
          const player = slot.playerId ? state.players.find((entry) => entry.id === slot.playerId) : undefined;
          return (
            <li key={slot.slotId}>
              <span className="player-dot" style={{ background: player?.color ?? '#555' }} />
              <span className="player-name">
                {player?.name ?? slot.name}
                <PlayerWinBadge wins={player?.wins ?? 0} />
                <span className="local-device-tag">{slot.label}</span>
              </span>
              <span className="player-status">{player ? 'In' : 'Joining…'}</span>
              <button
                type="button"
                className="kick-btn"
                aria-label={`Remove ${slot.name}`}
                onClick={() => onRemoveSlot(slot.slotId)}
              >
                ×
              </button>
            </li>
          );
        })}
        {showBots && bots.map((bot) => (
          <li key={bot.id}>
            <span className="player-dot" style={{ background: bot.color }} />
            <span className="player-name">
              {bot.name}
              <PlayerWinBadge wins={bot.wins ?? 0} />
              <span className="local-device-tag">Bot</span>
            </span>
            <span className="player-status">In</span>
            {onRemoveBot && (
              <button
                type="button"
                className="kick-btn"
                aria-label={`Remove ${bot.name}`}
                onClick={() => onRemoveBot(bot.id)}
              >
                ×
              </button>
            )}
          </li>
        ))}
        {unassignedPads.map((pad) => (
          <li key={`pad-${pad.index}`} className="local-pad-waiting">
            <span className="player-dot" />
            <span className="player-name">{pad.label}</span>
            <span className="player-status">Press a button</span>
          </li>
        ))}
      </ul>
      {slots.length === 0 && unassignedPads.length === 0 && (
        <p className="local-player-empty">
          Plug in a controller and press any button. PlayStation, Xbox, and most other gamepads work. One player can use the keyboard and mouse.
        </p>
      )}
      {legends.length > 0 && (
        <div className="local-control-legend">
          {legends.map((legend) => (
            <div key={legend.title}>
              <h2>{legend.title}</h2>
              <ul>
                {legend.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface LocalControllerLobbyProps {
  state: RoomState;
  slots: LocalSlotState[];
  unassignedPads: LocalPadInfo[];
  notice: string | null;
  onAddKeyboard: () => void;
  onRemoveSlot: (slotId: string) => void;
  onStart: () => void;
  onExit: () => void;
  onUpdateSettings: (patch: Partial<LobbySettings>) => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onStartBotsOnly: () => void;
}

export function LocalControllerLobby({
  state,
  slots,
  unassignedPads,
  notice,
  onAddKeyboard,
  onRemoveSlot,
  onStart,
  onExit,
  onUpdateSettings,
  onAddBot,
  onRemoveBot,
  onStartBotsOnly,
}: LocalControllerLobbyProps) {
  const bots = state.players.filter((player) => isBot(player.id));
  const gameDef = getLobbyGameDefinition(state.sessionMode, state.lobbySettings.specificGameId);
  const pending = slots.some((slot) => !slot.playerId);
  const minPlayers = gameDef?.minPlayers ?? 1;
  const canStart = !pending && state.players.length >= minPlayers && (slots.length > 0 || bots.length > 0);

  const handleStart = () => {
    if (slots.length > 0) onStart();
    else onStartBotsOnly();
  };

  return (
    <div className="lobby lobby--local">
      <div className="lobby-layout lobby-layout--local">
        <div className="panel lobby-panel">
          <div className="lobby-panel-header">
            <h1>{getSessionModeLabel(state.sessionMode)}</h1>
            <button type="button" className="lobby-panel-btn" onClick={onExit}>
              Exit
            </button>
          </div>
          <LocalPlayerPanel
            state={state}
            slots={slots}
            unassignedPads={unassignedPads}
            notice={notice}
            showBots
            onAddKeyboard={onAddKeyboard}
            onRemoveSlot={onRemoveSlot}
            onAddBot={onAddBot}
            onRemoveBot={onRemoveBot}
          />
        </div>
        <div className="panel lobby-panel lobby-panel--games">
          <LobbySettingsPanel
            sessionMode={state.sessionMode}
            settings={state.lobbySettings}
            onChange={onUpdateSettings}
            onReset={() => onUpdateSettings(getResetLobbySettings(state.sessionMode))}
          />
          <button type="button" className={`btn ${canStart ? 'btn-primary' : 'btn-secondary'}`} disabled={!canStart} onClick={handleStart}>
            Start game
          </button>
          {!canStart && (
            <p className="local-start-hint">
              {pending ? 'Waiting for a controller to finish joining.' : `Add at least ${minPlayers} player${minPlayers === 1 ? '' : 's'}.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface LocalPlayerOverlayProps {
  state: RoomState;
  slots: LocalSlotState[];
  unassignedPads: LocalPadInfo[];
  notice: string | null;
  onAddKeyboard: () => void;
  onRemoveSlot: (slotId: string) => void;
  onClose: () => void;
  onBackToSetup: () => void;
}

export function LocalPlayerOverlay({
  state,
  slots,
  unassignedPads,
  notice,
  onAddKeyboard,
  onRemoveSlot,
  onClose,
  onBackToSetup,
}: LocalPlayerOverlayProps) {
  const endingRound = state.phase !== 'winner';

  return (
    <div className="local-players-overlay">
      <div className="local-players-dialog panel" role="dialog" aria-label="Player settings">
        <div className="lobby-panel-header">
          <h1>Player settings</h1>
        </div>
        <LocalPlayerPanel
          state={state}
          slots={slots}
          unassignedPads={unassignedPads}
          notice={notice}
          showBots={false}
          onAddKeyboard={onAddKeyboard}
          onRemoveSlot={onRemoveSlot}
        />
        <div className="local-overlay-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
          <button type="button" className="btn btn-primary" onClick={onBackToSetup}>
            {endingRound ? 'End round' : 'Back to setup'}
          </button>
        </div>
      </div>
    </div>
  );
}
