import { useState, type ReactNode } from 'react';
import type { RoomState } from '../../shared/types';
import { isBot } from '../../shared/games/bots';
import { MAX_PLAYERS } from '../../shared/constants';
import { getLobbyGameList } from '../../shared/platform';
import { getSessionModeLabel } from '../../shared/session';
import GameControllerRouter from '../games/GameControllerRouter';

interface ControllerUIProps {
  state: RoomState | null;
  playerId: string | null;
  connected: boolean;
  booted?: boolean;
  onJoin: (name: string) => void;
  onReady: () => void;
  onJump: () => void;
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onLobbyReady: () => void;
  joinError: string | null;
  roomId: string;
  onLeave?: () => void;
}

function PlatformController({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="platform-shell controller">
      <div className={`controller-inner${className ? ` ${className}` : ''}`}>{children}</div>
    </div>
  );
}

export default function ControllerUI({
  state,
  playerId,
  connected,
  booted = false,
  onJoin,
  onReady,
  onJump,
  onTap,
  onHoldStart,
  onHoldEnd,
  onLobbyReady,
  joinError,
  roomId,
  onLeave,
}: ControllerUIProps) {
  const [name, setName] = useState('');

  if (!connected) {
    return (
      <div className="platform-shell controller">
        <p className="status-msg">Connecting…</p>
      </div>
    );
  }

  if (booted) {
    return (
      <div className="platform-shell controller">
        <div className="boot-screen">
          <h1 className="boot-title">Removed from room</h1>
          <p className="status-msg">The host removed you from the lobby.</p>
          <p className="boot-hint">Scan the QR code again to rejoin.</p>
        </div>
      </div>
    );
  }

  if (!playerId) {
    const isPcHost = state?.sessionMode === 'pc-host';

    if (!state) {
      return (
        <PlatformController className="controller-room-page controller-signup--pc-host">
          <h2 className="lobby-room-heading controller-lobby-heading">
            Room Code: <span className="lobby-room-code">{roomId}</span>
          </h2>
          <p className="status-msg lobby-status">{joinError ?? 'Loading room…'}</p>
        </PlatformController>
      );
    }

    if (isPcHost) {
      return (
        <PlatformController className="controller-room-page controller-signup--pc-host">
          <h2 className="lobby-room-heading controller-lobby-heading">
            Room Code: <span className="lobby-room-code">{state.id}</span>
          </h2>
          <p className="lobby-session-mode">{getSessionModeLabel(state.sessionMode)}</p>

          <form
            className="panel controller-lobby-panel"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onJoin(name.trim());
            }}
          >
            <h2>Your name</h2>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              className="text-input"
              autoComplete="off"
            />
            {joinError && <p className="error controller-join-error">{joinError}</p>}
            <button
              type="submit"
              className={`btn btn-large ${name.trim() ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!name.trim()}
            >
              Join
            </button>
          </form>
        </PlatformController>
      );
    }

    return (
      <PlatformController className="controller-signup">
        <h1 className="platform-title">Join lobby</h1>
        <p className="hint">Room {roomId}</p>
        <span className="badge">{getSessionModeLabel(state.sessionMode)}</span>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          className="text-input"
        />
        <p className="hint">A color is assigned when you join.</p>
        {joinError && <p className="error">{joinError}</p>}
        <button
          className="btn btn-primary btn-large"
          disabled={!name.trim()}
          onClick={() => onJoin(name.trim())}
        >
          Join
        </button>
        {onLeave && (
          <button type="button" className="btn btn-secondary" onClick={onLeave}>
            Change room code
          </button>
        )}
      </PlatformController>
    );
  }

  if (!state) {
    return (
      <div className="platform-shell controller">
        <p className="status-msg">Reconnecting…</p>
      </div>
    );
  }

  const me = state.players.find((p) => p.id === playerId);
  if (!me) {
    return (
      <div className="platform-shell controller">
        <p className="status-msg">Reconnecting…</p>
      </div>
    );
  }

  if (state.phase === 'lobby') {
    const waitingOnOthers = me.ready && state.players.some((p) => !p.ready);

    if (state.sessionMode === 'pc-host') {
      const lobbyGames = getLobbyGameList(state.sessionMode, state.lobbySettings);
      const statusText =
        state.players.length === 0
          ? 'Waiting for players'
          : 'Game will begin when all players are ready';

      return (
        <PlatformController className="controller-room-page controller-lobby--pc-host">
          <h2 className="lobby-room-heading controller-lobby-heading">
            Room Code: <span className="lobby-room-code">{state.id}</span>
          </h2>
          <p className="lobby-session-mode">{getSessionModeLabel(state.sessionMode)}</p>

          <div className="panel controller-lobby-panel">
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

          <div className="panel controller-lobby-panel controller-lobby-panel--players">
            <h2>
              Players ({state.players.length}/{MAX_PLAYERS})
            </h2>
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
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="controller-lobby-footer">
            {waitingOnOthers && <p className="status-msg">Waiting for others…</p>}
            <button className="btn btn-primary btn-large" disabled={me.ready} onClick={onReady}>
              Ready
            </button>
          </div>
        </PlatformController>
      );
    }

    return (
      <PlatformController className="controller-lobby">
        <h1 className="platform-title">Lobby</h1>
        <p className="hint">
          {me.name} · Room {state.id}
        </p>
        <div className="lobby-players-mobile">
          <h3>Players</h3>
          {state.players.map((p) => (
            <div key={p.id} className={`mobile-player ${p.ready ? 'ready' : ''}`}>
              <span style={{ color: p.color }}>●</span> {p.name}
              {isBot(p.id) ? ' (bot)' : ''}
              {p.ready ? ' ✓' : ''}
            </div>
          ))}
        </div>
        <div className="controller-lobby-footer">
          {waitingOnOthers && <p className="status-msg">Waiting for others…</p>}
          <button className="btn btn-primary btn-large" disabled={me.ready} onClick={onReady}>
            Ready
          </button>
        </div>
      </PlatformController>
    );
  }

  if (state.phase === 'countdown' || state.phase === 'playing') {
    return (
      <GameControllerRouter
        state={state}
        playerId={playerId}
        onJump={onJump}
        onTap={onTap}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
      />
    );
  }

  if (state.phase === 'winner') {
    const waitingOnOthers = me.ready && state.players.some((p) => !p.ready);

    return (
      <PlatformController>
        <h1 className="platform-title">
          {state.winnerId === playerId
            ? 'You win!'
            : state.winnerId
              ? `${state.winnerName} wins`
              : 'Round over'}
        </h1>
        <button className="btn btn-primary btn-large" disabled={me.ready} onClick={onLobbyReady}>
          Back to lobby
        </button>
        {waitingOnOthers && <p className="status-msg">Waiting for others…</p>}
      </PlatformController>
    );
  }

  return null;
}
