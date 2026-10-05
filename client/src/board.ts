import { BoardDef, boardOf } from '@monopoly/shared';
import { useGameStore } from './store/gameStore.js';

// The board of the game on screen (World until a game says otherwise).
// Boards never change mid-game, so components can read it freely.

export function useBoard(): BoardDef {
  return useGameStore((s) => boardOf(s.rawGame));
}

/** Outside React (helpers, three.js loops). */
export function currentBoard(): BoardDef {
  return boardOf(useGameStore.getState().rawGame);
}
