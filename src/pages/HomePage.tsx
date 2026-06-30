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
  const [selectedMode, setSelectedMode] = useState<SessionMode | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canJoin = isValidRoomCode(roomInput);

  const handleStart = () => {
    if (!selectedMode || !socket.current || !connected || creating) return;
    setCreating(true);
    setCreateError(null);

    socket.current.emit(
      'host:create',
      { sessionMode: selectedMode },
      (res: RoomState | { error: string }) => {
        setCreating(false);
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
          <header className="home-hero">
            <h1 className="home-title">{PLATFORM_NAME}</h1>
            <p className="home-tagline">Host a lobby on this screen, or join with a room code.</p>
          </header>

          <form className="home-join" onSubmit={handleJoin}>
            <input
              id="room-code"
              type="text"
              className="text-input text-input--code"
              placeholder="ROOM CODE"
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
              className={`btn ${canJoin ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!canJoin}
            >
              Join
            </button>
          </form>

          <div className="home-divider" aria-hidden="true" />

          <div className="home-host">
            <SessionModePicker
              selected={selectedMode}
              onSelect={setSelectedMode}
              disabled={!connected || creating}
            />
            <button
              type="button"
              className={`btn ${selectedMode ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!selectedMode || !connected || creating}
              onClick={handleStart}
            >
              {creating ? 'Starting…' : 'Start'}
            </button>
            {createError && <p className="error home-error">{createError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
