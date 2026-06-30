import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  exportDevRoomSnapshots,
  importDevRoomSnapshots,
} from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(__dirname, '../.dev/rooms.json');

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let shuttingDown = false;

export function isDevRoomPersistEnabled(isProd: boolean): boolean {
  return !isProd && process.env.DEV_PERSIST_ROOMS !== '0';
}

export function loadDevRooms(): number {
  if (!fs.existsSync(SNAPSHOT_PATH)) return 0;

  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { rooms?: Parameters<typeof importDevRoomSnapshots>[0] };
    const rooms = parsed.rooms ?? [];
    importDevRoomSnapshots(rooms);
    return rooms.length;
  } catch (err) {
    console.warn('  Dev room snapshot could not be loaded:', err);
    return 0;
  }
}

export function saveDevRoomsNow(): void {
  const rooms = exportDevRoomSnapshots();
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify({ rooms, savedAt: Date.now() }, null, 2));
}

export function scheduleDevRoomPersist(): void {
  if (shuttingDown) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveDevRoomsNow();
  }, 400);
}

export function registerDevPersistShutdown(): void {
  const flush = () => {
    shuttingDown = true;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveDevRoomsNow();
  };

  process.on('SIGINT', () => {
    flush();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    flush();
    process.exit(0);
  });
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}
