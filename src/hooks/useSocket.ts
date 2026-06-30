import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NetworkInfo, RoomState } from '../../shared/types';

const SOCKET_URL = undefined;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef, connected };
}

export function useNetworkInfo() {
  const [info, setInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    fetch('/api/network')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {
        setInfo({
          host: window.location.hostname,
          port: Number(window.location.port) || 3001,
          roomUrl: `${window.location.origin}/room`,
          allRoomUrls: [],
        });
      });
  }, []);

  return info;
}

export function useRoomState(socketRef: React.RefObject<Socket | null>, roomId?: string) {
  const [state, setState] = useState<RoomState | null>(null);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onState = (s: RoomState) => setState(s);
    socket.on('room:state', onState);

    return () => {
      socket.off('room:state', onState);
    };
  }, [socketRef, roomId]);

  return { state, setState };
}
