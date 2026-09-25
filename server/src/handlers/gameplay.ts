import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessage
} from '@monopoly/shared';
import { RoomManager } from '../rooms.js';
import { MonopolyGameEngine } from '../engine/game.js';

export function registerGameHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
) {
  socket.on('game:roll', () => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    const cur = room.engine.getCurrentPlayer();
    if (cur.playerId !== info.playerId) {
      return socket.emit('error', { message: 'Not your turn!' });
    }

    try {
      const { d1, d2, doubles } = room.engine.rollDice();
      io.to(info.roomId).emit('game:dice', { d1, d2, doubles });
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:buyResponse', ({ accept }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    const offer = room.engine.state.buyOffer;
    if (!offer || offer.buyerPlayerId !== info.playerId) {
      return socket.emit('error', { message: 'Not authorized for this buy offer' });
    }

    try {
      room.engine.respondToBuyOffer(accept);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:forceBuyResponse', ({ accept }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    const offer = room.engine.state.forceBuyOffer;
    if (!offer || offer.buyerPlayerId !== info.playerId) {
      return socket.emit('error', { message: 'Not authorized for this force-buy offer' });
    }

    try {
      room.engine.respondToForceBuy(accept);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:build', ({ tileIndex }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    const cur = room.engine.getCurrentPlayer();
    if (cur.playerId !== info.playerId) {
      return socket.emit('error', { message: 'Can only build on your turn' });
    }

    try {
      room.engine.build(tileIndex);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:sell', ({ tileIndex }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    const cur = room.engine.getCurrentPlayer();
    if (cur.playerId !== info.playerId) {
      return socket.emit('error', { message: 'Can only sell on your turn' });
    }

    try {
      room.engine.sell(tileIndex);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:declareBankruptcy', () => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    const cur = room.engine.getCurrentPlayer();
    if (cur.playerId !== info.playerId) {
      return socket.emit('error', { message: 'Not your turn!' });
    }

    try {
      room.engine.declareBankruptcy();
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:mortgage', ({ tileIndex, mortgage }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    try {
      room.engine.mortgage(tileIndex, mortgage);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:payJail', () => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    try {
      room.engine.payJailFine();
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:useJailCard', () => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    try {
      room.engine.useJailCard();
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('game:endTurn', () => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;

    const cur = room.engine.getCurrentPlayer();
    if (cur.playerId !== info.playerId) {
      return socket.emit('error', { message: 'Not your turn!' });
    }

    try {
      room.engine.endTurn();
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  });

  const withEngine = (fn: (engine: MonopolyGameEngine, playerId: string) => void) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room || !room.engine) return;
    try {
      fn(room.engine, info.playerId);
    } catch (e: any) {
      socket.emit('error', { message: e.message });
    }
  };

  socket.on('trade:propose', (proposal) => {
    withEngine((engine, playerId) => engine.proposeTrade(playerId, proposal));
  });

  socket.on('trade:respond', ({ tradeId, accept }) => {
    withEngine((engine, playerId) => engine.respondToTrade(tradeId, playerId, accept));
  });

  socket.on('trade:cancel', ({ tradeId }) => {
    withEngine((engine, playerId) => engine.cancelTrade(tradeId, playerId));
  });

  socket.on('chat:send', ({ text }) => {
    const info = roomManager.getPlayerBySocket(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomId);
    if (!room) return;

    const seat = room.seats.find((s) => s.playerId === info.playerId);
    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2, 9),
      senderName: seat ? seat.displayName : 'Unknown',
      senderColor: seat ? seat.color : 'red',
      text,
      timestamp: Date.now()
    };
    io.to(info.roomId).emit('chat:message', msg);
  });
}
