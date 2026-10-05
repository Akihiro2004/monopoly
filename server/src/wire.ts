import { Server } from 'socket.io';
import { ClientToServerEvents, GameState, ServerToClientEvents } from '@monopoly/shared';
import { RoomManager } from './rooms.js';
import { BotDriver } from './bots/driver.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

/** Room + game broadcasts shared by all handlers. */
export function broadcastRoom(io: IO, roomManager: RoomManager, roomId: string): void {
  const room = roomManager.getRoom(roomId);
  if (room) io.to(room.roomId).emit('room:state', roomManager.toRoomState(room));
}

/** Connects a room's engine to its Socket.IO room (and to persistence). */
export function wireEngine(io: IO, roomManager: RoomManager, roomId: string): void {
  const room = roomManager.getRoom(roomId);
  if (!room || !room.engine) return;
  let wasOver = room.engine.state.phase === 'GAME_OVER';

  // Bot seats are played on the server by a driver that follows the game.
  room.bots?.dispose();
  room.bots = room.engine.state.players.some((p) => p.isBot) ? new BotDriver(room.engine) : undefined;

  room.engine.options.onStateChange = (state: GameState) => {
    io.to(roomId).emit('game:state', state);
    room.bots?.onState();
    roomManager.onGameChanged(roomId);
    if (state.phase === 'GAME_OVER' && !wasOver && state.winnerId && state.victoryType) {
      wasOver = true;
      io.to(roomId).emit('game:ended', { winnerId: state.winnerId, victoryType: state.victoryType });
      broadcastRoom(io, roomManager, roomId);
    }
  };
  room.engine.options.onToast = (toast) => {
    io.to(roomId).emit('game:toast', toast);
  };
  room.engine.options.onRandomEvent = (toast) => {
    io.to(roomId).emit('game:randomEvent', toast);
  };
  room.engine.options.onCard = (draw) => {
    io.to(roomId).emit('game:card', draw);
  };
  room.engine.options.onDice = (dice) => {
    io.to(roomId).emit('game:dice', dice);
  };
  room.bots?.onState();
}
