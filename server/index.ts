import express from 'express';
import { exec } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import {
  addBot,
  addPlayer,
  canRoomAddBot,
  createRoom,
  createRoomWithId,
  getRoom,
  kickPlayer,
  prepareLobbyReturn,
  rejoinOrClaimPlayer,
  removeBot,
  returnToLobby,
  removePlayer,
  serializeRoom,
  setPlayerReady,
  setPlayerDrunkInput,
  setPlayerLandscapeReady,
  setPlayerBalloonInput,
  setPlayerCoinInput,
  setPlayerDrunkInput,
  setTrackWidth,
  submitScribbleDrawing,
  submitScribblePick,
  submitScribblePrompt,
  tickRoom,
  triggerJump,
  updateLobbySettings,
} from './game.js';
import {
  isDevRoomPersistEnabled,
  loadDevRooms,
  registerDevPersistShutdown,
  saveDevRoomsNow,
  scheduleDevRoomPersist,
} from './dev-persist.js';
import { getLocalIP, getLocalIPs } from './network.js';
import { guestRoomUrl } from '../shared/routes.js';
import { MAX_PLAYERS } from '../shared/constants.js';
import type { LobbySettings, SessionMode } from '../shared/platform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';
const devPersistEnabled = isDevRoomPersistEnabled(isProd);

function openBrowser(url: string): void {
  if (process.env.NO_OPEN === '1') return;

  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) console.log(`  Open in browser: ${url}`);
  });
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const socketRoom = new Map<string, string>();
const hostRooms = new Map<string, string>();

function isSocketConnected(socketId: string): boolean {
  return io.sockets.sockets.has(socketId);
}

function broadcastRoomState(room: NonNullable<ReturnType<typeof getRoom>>): void {
  io.to(room.id).emit('room:state', serializeRoom(room));
  if (devPersistEnabled) scheduleDevRoomPersist();
}

app.get('/api/network', (_req, res) => {
  const host = getLocalIP();
  const allHosts = getLocalIPs();
  res.json({
    host,
    port: PORT,
    roomUrl: guestRoomUrl(`http://${host}:${PORT}`, ''),
    allRoomUrls: allHosts.map((h) => guestRoomUrl(`http://${h}:${PORT}`, '')),
  });
});

