import { useState } from 'react';
import { isBot, showsAsReady } from '../../../shared/games/bots';
import { MAX_PLAYERS } from '../../../shared/constants';
import { getLobbyGameList } from '../../../shared/platform';
import type { RoomState } from '../../../shared/types';
import { useNetworkInfo } from '../../hooks/useSocket';
import LobbyClipboardIcon from './LobbyClipboardIcon';
import PlayerWinBadge from '../PlayerWinBadge';
import SoundToggle from '../SoundToggle';
import PlatformControllerShell from './PlatformControllerShell';

interface MobileControllerLobbyProps {
  state: RoomState;
  canReady: boolean;
  waitingOnOthers: boolean;
  onReady: () => void;
}

export default function MobileControllerLobby({
  state,
  canReady,
  waitingOnOthers,
  onReady,
}: MobileControllerLobbyProps) {
  const networkInfo = useNetworkInfo();
  const [copied, setCopied] = useState(false);

  const lobbyGames = getLobbyGameList(state.sessionMode, state.lobbySettings);
  const roomUrlBase = networkInfo?.roomUrl ?? `${window.location.origin}/room`;
  const guestUrl = `${roomUrlBase.replace(/\/$/, '')}/${state.id}`;

  const statusText =
    state.players.length === 0
      ? 'Waiting for players'
      : 'Game will begin when all players are ready';

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
    <PlatformControllerShell className="controller-lobby">
      <div className="controller-lobby-body">
        <div className="panel controller-lobby-panel controller-lobby-panel--room">
          <h2 className="lobby-room-heading controller-lobby-room-heading">
            Room Code: <span className="lobby-room-code">{state.id}</span>
          </h2>
          <button
            type="button"
            className={`lobby-url-btn btn btn-secondary${copied ? ' lobby-url-btn--copied' : ''}`}
            onClick={copyRoomUrl}
            aria-label={copied ? 'Room link copied' : 'Copy room link'}
          >
            <span className="lobby-url-text">{copied ? 'Copied to clipboard' : guestUrl}</span>
            <LobbyClipboardIcon />
          </button>
          <SoundToggle className="sound-toggle sound-toggle--mobile" />
        </div>

        <div className="panel controller-lobby-panel controller-lobby-panel--players">
          <h2>
            Players ({state.players.length}/{MAX_PLAYERS})
          </h2>
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
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel controller-lobby-panel controller-lobby-panel--games">
          <h2>Games</h2>
          {lobbyGames.length > 0 ? (
            <ul className="controller-game-list">
              {lobbyGames.map((game) => (
                <li key={game.id}>{game.name}</li>
              ))}
            </ul>
          ) : (
            <p className="lobby-status">No games selected yet</p>
          )}
        </div>

      </div>

      <div className="controller-lobby-footer">
        {waitingOnOthers && <p className="status-msg">Waiting for others…</p>}
        <button type="button" className="btn btn-primary btn-large" disabled={!canReady} onClick={onReady}>
          Ready
        </button>
      </div>
    </PlatformControllerShell>
  );
}
