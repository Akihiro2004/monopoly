import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameState,
  Seat,
  PlayerState
} from '@monopoly/shared';
import { RoomManager } from '../rooms.js';

export function registerLobbyHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
) {
  const broadcastRoom = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('room:state', roomManager.toRoomState(room));
    }
  };

  const attachEngine = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.engine) return;

    room.engine.options.onStateChange = (state: GameState) => {
      io.to(roomId).emit('game:state', state);
      if (state.phase === 'GAME_OVER' && state.winnerId && state.victoryType) {
        io.to(roomId).emit('game:ended', { winnerId: state.winnerId, victoryType: state.victoryType });
      }
    };

    room.engine.options.onToast = (toast: { text: string; type?: 'info' | 'success' | 'warning' | 'danger' }) => {
      io.to(roomId).emit('game:toast', toast);
    };
  };

  // Lobby
  socket.on('room:create', ({ name }, callback) => {
    const playerId = (socket.handshake.query.playerId as string) || socket.id;
    const room = roomManager.createRoom(socket.id, playerId, name);
    socket.join(room.roomId);
    callback({ ok: true, roomId: room.roomId });
    broadcastRoom(room.roomId);
  });

  socket.on('room:join', ({ roomId, name }, callback) => {
    const playerId = (socket.handshake.query.playerId as string) || socket.id;
    const result = roomManager.joinRoom(roomId, socket.id, playerId, name);
    if (!result.ok || !result.room) {
      return callback({ ok: false, error: result.error });
    }
    socket.join(result.room.roomId);
    callback({ ok: true });
    broadcastRoom(result.room.roomId);
  });

  socket.on('room:selectToken', ({ tokenType, color }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    if (roomManager.selectToken(info.roomId, info.playerId, tokenType, color)) {
      broadcastRoom(info.roomId);
    }
  });

  socket.on('room:ready', ({ ready }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    if (roomManager.toggleReady(info.roomId, info.playerId, ready)) {
      broadcastRoom(info.roomId);
    }
  });

  socket.on('room:toggleSpecialVictory', ({ enabled }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    if (roomManager.toggleSpecialVictory(info.roomId, info.playerId, enabled)) {
      broadcastRoom(info.roomId);
    }
  });

  socket.on('room:start', () => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const res = roomManager.startGame(info.roomId, info.playerId);
    if (!res.ok || !res.engine) {
      return socket.emit('error', { message: res.error || 'Failed to start game' });
    }

    attachEngine(info.roomId);
    broadcastRoom(info.roomId);
    io.to(info.roomId).emit('game:state', res.engine.state);
  });

  socket.on('room:reconnect', ({ roomId, playerId }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return callback({ ok: false, error: 'Room not found' });

    const seat = room.seats.find((s: Seat) => s.playerId === playerId);
    if (!seat) return callback({ ok: false, error: 'Player seat not found' });

    seat.isConnected = true;
    socket.join(roomId);
    callback({ ok: true });
    broadcastRoom(roomId);

    if (room.engine) {
      const p = room.engine.state.players.find((pl: PlayerState) => pl.playerId === playerId);
      if (p) p.isConnected = true;
      socket.emit('game:state', room.engine.state);
    }
  });
}

