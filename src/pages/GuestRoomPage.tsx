import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ControllerUI from '../components/ControllerUI';
import ScreenControls from '../components/ScreenControls';
import { useRoomState, useSocket } from '../hooks/useSocket';
import { normalizeRoomCode } from '../../shared/routes';
import type { BalloonInput, CoinStickInput, RoomState, ScribbleStroke } from '../../shared/types';

function bootedKey(roomId: string) {
  return `booted-${roomId}`;
}

function playerIdKey(roomId: string) {
  return `playerId-${roomId}`;
}

function playerNameKey(roomId: string) {
  return `playerName-${roomId}`;
}

function savePlayerSession(roomId: string, id: string, name: string) {
  sessionStorage.setItem(playerIdKey(roomId), id);
  sessionStorage.setItem(playerNameKey(roomId), name);
}

function clearPlayerSession(roomId: string) {
  sessionStorage.removeItem(playerIdKey(roomId));
  sessionStorage.removeItem(playerNameKey(roomId));
}

export default function GuestRoomPage() {
  const navigate = useNavigate();
  const { code: codeParam } = useParams();
  const roomId = normalizeRoomCode(codeParam ?? '');

  const { socket, connected } = useSocket();
  const { state, setState } = useRoomState(socket, roomId);
  const [playerId, setPlayerId] = useState<string | null>(() =>
    roomId ? sessionStorage.getItem(playerIdKey(roomId)) : null,
  );
  const [playerName, setPlayerName] = useState<string | null>(() =>
    roomId ? sessionStorage.getItem(playerNameKey(roomId)) : null,
  );
  const [booted, setBooted] = useState(() =>
    roomId ? sessionStorage.getItem(bootedKey(roomId)) === '1' : false,
  );
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/', { replace: true });
    }
  }, [roomId, navigate]);

  useEffect(() => {
    const s = socket.current;
    if (!s || !roomId) return;

    const onKicked = () => {
      clearPlayerSession(roomId);
      sessionStorage.setItem(bootedKey(roomId), '1');
      setPlayerId(null);
      setPlayerName(null);
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
    const s = socket.current;
    if (!s || !roomId || !connected || booted) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const finishRejoin = (result: {
      ok: boolean;
      playerId?: string;
      state?: RoomState;
      error?: string;
    }) => {
      if (cancelled) return;
      if (result.ok) {
        setJoinError(null);
        if (result.playerId && result.state) {
          const me = result.state.players.find((p) => p.id === result.playerId);
          if (me) {
            savePlayerSession(roomId, result.playerId, me.name);
            setPlayerId(result.playerId);
            setPlayerName(me.name);
          }
        }
        if (result.state) setState(result.state);
        return;
      }

      if (result.error === 'Room not found' && attempts < 8) {
        attempts += 1;
        setJoinError('Reconnecting…');
        retryTimer = setTimeout(attemptSession, 500);
        return;
      }

      if (result.error === 'Player not found' && (playerId || playerName) && attempts < 8) {
        attempts += 1;
        setJoinError('Reconnecting…');
        retryTimer = setTimeout(attemptSession, 500);
        return;
      }

      if (result.error === 'Player not found') {
        clearPlayerSession(roomId);
        setPlayerId(null);
        setPlayerName(null);
      }

      setJoinError(result.error ?? 'Room not found');
    };

    const attemptSession = () => {
      if (playerId || playerName) {
        s.emit(
          'player:rejoin',
          { roomId, playerId: playerId ?? undefined, name: playerName ?? undefined },
          finishRejoin,
        );
        return;
      }

      s.emit('room:subscribe', { roomId }, (result: { ok: boolean; state?: RoomState; error?: string }) => {
        if (cancelled) return;
        if (result.ok && result.state) {
          setState(result.state);
          setJoinError(null);
          return;
        }
        if (result.error === 'Room not found' && attempts < 8) {
          attempts += 1;
          setJoinError('Reconnecting…');
          retryTimer = setTimeout(attemptSession, 500);
          return;
        }
        setJoinError(result.error ?? 'Room not found');
      });
    };

    attemptSession();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [socket, roomId, connected, booted, playerId, playerName, setState]);

  const onJoin = useCallback(
    (name: string) => {
      if (!socket.current || !roomId) return;
      socket.current.emit(
        'player:join',
        { roomId, name },
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
            savePlayerSession(roomId, result.playerId, name.trim());
            setPlayerId(result.playerId);
            setPlayerName(name.trim());
          }
          if (result.state) setState(result.state);
        },
      );
    },
    [roomId, socket, setState],
  );

  const onReady = () => socket.current?.emit('player:ready');
  const onJump = () => socket.current?.emit('player:jump');
  const onCoinInput = (input: CoinStickInput) => socket.current?.emit('player:coin-input', input);
  const onBalloonInput = (input: BalloonInput) => socket.current?.emit('player:balloon-input', input);
  const onScribblePrompt = (prompt: string) => socket.current?.emit('player:scribble-prompt', prompt);
  const onScribbleDraw = (strokes: ScribbleStroke[]) =>
    socket.current?.emit('player:scribble-draw', strokes);
  const onScribblePick = (artistId: string) =>
    socket.current?.emit('player:scribble-pick', artistId);
  const onLobbyReady = () => socket.current?.emit('game:lobby-ready');

  const leaveRoom = () => {
    clearPlayerSession(roomId);
    navigate('/');
  };

  if (!roomId) {
    return null;
  }

  return (
    <>
      {!booted && (
        <ScreenControls
          onBack={state?.sessionMode !== 'pc-host' ? leaveRoom : undefined}
        />
      )}
      <ControllerUI
        state={state}
        playerId={playerId}
        connected={connected}
        booted={booted}
        onJoin={onJoin}
        onReady={onReady}
        onJump={onJump}
        onCoinInput={onCoinInput}
        onBalloonInput={onBalloonInput}
        onScribblePrompt={onScribblePrompt}
        onScribbleDraw={onScribbleDraw}
        onScribblePick={onScribblePick}
        onLobbyReady={onLobbyReady}
        joinError={joinError}
        roomId={roomId}
        onLeave={leaveRoom}
      />
    </>
  );
}
