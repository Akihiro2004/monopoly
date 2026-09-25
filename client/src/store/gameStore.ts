import { create } from 'zustand';
import {
  GameState,
  RoomState,
  ChatMessage,
  BuyOffer,
  ForceBuyOffer,
  VictoryType
} from '@monopoly/shared';
import { socket, getOrCreatePlayerId } from '../net/socket.js';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

interface GameStore {
  myPlayerId: string;
  roomState: RoomState | null;
  gameState: GameState | null;
  diceRoll: { d1: number; d2: number; doubles: boolean } | null;
  buyOffer: BuyOffer | null;
  forceBuyOffer: ForceBuyOffer | null;
  isWalking: boolean;
  chatMessages: ChatMessage[];
  toasts: ToastMessage[];
  winner: { winnerId: string; victoryType: VictoryType } | null;

  // Actions
  setRoomState: (room: RoomState) => void;
  setGameState: (game: GameState) => void;
  setDiceRoll: (dice: { d1: number; d2: number; doubles: boolean }) => void;
  setBuyOffer: (offer: BuyOffer | null) => void;
  setForceBuyOffer: (offer: ForceBuyOffer | null) => void;
  setIsWalking: (isWalking: boolean) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addToast: (text: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
  removeToast: (id: string) => void;
  setWinner: (winner: { winnerId: string; victoryType: VictoryType } | null) => void;
  resetAll: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  myPlayerId: getOrCreatePlayerId(),
  roomState: null,
  gameState: null,
  diceRoll: null,
  buyOffer: null,
  forceBuyOffer: null,
  isWalking: false,
  chatMessages: [],
  toasts: [],
  winner: null,

  setRoomState: (roomState) => set({ roomState }),
  setGameState: (gameState) =>
    set({
      gameState,
      buyOffer: gameState.buyOffer,
      forceBuyOffer: gameState.forceBuyOffer,
    }),
  setDiceRoll: (diceRoll) => set({ diceRoll }),
  setBuyOffer: (buyOffer) => set({ buyOffer }),
  setForceBuyOffer: (forceBuyOffer) => set({ forceBuyOffer }),
  setIsWalking: (isWalking) => set({ isWalking }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages.slice(-50), msg] })),
  addToast: (text, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, text, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setWinner: (winner) => set({ winner }),
  resetAll: () =>
    set({
      roomState: null,
      gameState: null,
      diceRoll: null,
      forceBuyOffer: null,
      chatMessages: [],
      winner: null,
    }),
}));

// Setup global socket event bindings into store
export function initSocketListeners() {
  const store = useGameStore.getState();

  socket.on('room:state', (room) => {
    useGameStore.getState().setRoomState(room);
  });

  socket.on('game:state', (game) => {
    useGameStore.getState().setGameState(game);
  });

  socket.on('game:dice', (dice) => {
    useGameStore.getState().setDiceRoll(dice);
  });

  socket.on('game:forceBuyOffer', (offer) => {
    useGameStore.getState().setForceBuyOffer(offer);
  });

  socket.on('game:toast', ({ text, type }) => {
    useGameStore.getState().addToast(text, type);
  });

  socket.on('game:ended', (winner) => {
    useGameStore.getState().setWinner(winner);
  });

  socket.on('chat:message', (msg) => {
    useGameStore.getState().addChatMessage(msg);
  });

  socket.on('error', ({ message }) => {
    useGameStore.getState().addToast(message, 'danger');
  });
}
