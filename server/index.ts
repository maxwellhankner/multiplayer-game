import express from 'express';
import { exec } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import {
  addPlayer,
  createRoom,
  getRoom,
  kickPlayer,
  prepareRematch,
  returnToLobby,
  removePlayer,
  serializeRoom,
  setPlayerReady,
  setTrackWidth,
  tickRoom,
  triggerJump,
} from './game.js';
import { getLocalIP, getLocalIPs } from './network.js';
import { GAMEPLAY, MAX_PLAYERS, isPlayerColor, isTestBotColor } from '../shared/constants.js';
import { TEST_MODE } from './bots.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';

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

app.get('/api/network', (_req, res) => {
  const host = getLocalIP();
  const allHosts = getLocalIPs();
  res.json({
    host,
    port: PORT,
    joinUrl: `http://${host}:${PORT}/join`,
    allHosts: allHosts.map((h) => `http://${h}:${PORT}/join`),
  });
});

io.on('connection', (socket) => {
  socket.on('host:create', (cb: (state: ReturnType<typeof serializeRoom> | { error: string }) => void) => {
    const room = createRoom();
    socketRoom.set(socket.id, room.id);
    hostRooms.set(room.id, socket.id);
    socket.join(room.id);
    cb(serializeRoom(room));
  });

  socket.on('host:rejoin', (roomId: string, cb: (state: ReturnType<typeof serializeRoom> | { error: string }) => void) => {
    const room = getRoom(roomId);
    if (!room) {
      cb({ error: 'Room not found' });
      return;
    }
    socketRoom.set(socket.id, room.id);
    hostRooms.set(room.id, socket.id);
    socket.join(room.id);
    cb(serializeRoom(room));
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
      data: { roomId: string; name: string; color: string },
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
      if (!isPlayerColor(data.color)) {
        cb({ ok: false, error: 'Pick a valid color' });
        return;
      }
      if (TEST_MODE && isTestBotColor(data.color)) {
        cb({ ok: false, error: 'That color is reserved for test players' });
        return;
      }
      if ([...room.players.values()].some((p) => p.color === data.color)) {
        cb({ ok: false, error: 'That color was just taken' });
        return;
      }

      const player = addPlayer(room, socket.id, data.name, data.color);
      if (!player) {
        cb({ ok: false, error: 'Name taken or invalid' });
        return;
      }

      socketRoom.set(socket.id, room.id);
      socket.join(room.id);
      io.to(room.id).emit('room:state', serializeRoom(room));
      cb({ ok: true, playerId: socket.id, state: serializeRoom(room) });
    },
  );

  socket.on('player:ready', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (setPlayerReady(room, socket.id)) {
      io.to(roomId).emit('room:state', serializeRoom(room));
    }
  });

  socket.on('player:jump', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (triggerJump(room, socket.id)) {
      io.to(roomId).emit('room:state', serializeRoom(room));
    }
  });

  socket.on('game:rematch-ready', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (prepareRematch(room, socket.id)) {
      io.to(roomId).emit('room:state', serializeRoom(room));
    }
  });

  socket.on('game:return-lobby', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (hostRooms.get(roomId) !== socket.id) return;
    if (returnToLobby(room)) {
      io.to(roomId).emit('room:state', serializeRoom(room));
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

    io.to(roomId).emit('room:state', serializeRoom(room));
  });

  socket.on('disconnect', () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;

    if (hostRooms.get(roomId) === socket.id) {
      hostRooms.delete(roomId);
    } else {
      const room = getRoom(roomId);
      if (room) {
        removePlayer(room, socket.id);
        io.to(roomId).emit('room:state', serializeRoom(room));
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

    if (room.phase !== prevPhase || room.phase === 'playing' || room.phase === 'countdown' || room.phase === 'winner') {
      io.to(roomId).emit('room:state', serializeRoom(room));
    }
  }
}, TICK_MS);

async function start() {
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
    console.log('\n  Hoe Down Derby server running');
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${ip}:${PORT}`);
    console.log(`  Jump:    ${GAMEPLAY.JUMP_HEIGHT_PX}px peak, ${GAMEPLAY.JUMP_DURATION_MS}ms airtime`);
    if (TEST_MODE) {
      console.log('  Test mode: 3 bot players (DICK, SALLY, TOM) — unset TEST_MODE for real multiplayer');
    }
    if (allIps.length > 1) {
      console.log('  Also try:');
      for (const addr of allIps.slice(1)) {
        console.log(`           http://${addr}:${PORT}`);
      }
    }
    console.log('\n  Open the Local URL on this computer.');
    console.log('  Scan the QR code with your phone (same Wi-Fi).\n');

    if (!isProd) {
      openBrowser(`http://localhost:${PORT}/`);
    }
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
