import { QRCodeSVG } from 'qrcode.react';
import type { RoomState } from '../../shared/types';

interface LobbyProps {
  state: RoomState;
  joinUrl: string;
  onKick?: (playerId: string) => void;
}

export default function Lobby({ state, joinUrl, onKick }: LobbyProps) {
  const readyCount = state.players.filter((p) => p.ready).length;
  const total = state.players.length;
  const allReady = total > 0 && readyCount === total;
  const fullJoinUrl = `${joinUrl}?room=${state.id}`;

  let statusText = 'Waiting for players…';
  if (total > 0 && !allReady) {
    statusText = `Waiting for ready… (${readyCount}/${total})`;
  }
  if (allReady) {
    statusText = 'Starting…';
  }

  return (
    <div className="lobby">
      <div className="lobby-sunset" aria-hidden="true">
        <svg className="lobby-sunset-arc" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lobbyGround" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b4423" />
              <stop offset="100%" stopColor="#3d2314" />
            </linearGradient>
          </defs>
          <path
            d="M-80,130 Q720,210 1520,130 L1520,400 L-80,400 Z"
            fill="url(#lobbyGround)"
          />
          <path
            d="M-80,130 Q720,210 1520,130"
            fill="none"
            stroke="rgba(255, 185, 90, 0.9)"
            strokeWidth="4"
          />
        </svg>
      </div>

      <img src="/cowgirl-image.svg.png" alt="" className="lobby-bg-image" />

      <div className="lobby-inner">
        <h1 className="lobby-title">Hoe Down Derby</h1>
        {state.testMode && <p className="test-mode-badge">Test mode — 3 bot riders auto-join</p>}

        <div className="lobby-content">
          <div className="qr-panel">
            <QRCodeSVG value={fullJoinUrl} size={200} level="M" includeMargin />
            <p className="room-code">
              Room <strong>{state.id}</strong>
            </p>
          </div>

          <div className="players-panel">
            <h2>Players ({state.players.length})</h2>
            <p className="lobby-status">{statusText}</p>
            {state.players.length === 0 ? (
              <p className="empty-players">Scan the QR code to join</p>
            ) : (
              <ul className="player-list">
                {state.players.map((p) => (
                  <li key={p.id} className={p.ready ? 'ready' : ''}>
                    <span className="player-dot" style={{ background: p.color }} />
                    <span className="player-name">
                      {p.name}
                      {p.id.startsWith('bot-') && <span className="bot-tag"> BOT</span>}
                    </span>
                    <span className="player-status">{p.ready ? 'Ready' : 'Waiting'}</span>
                    {onKick && !p.id.startsWith('bot-') && (
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
        </div>
      </div>
    </div>
  );
}
