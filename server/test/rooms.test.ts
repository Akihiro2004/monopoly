import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../src/rooms.js';

describe('RoomManager - Reconnection during active game', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it('allows an existing seated player to rejoin an active game with a new socket', () => {
    const room = manager.createRoom('socket-host', 'p-host', 'Host');
    const joinRes = manager.joinRoom(room.roomId, 'socket-p2', 'p2', 'Player 2');
    expect(joinRes.ok).toBe(true);

    manager.toggleReady(room.roomId, 'p2', true);
    const startRes = manager.startGame(room.roomId, 'p-host');
    expect(startRes.ok).toBe(true);
    expect(room.status).toBe('playing');
    expect(room.engine).toBeDefined();

    // Player 2 disconnects
    manager.handleDisconnect('socket-p2');
    const p2Seat = room.seats.find((s) => s.playerId === 'p2');
    expect(p2Seat?.isConnected).toBe(false);
    const engineP2 = room.engine?.state.players.find((p) => p.playerId === 'p2');
    expect(engineP2?.isConnected).toBe(false);
    expect(manager.getPlayerBySocket('socket-p2')).toBeUndefined();

    // Player 2 reconnects with new socket ID
    const rejoinRes = manager.joinRoom(room.roomId, 'socket-p2-new', 'p2', 'Player 2 Rejoined');
    expect(rejoinRes.ok).toBe(true);
    expect(rejoinRes.error).toBeUndefined();
    expect(p2Seat?.isConnected).toBe(true);
    expect(p2Seat?.displayName).toBe('Player 2 Rejoined');
    expect(manager.getPlayerBySocket('socket-p2-new')).toEqual({
      roomId: room.roomId,
      playerId: 'p2'
    });
    expect(engineP2?.isConnected).toBe(true);
  });

  it('rejects an unknown player attempting to join an active game', () => {
    const room = manager.createRoom('socket-host', 'p-host', 'Host');
    manager.joinRoom(room.roomId, 'socket-p2', 'p2', 'Player 2');
    manager.toggleReady(room.roomId, 'p2', true);
    manager.startGame(room.roomId, 'p-host');
    expect(room.status).toBe('playing');

    const strangerRes = manager.joinRoom(room.roomId, 'socket-stranger', 'p-stranger', 'Stranger');
    expect(strangerRes.ok).toBe(false);
    expect(strangerRes.error).toBe('Game already in progress');
  });
});
