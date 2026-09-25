import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents
} from '@monopoly/shared';

// Persistent playerId in sessionStorage so refreshes rejoin the same seat
export function getOrCreatePlayerId(): string {
  let pid = sessionStorage.getItem('monopoly_player_id');
  if (!pid) {
    pid = 'p_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('monopoly_player_id', pid);
  }
  return pid;
}

const playerId = getOrCreatePlayerId();

// Connect to root origin (works on localhost:5173 via proxy AND on tunneled HTTPS)
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('/', {
  query: { playerId },
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
