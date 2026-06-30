import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { LobbySettings } from '../../shared/platform';
import { getResetLobbySettings } from '../../shared/platform';
import { isBot, showsAsReady } from '../../shared/games/bots';
import { MAX_PLAYERS } from '../../shared/constants';
import { getLobbyGameDefinition } from '../../shared/games/registry';
import { getSessionModeLabel } from '../../shared/session';
import type { RoomState } from '../../shared/types';
import LobbyClipboardIcon from './mobile/LobbyClipboardIcon';
import PlayerWinBadge from './PlayerWinBadge';
import LobbySettingsPanel from './LobbySettingsPanel';

interface LobbyProps {
  state: RoomState;
  roomUrlBase: string;
  onExit?: () => void;
  onKick?: (playerId: string) => void;
  onUpdateSettings?: (patch: Partial<LobbySettings>) => void;
  onAddBot?: () => void;
  onRemoveBot?: (botId: string) => void;
}

export default function Lobby({
  state,
  roomUrlBase,
  onExit,
  onKick,
  onUpdateSettings,
  onAddBot,
  onRemoveBot,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [waitingDots, setWaitingDots] = useState(1);
  const bots = state.players.filter((p) => isBot(p.id));
  const waitingForPlayers = state.players.length === 0;

  useEffect(() => {
    if (!waitingForPlayers) return;
    const id = window.setInterval(() => {
      setWaitingDots((d) => (d % 3) + 1);
    }, 500);
    return () => window.clearInterval(id);
  }, [waitingForPlayers]);

  let statusText = `Waiting for players${'.'.repeat(waitingDots)}`;
  if (state.players.length > 0) {
    statusText = 'Game will begin when all players are ready';
  }

  const gameDef = getLobbyGameDefinition(state.sessionMode, state.lobbySettings.specificGameId);
  const canAddBot = onAddBot && bots.length < (gameDef?.maxBots ?? 0);

  const guestUrl = `${roomUrlBase.replace(/\/$/, '')}/${state.id}`;

  const copyRoomUrl = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleResetSettings = () => {
    if (!onUpdateSettings) return;
    onUpdateSettings(getResetLobbySettings(state.sessionMode));
  };

  return (
    <div className="lobby">
      <div className="lobby-layout">
        <div className="panel lobby-panel lobby-panel--lobby">
          <div className="lobby-panel-header">
            <h1 className="lobby-room-heading">
              Room Code: <span className="lobby-room-code">{state.id}</span>
            </h1>
            {onExit && (
              <button type="button" className="lobby-panel-btn" onClick={onExit}>
                Exit
              </button>
            )}
          </div>
          <p className="lobby-session-mode">{getSessionModeLabel(state.sessionMode)}</p>

          <div className="qr-panel">
            <QRCodeSVG value={guestUrl} size={180} level="M" includeMargin />
          </div>

          <button
            type="button"
            className={`lobby-url-btn btn btn-secondary${copied ? ' lobby-url-btn--copied' : ''}`}
            onClick={copyRoomUrl}
            aria-label={copied ? 'Room link copied' : 'Copy room link'}
          >
            <span className="lobby-url-text">{copied ? 'Copied to clipboard' : guestUrl}</span>
            <LobbyClipboardIcon />
          </button>
        </div>

        <div className="panel lobby-panel lobby-panel--players">
          <div className="lobby-panel-header">
            <h1>Players ({state.players.length}/{MAX_PLAYERS})</h1>
            {onAddBot && (
              <button
                type="button"
                className="lobby-panel-btn"
                disabled={!canAddBot}
                onClick={onAddBot}
              >
                Add bot
              </button>
            )}
          </div>
          <p className="lobby-status">{statusText}</p>
          {state.players.length > 0 && (
            <ul className="player-list">
              {state.players.map((p) => (
                <li key={p.id} className={showsAsReady(p) ? 'ready' : ''}>
                  <span className="player-dot" style={{ background: p.color }} />
                  <span className="player-name">
                    {p.name}
                    <PlayerWinBadge wins={p.wins ?? 0} />
                    {isBot(p.id) && <span className="bot-tag"> (bot)</span>}
                  </span>
                  <span className="player-status">{showsAsReady(p) ? 'Ready' : 'Waiting'}</span>
                  {isBot(p.id) && onRemoveBot && (
                    <button
                      type="button"
                      className="kick-btn"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => onRemoveBot(p.id)}
                    >
                      ×
                    </button>
                  )}
                  {!isBot(p.id) && onKick && (
                    <button
                      type="button"
                      className="kick-btn"
                      aria-label={`Kick ${p.name}`}
                      onClick={() => onKick(p.id)}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel lobby-panel lobby-panel--games">
          {onUpdateSettings && (
            <div className="lobby-settings">
              <LobbySettingsPanel
                sessionMode={state.sessionMode}
                settings={state.lobbySettings}
                onChange={onUpdateSettings}
                onReset={handleResetSettings}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
