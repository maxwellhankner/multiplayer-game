import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GameHostRouter from '../games/GameHostRouter';
import Lobby from '../components/Lobby';
import { LocalControllerLobby, LocalPlayerOverlay } from '../components/LocalControllers';
import { equippedGun } from '../../shared/games/shooters-shoot/guns';
import LocalMatchMenu from '../components/LocalMatchMenu';
import RoomSounds from '../components/RoomSounds';
import ScreenControls from '../components/ScreenControls';
import { useNetworkInfo, useRoomState, useSocket } from '../hooks/useSocket';
import { useControllerMenu } from '../local/useControllerMenu';
import { useLocalControllers } from '../local/useLocalControllers';
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
  const [playersOpen, setPlayersOpen] = useState(false);
  const [matchMenuOpen, setMatchMenuOpen] = useState(false);
  const isLocal = state?.sessionMode === 'local-controllers';
  const inMatch =
    state?.phase === 'orient' ||
    state?.phase === 'countdown' ||
    state?.phase === 'playing' ||
    state?.phase === 'winner';
  const local = useLocalControllers({
    roomId: roomCode,
    enabled: isLocal,
    inputSuspended:
      !isLocal ||
      playersOpen ||
      matchMenuOpen ||
      state?.phase === 'lobby' ||
      state?.phase === 'winner' ||
      state?.phase === 'orient',
    joinEnabled: isLocal && (state?.phase === 'lobby' || playersOpen),
    activeGameId: state?.activeGameId ?? null,
    phase: state?.phase ?? 'lobby',
    takenNames: state?.players.map((player) => player.name) ?? [],
    shooterFire: Object.fromEntries(
      (state?.players ?? []).map((player) => {
        const gun = equippedGun(player);
        return [player.id, { auto: gun.auto, fireMs: gun.fireMs }];
      }),
    ),
  });
  const menuNavigating =
    isLocal &&
    (state?.phase === 'lobby' ||
      state?.phase === 'winner' ||
      state?.phase === 'orient' ||
      matchMenuOpen ||
      playersOpen);
  useControllerMenu({
    enabled: isLocal,
    navigate: menuNavigating,
    gamepadIndices: local.slots.flatMap((slot) => (slot.gamepadIndex == null ? [] : [slot.gamepadIndex])),
    onStart: () => {
      if (!inMatch) return;
      setPlayersOpen(false);
      setMatchMenuOpen((open) => !open);
    },
  });

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

  const handleStartBotsOnly = () => {
    socket.current?.emit('host:bot-start');
  };

  const handleRemoveBot = (botId: string) => {
    socket.current?.emit('host:bot-remove', botId);
  };

  useEffect(() => {
    if (state?.phase === 'lobby') {
      setPlayersOpen(false);
      setMatchMenuOpen(false);
    }
  }, [state?.phase]);

  useEffect(() => {
    if (!isLocal) return;
    const paused = (matchMenuOpen || playersOpen) && state?.phase !== 'lobby';
    socket.current?.emit('host:set-paused', paused);
    return () => {
      if (paused) socket.current?.emit('host:set-paused', false);
    };
  }, [isLocal, matchMenuOpen, playersOpen, socket, state?.phase]);

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

  const showGame = inMatch;

  if (state.phase === 'lobby' && !networkInfo && !isLocal) {
    return (
      <div className="platform-shell">
        <ScreenControls onHome={handleHome} />
        <div className="host-page loading">
          <p>Preparing guest link…</p>
        </div>
      </div>
    );
  }

  const roomUrlBase = networkInfo?.roomUrl ?? '';
  const gameTheme = showGame ? getGameThemeClass(state.activeGameId) : '';
  const wantsMouse =
    isLocal &&
    local.hasKeyboard &&
    (state.activeGameId === 'shots-fired' || state.activeGameId === 'shooters-shoot') &&
    (state.phase === 'countdown' || state.phase === 'playing') &&
    !playersOpen &&
    !matchMenuOpen &&
    !local.pointerLocked;

  return (
    <div
      className={showGame && gameTheme ? gameTheme : 'platform-shell'}
      data-controller-scope={isLocal ? 'page' : undefined}
    >
      <RoomSounds state={state} />
      <ScreenControls
        onHome={showGame ? handleHome : undefined}
        onPlayers={
          isLocal && showGame
            ? () => {
                setMatchMenuOpen(false);
                setPlayersOpen((open) => !open);
              }
            : undefined
        }
        playersOpen={playersOpen}
      />
      {state.phase === 'lobby' ? (
        <div className={`platform-page host-lobby-page${isLocal ? ' host-lobby-page--local' : ''}`}>
          {isLocal ? (
            <LocalControllerLobby
              state={state}
              slots={local.slots}
              unassignedPads={local.unassignedPads}
              notice={local.notice}
              onAddKeyboard={local.addKeyboard}
              onRemoveSlot={local.removeSlot}
              onStart={local.startMatch}
              onExit={() => navigate('/')}
              onUpdateSettings={handleSettingsChange}
              onAddBot={handleAddBot}
              onRemoveBot={handleRemoveBot}
              onStartBotsOnly={handleStartBotsOnly}
            />
          ) : (
            <Lobby
              state={state}
              roomUrlBase={roomUrlBase}
              onExit={() => navigate('/')}
              onKick={handleKick}
              onUpdateSettings={handleSettingsChange}
              onAddBot={handleAddBot}
              onRemoveBot={handleRemoveBot}
              onStartBotsOnly={handleStartBotsOnly}
            />
          )}
        </div>
      ) : (
        <div className="host-page">
          {showGame && <GameHostRouter state={state} />}
          {wantsMouse && (
            <button
              type="button"
              className="local-mouse-banner"
              onClick={() => document.body.requestPointerLock()}
            >
              Click to capture the mouse
            </button>
          )}
          {isLocal && matchMenuOpen && (
            <LocalMatchMenu
              players={state.players}
              showGuns={state.activeGameId === 'shooters-shoot'}
              onResume={() => setMatchMenuOpen(false)}
              onReset={() => {
                setMatchMenuOpen(false);
                socket.current?.emit('host:restart-match');
              }}
              onQuit={() => {
                setMatchMenuOpen(false);
                handleHome();
              }}
              onSetGun={(playerId, slot, gunId) => {
                socket.current?.emit('host:set-gun', { playerId, slot, gunId });
              }}
            />
          )}
          {isLocal && playersOpen && !matchMenuOpen && (
            <LocalPlayerOverlay
              state={state}
              slots={local.slots}
              unassignedPads={local.unassignedPads}
              notice={local.notice}
              onAddKeyboard={local.addKeyboard}
              onRemoveSlot={local.removeSlot}
              onClose={() => setPlayersOpen(false)}
              onBackToSetup={handleHome}
            />
          )}
        </div>
      )}
    </div>
  );
}
