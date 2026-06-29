import { useEffect, useState } from 'react';
import GameCanvas from '../components/GameCanvas';
import Lobby from '../components/Lobby';
import ScreenControls from '../components/ScreenControls';
import WinnerScreen from '../components/WinnerScreen';
import { useNetworkInfo, useRoomState, useSocket } from '../hooks/useSocket';
import type { RoomState } from '../../shared/types';

export default function HostPage() {
  const { socket, connected } = useSocket();
  const networkInfo = useNetworkInfo();
  const { state, setState } = useRoomState(socket);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !socket.current) return;

    const sendTrackWidth = () => {
      socket.current?.emit('host:track-width', window.innerWidth);
    };

    const savedRoom = sessionStorage.getItem('hostRoomId');
    const tryCreate = () => {
      socket.current?.emit('host:create', (res: RoomState | { error: string }) => {
        if ('error' in res) {
          setError(res.error);
          return;
        }
        setState(res);
        sessionStorage.setItem('hostRoomId', res.id);
        sendTrackWidth();
      });
    };

    if (savedRoom) {
      socket.current.emit('host:rejoin', savedRoom, (res: RoomState | { error: string }) => {
        if ('error' in res) {
          sessionStorage.removeItem('hostRoomId');
          tryCreate();
          return;
        }
        setState(res);
        sendTrackWidth();
      });
    } else {
      tryCreate();
    }

    sendTrackWidth();
    window.addEventListener('resize', sendTrackWidth);
    return () => window.removeEventListener('resize', sendTrackWidth);
  }, [connected, socket, setState]);

  const handleReturnLobby = () => {
    socket.current?.emit('game:return-lobby');
  };

  const handleKick = (playerId: string) => {
    socket.current?.emit('host:kick', playerId);
  };

  if (!connected) {
    return (
      <>
        <ScreenControls />
        <div className="host-page loading">
          <p>Starting server connection…</p>
        </div>
      </>
    );
  }

  if (error || !state) {
    return (
      <>
        <ScreenControls onHome={handleReturnLobby} />
        <div className="host-page loading">
          <p>{error ?? 'Creating room…'}</p>
        </div>
      </>
    );
  }

  const showGame = state.phase === 'countdown' || state.phase === 'playing' || state.phase === 'winner';

  if (state.phase === 'lobby' && !networkInfo) {
    return (
      <>
        <ScreenControls onHome={handleReturnLobby} />
        <div className="host-page loading">
          <p>Preparing join link for phones…</p>
        </div>
      </>
    );
  }

  const joinUrl = networkInfo!.joinUrl;

  return (
    <>
      <ScreenControls onHome={handleReturnLobby} />
      <div className="host-page">
        {state.phase === 'lobby' && (
          <Lobby state={state} joinUrl={joinUrl} onKick={handleKick} />
        )}
        {showGame && (
          <div className="game-view">
            <GameCanvas state={state} />
            {state.phase === 'winner' && <WinnerScreen state={state} />}
          </div>
        )}
      </div>
    </>
  );
}