io.on('connection', (socket) => {
  socket.on(
    'host:create',
    (
      data: { sessionMode?: SessionMode },
      cb: (state: ReturnType<typeof serializeRoom> | { error: string }) => void,
    ) => {
      const sessionMode = data?.sessionMode ?? 'pc-host';
      const room = createRoom(sessionMode);
      room.hostOnline = true;
      socketRoom.set(socket.id, room.id);
      hostRooms.set(room.id, socket.id);
      socket.join(room.id);
      if (devPersistEnabled) scheduleDevRoomPersist();
      cb(serializeRoom(room));
    },
  );

  socket.on('host:rejoin', (roomId: string, cb: (state: ReturnType<typeof serializeRoom> | { error: string }) => void) => {
    let room = getRoom(roomId);
    if (!room) {
      const created = createRoomWithId(roomId);
      if (!created) {
        cb({ error: 'Room not found' });
        return;
      }
      room = created;
      if (devPersistEnabled) scheduleDevRoomPersist();
    }
    room.hostOnline = true;
    socketRoom.set(socket.id, room.id);
    hostRooms.set(room.id, socket.id);
    socket.join(room.id);
    cb(serializeRoom(room));
    broadcastRoomState(room);
  });

  socket.on('host:lobby-settings', (settings: Partial<LobbySettings>) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    if (hostRooms.get(roomId) !== socket.id) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (updateLobbySettings(room, settings)) {
      broadcastRoomState(room);
    }
  });

  socket.on('host:track-width', (width: number) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    setTrackWidth(room, width);
  });

  socket.on('room:subscribe', (
    data: { roomId: string },
    cb: (result: { ok: boolean; state?: ReturnType<typeof serializeRoom>; error?: string }) => void,
  ) => {
    const room = getRoom(data.roomId);
    if (!room) {
      cb({ ok: false, error: 'Room not found' });
      return;
    }
    socket.join(room.id);
    cb({ ok: true, state: serializeRoom(room) });
  });

  socket.on(
    'player:join',
    (
      data: { roomId: string; name: string },
      cb: (result: { ok: boolean; playerId?: string; state?: ReturnType<typeof serializeRoom>; error?: string }) => void,
    ) => {
      const room = getRoom(data.roomId);
      if (!room) {
        cb({ ok: false, error: 'Room not found' });
        return;
      }
      if (room.phase !== 'lobby' && room.phase !== 'winner') {
        cb({ ok: false, error: 'Game already in progress' });
        return;
      }
      if (room.players.size >= MAX_PLAYERS) {
        cb({ ok: false, error: 'Room is full (8 players max)' });
        return;
      }

      const player = addPlayer(room, socket.id, data.name, isSocketConnected);
      if (!player) {
        cb({ ok: false, error: 'Name taken or invalid' });
        return;
      }

      socketRoom.set(socket.id, room.id);
      socket.join(room.id);
      broadcastRoomState(room);
      cb({ ok: true, playerId: socket.id, state: serializeRoom(room) });
    },
  );

  socket.on(
    'player:rejoin',
    (
      data: { roomId: string; playerId?: string; name?: string },
      cb: (result: { ok: boolean; playerId?: string; state?: ReturnType<typeof serializeRoom>; error?: string }) => void,
    ) => {
      const room = getRoom(data.roomId);
      if (!room) {
        cb({ ok: false, error: 'Room not found' });
        return;
      }

      const player = rejoinOrClaimPlayer(
        room,
        data.playerId,
        data.name,
        socket.id,
        isSocketConnected,
      );
      if (!player) {
        cb({ ok: false, error: 'Player not found' });
        return;
      }

      socketRoom.set(socket.id, room.id);
      socket.join(room.id);
      broadcastRoomState(room);
      cb({ ok: true, playerId: socket.id, state: serializeRoom(room) });
    },
  );

  socket.on('player:ready', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (setPlayerReady(room, socket.id)) {
      broadcastRoomState(room);
    }
  });

  socket.on('player:landscape-ready', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (setPlayerLandscapeReady(room, socket.id)) {
      broadcastRoomState(room);
    }
  });

  socket.on('player:jump', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (triggerJump(room, socket.id)) {
      broadcastRoomState(room);
    }
  });

  socket.on('player:coin-input', (payload: unknown) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (!payload || typeof payload !== 'object') return;
    const data = payload as Record<string, unknown>;
    const input = {
      moveX: Number(data.moveX),
      moveY: Number(data.moveY),
      lookX: Number(data.lookX),
      lookY: Number(data.lookY),
    };
    setPlayerCoinInput(room, socket.id, input);
  });

  socket.on('player:balloon-input', (payload: unknown) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (!payload || typeof payload !== 'object') return;
    const data = payload as Record<string, unknown>;
    setPlayerBalloonInput(room, socket.id, { moveX: Number(data.moveX) });
  });

  socket.on('player:drunk-input', (payload: unknown) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (!payload || typeof payload !== 'object') return;
    const data = payload as Record<string, unknown>;
    setPlayerDrunkInput(room, socket.id, {
      gas: Boolean(data.gas),
      steer: Number(data.steer),
    });
  });

  socket.on('player:scribble-prompt', (payload: unknown, cb?: (ok: boolean) => void) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    const text = typeof payload === 'string' ? payload : (payload as { prompt?: string })?.prompt;
    const ok = submitScribblePrompt(room, socket.id, text ?? '');
    if (ok) broadcastRoomState(room);
    cb?.(ok);
  });

  socket.on('player:scribble-draw', (payload: unknown, cb?: (ok: boolean) => void) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    const ok = submitScribbleDrawing(room, socket.id, payload);
    if (ok) broadcastRoomState(room);
    cb?.(ok);
  });

  socket.on('player:scribble-pick', (artistId: unknown, cb?: (ok: boolean) => void) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    const id = typeof artistId === 'string' ? artistId : '';
    const ok = submitScribblePick(room, socket.id, id);
    if (ok) broadcastRoomState(room);
    cb?.(ok);
  });

  socket.on('game:rematch-ready', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (prepareLobbyReturn(room, socket.id)) {
      broadcastRoomState(room);
    }
  });

  socket.on('game:lobby-ready', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (prepareLobbyReturn(room, socket.id)) {
      broadcastRoomState(room);
    }
  });

  socket.on('game:return-lobby', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (hostRooms.get(roomId) !== socket.id) return;
    if (returnToLobby(room)) {
      broadcastRoomState(room);
    }
  });

  socket.on('host:kick', (targetPlayerId: string) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    if (hostRooms.get(roomId) !== socket.id) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (!kickPlayer(room, targetPlayerId)) return;

    const targetSocket = io.sockets.sockets.get(targetPlayerId);
    if (targetSocket) {
      targetSocket.emit('player:kicked');
      targetSocket.leave(roomId);
      socketRoom.delete(targetPlayerId);
    }

    broadcastRoomState(room);
  });

  socket.on('host:bot-add', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    if (hostRooms.get(roomId) !== socket.id) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (!canRoomAddBot(room)) return;
    if (!addBot(room)) return;
    broadcastRoomState(room);
  });

  socket.on('host:bot-remove', (botId: string) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    if (hostRooms.get(roomId) !== socket.id) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (!removeBot(room, botId)) return;
    broadcastRoomState(room);
  });

  socket.on('disconnect', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;

    if (hostRooms.get(roomId) === socket.id) {
      hostRooms.delete(roomId);
      const room = getRoom(roomId);
      if (room) {
        room.hostOnline = false;
        broadcastRoomState(room);
      }
    } else {
      const room = getRoom(roomId);
      if (room) {
        removePlayer(room, socket.id);
        broadcastRoomState(room);
      }
    }

    socketRoom.delete(socket.id);
  });
});

