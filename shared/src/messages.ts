import {
  RoomState,
  GameState,
  ChatMessage,
  TokenType,
  PlayerColor,
  VictoryType,
  ForceBuyOffer,
  CardDraw,
  TradeOffer
} from './types.js';

export type TradeProposal = Omit<TradeOffer, 'id' | 'fromId' | 'createdAt'>;

// Client -> Server events
export interface ClientToServerEvents {
  // Room/Lobby
  'room:create': (payload: { name: string }, callback: (res: { ok: boolean; roomId?: string; error?: string }) => void) => void;
  'room:join': (payload: { roomId: string; name: string }, callback: (res: { ok: boolean; error?: string }) => void) => void;
  'room:selectToken': (payload: { tokenType: TokenType; color: PlayerColor }) => void;
  'room:ready': (payload: { ready: boolean }) => void;
  'room:toggleSpecialVictory': (payload: { enabled: boolean }) => void;
  'room:start': () => void;
  'room:reconnect': (
    payload: { roomId: string; playerId: string; name?: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void;
  'room:leave': (callback?: (res: { ok: boolean; error?: string }) => void) => void;

  // In-Game
  'game:roll': () => void;
  'game:payJail': () => void;
  'game:useJailCard': () => void;
  'game:buyResponse': (payload: { accept: boolean }) => void;
  'game:forceBuyResponse': (payload: { accept: boolean }) => void;
  'game:build': (payload: { tileIndex: number }) => void;
  'game:sell': (payload: { tileIndex: number }) => void;
  'game:declareBankruptcy': () => void;
  'game:mortgage': (payload: { tileIndex: number; mortgage: boolean }) => void;
  'game:endTurn': () => void;
  'trade:propose': (payload: TradeProposal) => void;
  'trade:respond': (payload: { tradeId: string; accept: boolean }) => void;
  'trade:cancel': (payload: { tradeId: string }) => void;

  // Chat
  'chat:send': (payload: { text: string }) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'game:state': (state: GameState) => void;
  'game:dice': (payload: { d1: number; d2: number; doubles: boolean }) => void;
  'game:card': (draw: CardDraw) => void;
  'game:forceBuyOffer': (offer: ForceBuyOffer) => void;
  'game:toast': (payload: { text: string; type?: 'info' | 'success' | 'warning' | 'danger' }) => void;
  'game:ended': (payload: { winnerId: string; victoryType: VictoryType }) => void;
  'chat:message': (message: ChatMessage) => void;
  'error': (payload: { message: string }) => void;
}
