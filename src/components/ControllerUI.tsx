import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RoomState } from '../../shared/types';
import { getTestBotColors } from '../../shared/constants';
import ColorPicker from './ColorPicker';

interface ControllerUIProps {
  state: RoomState | null;
  playerId: string | null;
  connected: boolean;
  booted?: boolean;
  onJoin: (name: string, color: string) => void;
  onReady: () => void;
  onJump: () => void;
  onRematchReady: () => void;
  joinError: string | null;
  roomId: string;
}

function ControllerShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="controller">
      <img src="/cowgirl-image.svg.png" alt="" className="controller-bg-image" />
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
  onRematchReady,
  joinError,
  roomId,
}: ControllerUIProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const takenColors = useMemo(() => {
    const taken = new Set(state?.players.map((p) => p.color) ?? []);
    if (state?.testMode) {
      for (const color of getTestBotColors()) {
        taken.add(color);
      }
    }
    return taken;
  }, [state?.players, state?.testMode]);

  useEffect(() => {
    if (selectedColor && takenColors.has(selectedColor)) {
      setSelectedColor(null);
    }
  }, [selectedColor, takenColors]);

  useEffect(() => {
    if (joinError?.toLowerCase().includes('color')) {
      setSelectedColor(null);
    }
  }, [joinError]);

  if (!connected) {
    return (
      <div className="controller">
        <p className="status-msg">Connecting…</p>
      </div>
    );
  }

  if (booted) {
    return (
      <div className="controller controller-booted">
        <div className="boot-screen">
          <div className="boot-icon" aria-hidden="true">
            <img src="/cowboy-boot-image.png" alt="" />
          </div>
          <h1 className="boot-title">You got the boot!</h1>
          <p className="boot-code">403</p>
          <p className="status-msg">The host removed you from the room.</p>
          <p className="status-msg boot-hint">Close this page. When you&apos;re ready, scan the QR code with your camera app.</p>
        </div>
      </div>
    );
  }

  if (!playerId) {
    if (!state) {
      return (
        <ControllerShell className="controller-signup">
          <h1 className="controller-title">Hoe Down Derby</h1>
          <p className="room-label">Room {roomId}</p>
          <p className="status-msg">Loading room…</p>
        </ControllerShell>
      );
    }

    return (
      <ControllerShell className="controller-signup">
        <h1 className="controller-title">Hoe Down Derby</h1>
        <p className="room-label">Room {roomId}</p>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          className="name-input"
        />
        <ColorPicker
          takenColors={takenColors}
          selected={selectedColor}
          onSelect={setSelectedColor}
        />
        {joinError && <p className="error">{joinError}</p>}
        <button
          className="btn btn-primary btn-large"
          disabled={!name.trim() || !selectedColor}
          onClick={() => selectedColor && onJoin(name.trim(), selectedColor)}
        >
          Join Room
        </button>
      </ControllerShell>
    );
  }

  if (!state) {
    return (
      <div className="controller">
        <p className="status-msg">Reconnecting…</p>
      </div>
    );
  }

  const me = state.players.find((p) => p.id === playerId);
  if (!me) {
    return (
      <div className="controller">
        <p className="status-msg">Reconnecting…</p>
      </div>
    );
  }

  if (state.phase === 'lobby') {
    const waitingOnOthers = me.ready && state.players.some((p) => !p.ready);

    return (
      <ControllerShell className="controller-lobby">
        <h1 className="controller-title">Hoe Down Derby</h1>
        <p className="controller-greeting">Howdy, {me.name}!</p>
        <p className="room-label">Room {state.id}</p>
        <div className="lobby-players-mobile">
          <h3>Players</h3>
          {state.players.map((p) => (
            <div key={p.id} className={`mobile-player ${p.ready ? 'ready' : ''}`}>
              <span style={{ color: p.color }}>●</span> {p.name}
              {p.ready ? ' ✓' : ''}
            </div>
          ))}
        </div>
        <div className="controller-lobby-footer">
          {waitingOnOthers && (
            <p className="status-msg">Waiting for everyone else…</p>
          )}
          <button
            className="btn btn-primary btn-large"
            disabled={me.ready}
            onClick={onReady}
          >
            Ready
          </button>
        </div>
      </ControllerShell>
    );
  }

  if (state.phase === 'countdown') {
    return (
      <div className="controller controller-game">
        <div className="controller-game-center">
          <div className="countdown-mobile">
            {state.countdown > 0 ? state.countdown : 'GO!'}
          </div>
          <p className="controller-game-hint">Get ready to jump!</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'playing') {
    return (
      <div className="controller controller-game">
        <div className="hud">
          <span>{me.name}</span>
          <span className="apples-display">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < me.lives ? 'filled' : 'empty'}>
                🍎
              </span>
            ))}
          </span>
        </div>
        <div className="controller-game-center">
          {me.eliminated ? (
            <div className="eliminated-msg">
              <p>You're out!</p>
              <p>Watch the main screen.</p>
            </div>
          ) : (
            <button className="btn-jump" onTouchStart={(e) => { e.preventDefault(); onJump(); }} onClick={onJump}>
              JUMP
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'winner') {
    const isWinner = state.winnerId === playerId;
    const waitingOnOthers = me.ready && state.players.some((p) => !p.ready);

    return (
      <ControllerShell>
        {isWinner ? (
          <>
            <div className="trophy-big">🏆</div>
            <h1>You Win!</h1>
          </>
        ) : (
          <h1>{state.winnerName ?? 'Nobody'} wins!</h1>
        )}
        <button
          className="btn btn-primary btn-large"
          disabled={me.ready}
          onClick={onRematchReady}
        >
          Ready
        </button>
        {waitingOnOthers && (
          <p className="status-msg">Waiting for everyone else…</p>
        )}
      </ControllerShell>
    );
  }

  return null;
}
