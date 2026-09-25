import { create } from 'zustand';
import {
  GameState,
  RoomState,
  ChatMessage,
  BuyOffer,
  ForceBuyOffer,
  VictoryType,
  CardDraw
} from '@monopoly/shared';
import { socket, getOrCreatePlayerId } from '../net/socket.js';
import { audioManager } from '../sound/audioManager.js';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface ActivityEntry {
  id: string;
  text: string;
  type: ToastMessage['type'];
  timestamp: number;
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
  cardDraw: CardDraw | null;
  activity: ActivityEntry[];

  // Actions
  setRoomState: (room: RoomState) => void;
  setGameState: (game: GameState) => void;
  setDiceRoll: (dice: { d1: number; d2: number; doubles: boolean }) => void;
  setBuyOffer: (offer: BuyOffer | null) => void;
  setForceBuyOffer: (offer: ForceBuyOffer | null) => void;
  setCardDraw: (draw: CardDraw | null) => void;
  setIsWalking: (isWalking: boolean) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addToast: (text: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
  removeToast: (id: string) => void;
  setWinner: (winner: { winnerId: string; victoryType: VictoryType } | null) => void;
  pushActivity: (text: string, type?: ToastMessage['type']) => void;
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
  cardDraw: null,
  activity: [],

  setRoomState: (roomState) => set({ roomState }),
  setGameState: (gameState) =>
    set((s) => ({
      gameState,
      buyOffer: gameState.buyOffer,
      forceBuyOffer: gameState.forceBuyOffer,
      // Persist winner locally so a tab reload during GAME_OVER still shows
      // the victory overlay (the server only emits game:ended on transition).
      winner:
        gameState.phase === 'GAME_OVER' && gameState.winnerId && gameState.victoryType
          ? { winnerId: gameState.winnerId, victoryType: gameState.victoryType }
          : s.winner,
    })),
  setDiceRoll: (diceRoll) => set({ diceRoll }),
  setBuyOffer: (buyOffer) => set({ buyOffer }),
  setForceBuyOffer: (forceBuyOffer) => set({ forceBuyOffer }),
  setCardDraw: (cardDraw) => set({ cardDraw }),
  setIsWalking: (isWalking) => set({ isWalking }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages.slice(-50), msg] })),
  addToast: (text, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    // Keep the stack short so it never covers the board.
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setWinner: (winner) => set({ winner }),
  pushActivity: (text, type = 'info') =>
    set((s) => {
      // The server often sends the same line as a toast and as lastActionText.
      if (!text || s.activity.slice(-4).some((a) => a.text === text)) return s;
      const entry = { id: Math.random().toString(36).substring(2, 9), text, type, timestamp: Date.now() };
      return { activity: [...s.activity.slice(-99), entry] };
    }),
  resetAll: () =>
    set({
      roomState: null,
      gameState: null,
      diceRoll: null,
      forceBuyOffer: null,
      cardDraw: null,
      chatMessages: [],
      activity: [],
      winner: null,
    }),
}));

// Setup global socket event bindings into store (idempotent: safe under StrictMode)
let listenersInitialized = false;

export function initSocketListeners() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  socket.on('room:state', (room) => {
    useGameStore.getState().setRoomState(room);
  });

  socket.on('game:state', (game) => {
    const prev = useGameStore.getState();
    const prevGame = prev.gameState;
    const myId = prev.myPlayerId;
    prev.setGameState(game);
    if (game.lastActionText && game.lastActionText !== prevGame?.lastActionText) {
      prev.pushActivity(game.lastActionText);
    }

    // Transition sounds only for live updates, not the first sync after
    // (re)connect — otherwise a reload replays every sound at once.
    if (!prevGame) return;

    const wasMine = (pid: string | undefined) => pid === myId;

    // Buy / force-buy offers addressed to me
    if (!prevGame.buyOffer && game.buyOffer && wasMine(game.buyOffer.buyerPlayerId)) {
      audioManager.playModal();
    }
    if (!prevGame.forceBuyOffer && game.forceBuyOffer && wasMine(game.forceBuyOffer.buyerPlayerId)) {
      audioManager.playForceBuyAlarm();
    }

    // Debt entered and I am the debtor
    const cur = game.players[game.currentPlayerIndex];
    if (prevGame.phase !== 'DEBT' && game.phase === 'DEBT' && cur?.playerId === myId) {
      audioManager.playDebtAlarm();
    }

    // I went bankrupt
    const prevMe = prevGame.players.find((p) => p.playerId === myId);
    const nextMe = game.players.find((p) => p.playerId === myId);
    if (prevMe && !prevMe.isBankrupt && nextMe?.isBankrupt) {
      audioManager.playBankrupt();
    }

    // My buildings changed level (upgrade / sell)
    if (prevMe && nextMe) {
      for (const [idx, prop] of Object.entries(game.properties)) {
        if (prop.ownerId !== myId) continue;
        const before = prevGame.properties[Number(idx)]?.buildLevel ?? 0;
        if (prop.buildLevel > before) audioManager.playBuild();
        else if (prop.buildLevel < before) audioManager.playSell();
      }
    }
  });

  socket.on('game:dice', (dice) => {
    useGameStore.getState().setDiceRoll(dice);
  });

  socket.on('game:card', (draw) => {
    useGameStore.getState().setCardDraw(draw);
    audioManager.playCardDraw();
  });

  socket.on('game:forceBuyOffer', (offer) => {
    useGameStore.getState().setForceBuyOffer(offer);
  });

  socket.on('game:toast', ({ text, type }) => {
    useGameStore.getState().addToast(text, type);
    useGameStore.getState().pushActivity(text, type ?? 'info');
    // Debt entry already plays the debt alarm via the DEBT phase change,
    // and bankruptcy plays its own dirge via the state change — the toasts
    // for those arrive alongside, so skip them here to avoid stacking.
    const coveredByStateSound = /owes \$|cannot afford|cannot pay|bankrupt|game over/i.test(text);
    if (type === 'success') audioManager.playCoin();
    else if (type === 'danger' && !coveredByStateSound) audioManager.playError();
    else if (type === 'warning' && !coveredByStateSound) audioManager.playModal();
    else if (!type || type === 'info') audioManager.playTick();
  });

  socket.on('game:ended', (winner) => {
    useGameStore.getState().setWinner(winner);
    audioManager.playVictory();
  });

  socket.on('chat:message', (msg) => {
    const st = useGameStore.getState();
    st.addChatMessage(msg);
    // Skip the echo of my own messages.
    const mySeat = st.roomState?.seats.find((s) => s.playerId === st.myPlayerId);
    if (!mySeat || msg.senderName !== mySeat.displayName) {
      audioManager.playChat();
    }
  });

  socket.on('error', ({ message }) => {
    useGameStore.getState().addToast(message, 'danger');
    audioManager.playError();
  });
}
