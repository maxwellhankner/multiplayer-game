import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionModePicker from '../components/SessionModePicker';
import ScreenControls from '../components/ScreenControls';
import { useSocket } from '../hooks/useSocket';
import { PLATFORM_NAME } from '../../shared/platform';
import { guestRoomPath, hostRoomPath, isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '../../shared/routes';
import type { SessionMode } from '../../shared/session';
import type { RoomState } from '../../shared/types';

export default function HomePage() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [roomInput, setRoomInput] = useState('');
  const [pendingMode, setPendingMode] = useState<SessionMode | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const canJoin = isValidRoomCode(roomInput);
  const creating = pendingMode != null;

  const handleLaunch = (mode: SessionMode) => {
    if (!socket.current || !connected || creating) return;
    setPendingMode(mode);
    setCreateError(null);

    socket.current.emit(
      'host:create',
      { sessionMode: mode },
      (res: RoomState | { error: string }) => {
        setPendingMode(null);
        if ('error' in res) {
          setCreateError(res.error);
          return;
        }
        navigate(hostRoomPath(res.id), { replace: true });
      },
    );
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeRoomCode(roomInput);
    if (!isValidRoomCode(code)) return;
    navigate(guestRoomPath(code));
  };

  return (
    <div className="platform-shell">
      <ScreenControls />
      <div className="platform-page home-page">
        <div className="home-inner">
          <h1 className="home-title">{PLATFORM_NAME}</h1>

          <section className="home-section" aria-labelledby="join-heading">
            <h2 id="join-heading" className="home-section-title">Join a lobby</h2>
            <form className="home-join" onSubmit={handleJoin}>
              <input
                id="room-code"
                type="text"
                className="text-input text-input--code"
                placeholder="Room Code"
                aria-label="Room code"
                value={roomInput}
                maxLength={ROOM_CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(e) =>
                  setRoomInput(normalizeRoomCode(e.target.value).slice(0, ROOM_CODE_LENGTH))
                }
              />
              <button
                type="submit"
                className={`btn home-join-btn ${canJoin ? 'btn-primary' : 'btn-secondary'}`}
                disabled={!canJoin}
              >
                Join
              </button>
            </form>
          </section>

          <section className="home-section home-host" aria-labelledby="host-heading">
            <h2 id="host-heading" className="home-section-title">Host a lobby</h2>
            <SessionModePicker
              onLaunch={handleLaunch}
              disabled={!connected || creating}
              pendingMode={pendingMode}
            />
            {!connected && <p className="home-note">Connecting…</p>}
            {createError && <p className="error home-error">{createError}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
