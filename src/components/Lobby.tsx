import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { LobbySettings } from '../../shared/platform';
import { isBot } from '../../shared/games/bots';
import { MAX_PLAYERS } from '../../shared/constants';
import { getLobbyGameDefinition } from '../../shared/games/registry';
import { getSessionModeLabel } from '../../shared/session';
import type { RoomState } from '../../shared/types';
import LobbySettingsPanel from './LobbySettingsPanel';

interface LobbyProps {
  state: RoomState;
  roomUrlBase: string;
  onKick?: (playerId: string) => void;
  onUpdateSettings?: (patch: Partial<LobbySettings>) => void;
  onAddBot?: () => void;
  onRemoveBot?: (botId: string) => void;
}

function ClipboardIcon() {
  return (
    <svg
      className="lobby-url-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Lobby({
  state,
  roomUrlBase,
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

  return (
    <div className="lobby">
      <div className="lobby-layout">
        <div className="panel lobby-panel lobby-panel--lobby">
          <h2 className="lobby-room-heading">
            Room Code: <span className="lobby-room-code">{state.id}</span>
          </h2>
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
            <ClipboardIcon />
          </button>
        </div>

        <div className="panel lobby-panel lobby-panel--players">
          <h2>Players ({state.players.length}/{MAX_PLAYERS})</h2>
          <p className="lobby-status">{statusText}</p>
          {state.players.length > 0 && (
            <ul className="player-list">
              {state.players.map((p) => (
                <li key={p.id} className={p.ready ? 'ready' : ''}>
                  <span className="player-dot" style={{ background: p.color }} />
                  <span className="player-name">
                    {p.name}
                    {isBot(p.id) && <span className="bot-tag"> (bot)</span>}
                  </span>
                  <span className="player-status">{p.ready ? 'Ready' : 'Waiting'}</span>
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
          {onAddBot && (
            <button
              type="button"
              className="game-mode-btn lobby-add-bot-btn"
              disabled={!canAddBot}
              onClick={onAddBot}
            >
              Add bot
            </button>
          )}
        </div>

        <div className="panel lobby-panel lobby-panel--games">
          {onUpdateSettings && (
            <div className="lobby-settings">
              <LobbySettingsPanel
                sessionMode={state.sessionMode}
                settings={state.lobbySettings}
                onChange={onUpdateSettings}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