const TICK_MS = 1000 / 30;

setInterval(() => {
  for (const roomId of new Set(socketRoom.values())) {
    const room = getRoom(roomId);
    if (!room) continue;
    if (room.phase === 'lobby') continue;

    const prevPhase = room.phase;
    tickRoom(room, TICK_MS);

    if (room.phase !== prevPhase || room.phase === 'playing' || room.phase === 'countdown' || room.phase === 'orient' || room.phase === 'winner' || room.activeGameId === 'scribble-time') {
      broadcastRoomState(room);
    }
  }
}, TICK_MS);

async function start() {
  if (devPersistEnabled) {
    registerDevPersistShutdown();
    const restored = loadDevRooms();
    if (restored > 0) {
      console.log(`  Dev: restored ${restored} room(s) from snapshot (lobby phase).`);
    }
    setInterval(() => saveDevRoomsNow(), 3000);
  }

  if (isProd) {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    const allIps = getLocalIPs();
    console.log('\n  Multiplayer Browser Games server running');
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${ip}:${PORT}`);
    if (allIps.length > 1) {
      console.log('  Also try:');
      for (const addr of allIps.slice(1)) {
        console.log(`           http://${addr}:${PORT}`);
      }
    }
    console.log('\n  Open the Local URL on this computer.');
    console.log('  Scan the QR code with your phone (same Wi-Fi).');
    if (devPersistEnabled) {
      console.log('  Dev: room snapshot enabled — tabs reconnect to the same lobby after restart.');
    }
    console.log('');

    if (!isProd && process.env.OPEN_BROWSER === '1') {
      openBrowser(`http://localhost:${PORT}/`);
    }
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
