import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents
} from '@monopoly/shared';

const PLAYER_ID_KEY = 'monopoly_player_id';
const SESSION_KEY = 'monopoly_session_v1';

export interface PersistedSession {
  roomId: string;
  playerId: string;
  name: string;
}

// Storage is intentionally per-tab (sessionStorage): a tab reload restores
// the same seat, while a second tab gets its own identity so two players can
// share one browser/profile without colliding on the same seat.
function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return memStore[key] ?? null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    memStore[key] = value;
  }
}

function removeStorage(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    delete memStore[key];
  }
}

const memStore: Record<string, string> = {};

// Persistent (per-tab) playerId so a reload rejoins the same seat.
export function getOrCreatePlayerId(): string {
  const stored = readStorage(PLAYER_ID_KEY);
  if (stored) return stored;

  const pid = 'p_' + Math.random().toString(36).substring(2, 10);
  writeStorage(PLAYER_ID_KEY, pid);
  return pid;
}

export function saveSession(roomId: string, name: string): void {
  const session: PersistedSession = {
    roomId: roomId.toUpperCase(),
    playerId: getOrCreatePlayerId(),
    name
  };
  writeStorage(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = readStorage(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.roomId || !parsed.playerId) return null;
    return {
      roomId: parsed.roomId.toUpperCase(),
      playerId: parsed.playerId,
      name: parsed.name || ''
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  removeStorage(SESSION_KEY);
}

const playerId = getOrCreatePlayerId();

// Connect to root origin (works on localhost:5173 via proxy AND on tunneled HTTPS)
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('/', {
  query: { playerId },
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
