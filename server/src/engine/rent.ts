import {
  BOARD_TILES,
  COLOR_GROUPS,
  GameState,
  PlayerState,
  PropertyState
} from '@monopoly/shared';

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
 * Transfers rent money, handles bankruptcy if player cannot pay
 */
export function payRent(
  gameState: GameState,
  tenant: PlayerState,
  landlord: PlayerState,
  amount: number
): { paid: number; bankrupt: boolean } {
  if (tenant.money >= amount) {
    tenant.money -= amount;
    landlord.money += amount;
    return { paid: amount, bankrupt: false };
  } else {
    // Bankrupt to landlord!
    const transferred = tenant.money;
    landlord.money += transferred;
    tenant.money = 0;
    tenant.isBankrupt = true;

    // Transfer all properties of tenant to landlord
    Object.values(gameState.properties).forEach((p) => {
      if (p.ownerId === tenant.playerId) {
        p.ownerId = landlord.playerId;
      }
    });

    return { paid: transferred, bankrupt: true };
  }
}
