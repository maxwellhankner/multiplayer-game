import { useEffect, useState, type ReactNode } from 'react';
import type { BalloonInput, CoinStickInput, RoomState, ScribbleStroke } from '../../shared/types';
import { isBot } from '../../shared/games/bots';
import { getSessionModeLabel } from '../../shared/session';
import GameControllerRouter from '../games/GameControllerRouter';
import MobileControllerHostClosed from './mobile/MobileControllerHostClosed';
import MobileControllerLobby from './mobile/MobileControllerLobby';
import MobileControllerWinner from './mobile/MobileControllerWinner';
import PlatformControllerShell from './mobile/PlatformControllerShell';

interface ControllerUIProps {
  state: RoomState | null;
  playerId: string | null;
  connected: boolean;
  booted?: boolean;
  onJoin: (name: string) => void;
  onReady: () => void;
  onJump: () => void;
  onCoinInput: (input: CoinStickInput) => void;
  onBalloonInput: (input: BalloonInput) => void;
  onScribblePrompt: (prompt: string) => void;
  onScribbleDraw: (strokes: ScribbleStroke[]) => void;
  onScribblePick: (artistId: string) => void;
  onLandscapeReady: () => void;
  onLobbyReady: () => void;
  joinError: string | null;
  roomId: string;
  savedName?: string | null;
  onLeave?: () => void;
  onBackToJoin?: () => void;
}

function PlatformController({ children, className }: { children: ReactNode; className?: string }) {
  return <PlatformControllerShell className={className}>{children}</PlatformControllerShell>;
}

export default function ControllerUI({
  state,
  playerId,
  connected,
  booted = false,
  onJoin,
  onReady,
  onJump,
  onCoinInput,
  onBalloonInput,
  onScribblePrompt,
  onScribbleDraw,
  onScribblePick,
  onLandscapeReady,
  onLobbyReady,
  joinError,
  roomId,
  savedName,
  onLeave,
  onBackToJoin,
}: ControllerUIProps) {
  const [name, setName] = useState(savedName ?? '');
  const hostOffline = state?.sessionMode === 'pc-host' && state.hostOnline === false;

  useEffect(() => {
    if (savedName) setName(savedName);
  }, [savedName]);

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

          {hostOffline && (
            <p className="status-msg controller-host-closed-hint">
              This lobby is closed. Please wait for it to come back online.
            </p>
          )}

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
              className={`btn btn-large ${name.trim() && !hostOffline ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!name.trim() || hostOffline}
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

  if (hostOffline && onBackToJoin) {
    return <MobileControllerHostClosed onBackToJoin={onBackToJoin} />;
  }

  if (state.phase === 'lobby') {
    const waitingOnOthers = me.ready && state.players.some((p) => !isBot(p.id) && !p.ready);
    const canReady = !me.ready;

    return (
      <MobileControllerLobby
        state={state}
        canReady={canReady}
        waitingOnOthers={waitingOnOthers}
        onReady={onReady}
      />
    );
  }

  if (state.phase === 'orient' || state.phase === 'countdown' || state.phase === 'playing') {
    return (
      <div className="controller-game-shell">
        <GameControllerRouter
          state={state}
          playerId={playerId}
          onJump={onJump}
          onCoinInput={onCoinInput}
          onBalloonInput={onBalloonInput}
          onScribblePrompt={onScribblePrompt}
          onScribbleDraw={onScribbleDraw}
          onScribblePick={onScribblePick}
          onLandscapeReady={onLandscapeReady}
        />
      </div>
    );
  }

  if (state.phase === 'winner') {
    const waitingOnOthers = me.ready && state.players.some((p) => !isBot(p.id) && !p.ready);

    return (
      <MobileControllerWinner
        state={state}
        playerId={playerId}
        meReady={me.ready}
        waitingOnOthers={waitingOnOthers}
        onLobbyReady={onLobbyReady}
      />
    );
  }

  return null;
}
