import { useState, type ReactNode } from 'react';
import type { RoomState } from '../../shared/types';
import { isBot } from '../../shared/games/bots';
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
    if (!state) {
      return (
        <PlatformController className="controller-signup">
          <h1 className="platform-title">Join lobby</h1>
          <p className="hint">Room {roomId}</p>
          <p className="status-msg">{joinError ?? 'Loading room…'}</p>
          {onLeave && (
            <button type="button" className="btn btn-secondary" onClick={onLeave}>
              Change room code
            </button>
          )}
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
