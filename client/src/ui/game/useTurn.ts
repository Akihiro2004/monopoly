import { BOARD_TILES, GameState, PlayerState, PropertyState, TileDef } from '@monopoly/shared';
import { useGameStore } from '../../store/gameStore.js';

export interface UpgradeOption {
  prop: PropertyState;
  tile: TileDef;
  nextLevel: number;
  cost: number;
  affordable: boolean;
}

export interface TurnInfo {
  game: GameState;
  me: PlayerState | undefined;
  current: PlayerState;
  isMyTurn: boolean;
  isWalking: boolean;
  d1: number;
  d2: number;
  // Roll / end turn / upgrade allowed right now.
  canAct: boolean;
  // Sell / mortgage allowed right now (also during my debt).
  canManage: boolean;
  upgrade: UpgradeOption | null;
}

// The server only allows upgrading the tile you stand on (LINE Get Rich rule).
export function upgradeOptionFor(game: GameState, me: PlayerState | undefined): UpgradeOption | null {
  if (!me) return null;
  const prop = game.properties[me.position];
  const tile = BOARD_TILES[me.position];
  if (!prop || !tile || prop.ownerId !== me.playerId) return null;
  if (prop.isMortgaged || tile.buildCost <= 0 || prop.buildLevel >= 4) return null;
  if (prop.buildLevel === 3 && prop.forceBought) return null;
  return {
    prop,
    tile,
    nextLevel: prop.buildLevel + 1,
    cost: tile.buildCost,
    affordable: me.money >= tile.buildCost
  };
}

export function useTurn(): TurnInfo | null {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isWalking = useGameStore((s) => s.isWalking);
  const diceRoll = useGameStore((s) => s.diceRoll);

  if (!game) return null;
  const current = game.players[game.currentPlayerIndex];
  if (!current) return null;
  const me = game.players.find((p) => p.playerId === myPlayerId);
  const isMyTurn = current.playerId === myPlayerId;
  const canAct = isMyTurn && !isWalking && (game.phase === 'ROLLING' || game.phase === 'TURN_ENDED');
  const canManage = isMyTurn && (game.phase === 'ROLLING' || game.phase === 'TURN_ENDED' || game.phase === 'DEBT');

  return {
    game,
    me,
    current,
    isMyTurn,
    isWalking,
    d1: diceRoll?.d1 ?? game.dice?.[0] ?? 1,
    d2: diceRoll?.d2 ?? game.dice?.[1] ?? 1,
    canAct,
    canManage,
    upgrade: canAct ? upgradeOptionFor(game, me) : null
  };
}
