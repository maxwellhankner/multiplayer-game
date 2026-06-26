import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ControllerUI from '../components/ControllerUI';
import ScreenControls from '../components/ScreenControls';
import { useRoomState, useSocket } from '../hooks/useSocket';
import type { RoomState } from '../../shared/types';

function bootedKey(roomId: string) {
  return `booted-${roomId}`;
}

function playerIdKey(roomId: string) {
  return `playerId-${roomId}`;
}

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const roomId = (searchParams.get('room') ?? '').toUpperCase();
  const { socket, connected } = useSocket();
  const { state, setState } = useRoomState(socket, roomId);
  const [playerId, setPlayerId] = useState<string | null>(() =>
    roomId ? sessionStorage.getItem(playerIdKey(roomId)) : null,
  );
  const [booted, setBooted] = useState(() =>
    roomId ? sessionStorage.getItem(bootedKey(roomId)) === '1' : false,
  );
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setJoinError('No room code in URL. Scan the QR code on the host screen.');
    }
  }, [roomId]);

  useEffect(() => {
    const s = socket.current;
    if (!s || !roomId) return;

    const onKicked = () => {
      sessionStorage.removeItem(playerIdKey(roomId));
      sessionStorage.setItem(bootedKey(roomId), '1');
      setPlayerId(null);
      setState(null);
      setBooted(true);
      setJoinError(null);
    };

    s.on('player:kicked', onKicked);
    return () => {
      s.off('player:kicked', onKicked);
    };
  }, [socket, roomId, setState]);

  useEffect(() => {
    if (!state || !playerId || booted) return;
    const inRoom = state.players.some((p) => p.id === playerId);
    if (!inRoom) {
      sessionStorage.removeItem(playerIdKey(roomId));
      setPlayerId(null);
    }
  }, [state, playerId, roomId, booted]);

  const onJoin = useCallback(
    (name: string, color: string) => {
      if (!socket.current || !roomId) return;
      socket.current.emit(
        'player:join',
        { roomId, name, color },
        (result: {
          ok: boolean;
          playerId?: string;
          state?: RoomState;
          error?: string;
        }) => {
          if (!result.ok) {
            setJoinError(result.error ?? 'Failed to join');
            return;
          }
          setJoinError(null);
          sessionStorage.removeItem(bootedKey(roomId));
          setBooted(false);
          if (result.playerId) {
            setPlayerId(result.playerId);
            sessionStorage.setItem(playerIdKey(roomId), result.playerId);
          }
          if (result.state) setState(result.state);
        },
      );
    },
    [roomId, socket, setState],
  );

  useEffect(() => {
    if (!socket.current || !roomId || !connected || booted || playerId) return;

    socket.current.emit(
      'room:subscribe',
      { roomId },
      (result: { ok: boolean; state?: RoomState; error?: string }) => {
        if (result.ok && result.state) {
          setState(result.state);
          setJoinError(null);
        } else if (!result.ok) {
          setJoinError(result.error ?? 'Room not found');
        }
      },
    );
  }, [socket, roomId, connected, booted, playerId, setState]);

  const onReady = () => socket.current?.emit('player:ready');
  const onJump = () => socket.current?.emit('player:jump');
  const onRematchReady = () => socket.current?.emit('game:rematch-ready');

  if (!roomId) {
    return (
      <>
        <ScreenControls />
        <div className="controller">
          <h1>Hoe Down Derby</h1>
          <p className="error">Scan the QR code on the host screen to join a room.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {!booted && <ScreenControls />}
      <ControllerUI
        state={state}
        playerId={playerId}
        connected={connected}
        booted={booted}
        onJoin={onJoin}
        onReady={onReady}
        onJump={onJump}
        onRematchReady={onRematchReady}
        joinError={joinError}
        roomId={roomId}
      />
    </>
  );
}
