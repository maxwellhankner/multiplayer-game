import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GameHostRouter from '../games/GameHostRouter';
import Lobby from '../components/Lobby';
import ScreenControls from '../components/ScreenControls';
import { useNetworkInfo, useRoomState, useSocket } from '../hooks/useSocket';
import type { LobbySettings } from '../../shared/platform';
import { normalizeRoomCode } from '../../shared/routes';
import type { RoomState } from '../../shared/types';
import { getGameThemeClass } from '../games/registry';

export default function HostRoomPage() {
  const navigate = useNavigate();
  const { code: codeParam } = useParams();
  const roomCode = normalizeRoomCode(codeParam ?? '');

  const { socket, connected } = useSocket();
  const networkInfo = useNetworkInfo();
  const { state, setState } = useRoomState(socket, roomCode);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      navigate('/', { replace: true });
    }
  }, [roomCode, navigate]);

  useEffect(() => {
    if (!connected || !socket.current || !roomCode) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const sendTrackWidth = () => {
      socket.current?.emit('host:track-width', window.innerWidth);
    };

    const attemptRejoin = () => {
      setJoining(true);
      setError(null);
      socket.current!.emit('host:rejoin', roomCode, (res: RoomState | { error: string }) => {
        if (cancelled) return;
        if ('error' in res) {
          attempts += 1;
          if (attempts < 8) {
            retryTimer = setTimeout(attemptRejoin, 500);
            return;
          }
          setJoining(false);
          setError('Room not found');
          return;
        }
        setJoining(false);
        setError(null);
        setState(res);
        sendTrackWidth();
      });
    };

    attemptRejoin();
    window.addEventListener('resize', sendTrackWidth);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('resize', sendTrackWidth);
    };
  }, [connected, socket, roomCode, setState]);

  const handleHome = () => {
    if (state?.phase === 'lobby') {
      navigate('/');
      return;
    }
    socket.current?.emit('game:return-lobby');
  };

  const handleKick = (playerId: string) => {
    socket.current?.emit('host:kick', playerId);
  };

  const handleSettingsChange = (patch: Partial<LobbySettings>) => {
    socket.current?.emit('host:lobby-settings', patch);
  };

  const handleAddBot = () => {
    socket.current?.emit('host:bot-add');
  };

  const handleRemoveBot = (botId: string) => {
    socket.current?.emit('host:bot-remove', botId);
  };

  if (!roomCode) {
    return null;
  }

  if (!connected) {
    return (
      <div className="platform-shell">
        <ScreenControls onHome={() => navigate('/')} />
        <div className="host-page loading">
          <p>Reconnecting to room {roomCode}…</p>
        </div>
      </div>
    );
  }

  if (joining) {
    return (
      <div className="platform-shell">
        <ScreenControls onHome={() => navigate('/')} />
        <div className="host-page loading">
          <p>Connecting to room {roomCode}…</p>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="platform-shell">
        <ScreenControls onHome={() => navigate('/')} />
        <div className="host-page loading">
          <p>{error ?? 'Room not found'}</p>
          <button type="button" className="btn btn-secondary" style={{ marginTop: '1rem', maxWidth: 200 }} onClick={() => navigate('/')}>
            Back home
          </button>
        </div>
      </div>
    );
  }

  if (state.id !== roomCode) {
    navigate(`/host/${state.id}`, { replace: true });
    return null;
  }

  const showGame = state.phase === 'countdown' || state.phase === 'playing' || state.phase === 'winner';

  if (state.phase === 'lobby' && !networkInfo) {
    return (
      <div className="platform-shell">
        <ScreenControls onHome={handleHome} />
        <div className="host-page loading">
          <p>Preparing guest link…</p>
        </div>
      </div>
    );
  }

  const roomUrlBase = networkInfo!.roomUrl;
  const gameTheme = showGame ? getGameThemeClass(state.activeGameId) : '';

  return (
    <div className={showGame && gameTheme ? gameTheme : 'platform-shell'}>
      <ScreenControls onHome={showGame ? handleHome : undefined} />
      {state.phase === 'lobby' ? (
        <div className="platform-page host-lobby-page">
          <Lobby
            state={state}
            roomUrlBase={roomUrlBase}
            onExit={() => navigate('/')}
            onKick={handleKick}
            onUpdateSettings={handleSettingsChange}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
          />
        </div>
      ) : (
        <div className="host-page">{showGame && <GameHostRouter state={state} />}</div>
      )}
    </div>
  );
}
