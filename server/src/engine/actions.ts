import {
  BOARD_TILES,
  COLOR_GROUPS,
  BuildLevel,
  GameState,
  PlayerState,
  PropertyState
} from '@monopoly/shared';

/**
 * Auto-buys an unowned purchasable property when player lands on it (LINE Get Rich style)
 * If player has enough money: buys instantly, returns success: true
 * If player lacks money: property remains unowned, no auction (LINE Get Rich style)
 */
export function executeAutoBuy(
  gameState: GameState,
  buyer: PlayerState,
  tileIndex: number
): { bought: boolean; text: string } {
  const tile = BOARD_TILES[tileIndex];
  const prop = gameState.properties[tileIndex];

  if (!tile || !prop) {
    return { bought: false, text: 'Invalid tile' };
  }

  if (tile.price <= 0 || prop.ownerId !== null) {
    return { bought: false, text: 'Tile cannot be purchased' };
  }

  if (buyer.money >= tile.price) {
    buyer.money -= tile.price;
    prop.ownerId = buyer.playerId;
    prop.buildLevel = 0;
    prop.isMortgaged = false;
    prop.forceBought = false; // bought cleanly from bank, can landmark

    const msg = `${buyer.name} auto-bought ${tile.name} for $${tile.price}.`;
    gameState.lastActionText = msg;
    return { bought: true, text: msg };
  } else {
    const msg = `${buyer.name} cannot afford ${tile.name} ($${tile.price}). It remains unowned.`;
    gameState.lastActionText = msg;
    return { bought: false, text: msg };
  }
}

/**
 * Builds / upgrades a property owned by the player:
 * Level 0 -> 1 (House)
 * Level 1 -> 2 (Building)
 * Level 2 -> 3 (Hotel)
 * Level 3 -> 4 (Landmark) - ONLY if forceBought is false!
 *
 * Rule: must own all properties in the color group to build (or at least 1? In LINE Get Rich you build on your own turn/landing).
 * In classic LINE Get Rich, you build upon landing or whenever you pass. Here player can build on their turn.
 */
export function buildProperty(
  gameState: GameState,
  player: PlayerState,
  tileIndex: number
): { success: boolean; text: string } {
  const tile = BOARD_TILES[tileIndex];
  const prop = gameState.properties[tileIndex];

  if (!tile || !prop) {
    return { success: false, text: 'Invalid property' };
  }

  if (prop.ownerId !== player.playerId) {
    return { success: false, text: 'You do not own this property' };
  }

  if (prop.isMortgaged) {
    return { success: false, text: 'Cannot build on mortgaged property' };
  }

  if (tile.buildCost <= 0) {
    return { success: false, text: 'This property cannot be built on (railroad/utility)' };
  }

  // Check landmark lock
  if (prop.buildLevel === 3 && prop.forceBought) {
    return {
      success: false,
      text: `Landmark locked. ${tile.name} was force-bought and cannot be upgraded to a Landmark.`
    };
  }

  if (prop.buildLevel >= 4) {
    return { success: false, text: `${tile.name} is already at max level (Landmark)` };
  }

  // Cost check
  if (player.money < tile.buildCost) {
    return {
      success: false,
      text: `Insufficient funds: upgrade costs $${tile.buildCost}, you have $${player.money}`
    };
  }

  player.money -= tile.buildCost;
  prop.buildLevel = (prop.buildLevel + 1) as BuildLevel;

  const levelNames = ['Land', 'House (Lv 1)', 'Building (Lv 2)', 'Hotel (Lv 3)', 'LANDMARK (Lv 4)'];
  const newLevelName = levelNames[prop.buildLevel];

  const msg = `${player.name} upgraded ${tile.name} to ${newLevelName} for $${tile.buildCost}.`;
  gameState.lastActionText = msg;
  return { success: true, text: msg };
}

/**
 * Mortgage / unmortgage property
 */
export function toggleMortgage(
  gameState: GameState,
  player: PlayerState,
  tileIndex: number,
  mortgage: boolean
): { success: boolean; text: string } {
  const tile = BOARD_TILES[tileIndex];
  const prop = gameState.properties[tileIndex];

  if (!tile || !prop || prop.ownerId !== player.playerId) {
    return { success: false, text: 'You do not own this property' };
  }

  if (mortgage) {
    if (prop.isMortgaged) {
      return { success: false, text: 'Property already mortgaged' };
    }
    if (prop.buildLevel > 0) {
      return { success: false, text: 'Must sell all buildings before mortgaging' };
    }
    const value = Math.floor(tile.price / 2);
    prop.isMortgaged = true;
    player.money += value;
    const msg = `${player.name} mortgaged ${tile.name} for $${value}.`;
    gameState.lastActionText = msg;
    return { success: true, text: msg };
  } else {
    if (!prop.isMortgaged) {
      return { success: false, text: 'Property is not mortgaged' };
    }
    const cost = Math.floor((tile.price / 2) * 1.1); // 10% interest
    if (player.money < cost) {
      return { success: false, text: `Need $${cost} to unmortgage ${tile.name}` };
    }
    player.money -= cost;
    prop.isMortgaged = false;
    const msg = `${player.name} unmortgaged ${tile.name} for $${cost}.`;
    gameState.lastActionText = msg;
    return { success: true, text: msg };
  }
}
