import {
  BOARD_TILES,
  COLOR_GROUPS,
  GameState,
  PlayerState,
  PropertyState,
  liquidationValue
} from '@monopoly/shared';
import { record, returnPieces } from './bank.js';

/**
 * Calculates rent for a given property:
 * - base rent * 2 if owner has entire color monopoly and buildLevel == 0
 * - or rentByLevel[buildLevel]
 * - railroad: 25 * 2^(count-1)
 * - utility: 4x or 10x dice roll
 */
export function calculateRent(
  gameState: GameState,
  tileIndex: number,
  diceTotal: number
): number {
  const tile = BOARD_TILES[tileIndex];
  const prop = gameState.properties[tileIndex];

  if (!tile || !prop || !prop.ownerId || prop.isMortgaged) {
    return 0;
  }

  // Railroad
  if (tile.type === 'railroad') {
    const railroads = [5, 15, 25, 35];
    const ownedRailroads = railroads.filter(
      (idx) => gameState.properties[idx]?.ownerId === prop.ownerId && !gameState.properties[idx]?.isMortgaged
    ).length;
    return 25 * Math.pow(2, Math.max(0, ownedRailroads - 1));
  }

  // Utility
  if (tile.type === 'utility') {
    const utilities = [12, 28];
    const ownedUtilities = utilities.filter(
      (idx) => gameState.properties[idx]?.ownerId === prop.ownerId && !gameState.properties[idx]?.isMortgaged
    ).length;
    const multiplier = ownedUtilities === 2 ? 10 : 4;
    return diceTotal * multiplier;
  }

  // Regular Property
  const level = prop.buildLevel;
  let rent = tile.rentByLevel[level] ?? tile.rentByLevel[0];

  // If level 0 and player owns entire color set, rent is doubled!
  if (level === 0 && tile.group && COLOR_GROUPS[tile.group]) {
    const groupIndices = COLOR_GROUPS[tile.group];
    const ownsAll = groupIndices.every((idx) => gameState.properties[idx]?.ownerId === prop.ownerId);
    if (ownsAll) {
      rent *= 2;
    }
  }

  return rent;
}

/**
 * Transfers rent money. If the tenant cannot afford it, no money moves and
 * the shortfall is returned as debt so the game can enter the DEBT phase
 * (sell buildings / mortgage to pay, or declare bankruptcy).
 */
export function payRent(
  gameState: GameState,
  tenant: PlayerState,
  landlord: PlayerState,
  amount: number,
  reason = 'Rent'
): { paid: number; bankrupt: boolean; debt?: number } {
  if (tenant.money >= amount) {
    tenant.money -= amount;
    landlord.money += amount;
    record(gameState, tenant.playerId, landlord.playerId, amount, reason);
    return { paid: amount, bankrupt: false };
  }
  return { paid: 0, bankrupt: false, debt: amount };
}

/**
 * Applies bankruptcy the "sell everything" way: every building and deed goes
 * back to the bank (unowned, unbuilt), and the creditor receives the owed
 * amount out of what that liquidation raised (cash + half the build cost of
 * each building + half the price of each unmortgaged deed). Nothing is handed
 * to an opponent directly. creditorId null means the debt is owed to the bank.
 */
export function applyBankruptcy(
  gameState: GameState,
  tenant: PlayerState,
  creditorId: string | null,
  debtAmount: number
): { raised: number; paid: number } {
  const raised = tenant.money + liquidationValue(gameState, tenant.playerId);
  const creditor = creditorId ? gameState.players.find((p) => p.playerId === creditorId) : null;
  const paid = creditor && !creditor.isBankrupt ? Math.min(debtAmount, raised) : 0;
  if (creditor) {
    creditor.money += paid;
    record(gameState, null, creditor.playerId, paid, `Bankruptcy payout from ${tenant.name}`);
  }

  tenant.money = 0;
  tenant.isBankrupt = true;
  tenant.jailCards = 0;

  Object.values(gameState.properties).forEach((p) => {
    if (p.ownerId === tenant.playerId) {
      returnPieces(gameState, p.buildLevel);
      p.ownerId = null;
      p.buildLevel = 0;
      p.isMortgaged = false;
      p.forceBought = false;
    }
  });

  gameState.trades = gameState.trades.filter(
    (t) => t.fromId !== tenant.playerId && t.toId !== tenant.playerId
  );

  return { raised, paid };
}
