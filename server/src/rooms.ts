import { nanoid } from 'nanoid';
import {
  PlayerColor,
  RoomSettings,
  RoomState,
  Seat,
  TokenType
} from '@monopoly/shared';
import { MonopolyGameEngine } from './engine/game.js';

const AVAILABLE_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const AVAILABLE_TOKENS: TokenType[] = ['car', 'hat', 'dog', 'ship', 'thimble', 'boot'];

export interface RoomSession {
  roomId: string;
  hostPlayerId: string;
  settings: RoomSettings;
  seats: Seat[];
  engine: MonopolyGameEngine | null;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export class RoomManager {
  private rooms = new Map<string, RoomSession>();
  private socketToPlayer = new Map<string, { roomId: string; playerId: string }>();

  public createRoom(
    hostSocketId: string,
    hostPlayerId: string,
    hostName: string
  ): RoomSession {
    const roomId = nanoid(6).toUpperCase();

    const hostSeat: Seat = {
      seatIndex: 0,
      playerId: hostPlayerId,
      displayName: hostName || 'Player 1',
      tokenType: AVAILABLE_TOKENS[0],
      color: AVAILABLE_COLORS[0],
      isReady: true,
      isConnected: true,
      isHost: true
    };

    const room: RoomSession = {
      roomId,
      hostPlayerId,
      settings: {
        maxPlayers: 6,
        specialVictory: true,
        turnTimeoutSec: 45
      },
      seats: [hostSeat],
      engine: null,
      status: 'waiting',
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.socketToPlayer.set(hostSocketId, { roomId, playerId: hostPlayerId });
    return room;
  }

  public joinRoom(
    roomId: string,
    socketId: string,
    playerId: string,
    name: string
  ): { ok: boolean; room?: RoomSession; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.status !== 'waiting') return { ok: false, error: 'Game already in progress' };
    if (room.seats.length >= room.settings.maxPlayers) return { ok: false, error: 'Room is full (max 6)' };

    const existing = room.seats.find((s) => s.playerId === playerId);
    if (existing) {
      existing.isConnected = true;
      existing.displayName = name || existing.displayName;
      this.socketToPlayer.set(socketId, { roomId: room.roomId, playerId });
      return { ok: true, room };
    }

    const seatIndex = room.seats.length;
    const usedColors = new Set(room.seats.map((s) => s.color));
    const usedTokens = new Set(room.seats.map((s) => s.tokenType));

    const color = AVAILABLE_COLORS.find((c) => !usedColors.has(c)) || AVAILABLE_COLORS[seatIndex % 6];
    const tokenType = AVAILABLE_TOKENS.find((t) => !usedTokens.has(t)) || AVAILABLE_TOKENS[seatIndex % 6];

    const seat: Seat = {
      seatIndex,
      playerId,
      displayName: name || `Player ${seatIndex + 1}`,
      tokenType,
      color,
      isReady: false,
      isConnected: true,
      isHost: false
    };

    room.seats.push(seat);
    this.socketToPlayer.set(socketId, { roomId: room.roomId, playerId });
    return { ok: true, room };
  }

  public getRoom(roomId: string): RoomSession | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public getPlayerBySocket(socketId: string): { roomId: string; playerId: string } | undefined {
    return this.socketToPlayer.get(socketId);
  }

  public selectToken(roomId: string, playerId: string, token: TokenType, color: PlayerColor): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return false;

    const seat = room.seats.find((s) => s.playerId === playerId);
    if (!seat) return false;

    const tokenTaken = room.seats.some((s) => s.playerId !== playerId && s.tokenType === token);
    const colorTaken = room.seats.some((s) => s.playerId !== playerId && s.color === color);

    if (!tokenTaken) seat.tokenType = token;
    if (!colorTaken) seat.color = color;
    return true;
  }

  public toggleReady(roomId: string, playerId: string, ready: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return false;

    const seat = room.seats.find((s) => s.playerId === playerId);
    if (!seat) return false;

    seat.isReady = ready;
    return true;
  }

  public toggleSpecialVictory(roomId: string, playerId: string, enabled: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return false;
    if (room.hostPlayerId !== playerId) return false;

    room.settings.specialVictory = enabled;
    return true;
  }

  public startGame(roomId: string, playerId: string): { ok: boolean; engine?: MonopolyGameEngine; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.hostPlayerId !== playerId) return { ok: false, error: 'Only the host can start the game' };
    if (room.seats.length < 2) return { ok: false, error: 'Need at least 2 players to start' };

    const unready = room.seats.filter((s) => !s.isReady && !s.isHost);
    if (unready.length > 0) {
      return { ok: false, error: 'All players must be ready to start' };
    }

    room.status = 'playing';
    room.engine = new MonopolyGameEngine(room.roomId, room.seats, {
      specialVictory: room.settings.specialVictory
    });

    return { ok: true, engine: room.engine };
  }

  public handleDisconnect(socketId: string): { room?: RoomSession; seat?: Seat } {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return {};

    this.socketToPlayer.delete(socketId);
    const room = this.rooms.get(info.roomId);
    if (!room) return {};

    const seat = room.seats.find((s) => s.playerId === info.playerId);
    if (seat) {
      seat.isConnected = false;
      if (room.engine) {
        const player = room.engine.state.players.find((p) => p.playerId === info.playerId);
        if (player) player.isConnected = false;
      }
    }

    return { room, seat };
  }

  public toRoomState(room: RoomSession): RoomState {
    return {
      roomId: room.roomId,
      hostPlayerId: room.hostPlayerId,
      status: room.status,
      settings: room.settings,
      seats: room.seats,
      winnerId: room.engine?.state.winnerId ?? null,
      victoryType: room.engine?.state.victoryType ?? null
    };
  }
}
