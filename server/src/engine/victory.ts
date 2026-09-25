import {
  BOARD_TILES,
  COLOR_GROUPS,
  SIDES_PURCHASABLE,
  GameState,
  VictoryType
} from '@monopoly/shared';

export interface VictoryResult {
  hasWinner: boolean;
  winnerId: string | null;
  victoryType: VictoryType | null;
  reason?: string;
}

/**
 * Checks all victory conditions for the game:
 * 1. Bankruptcy: only one non-bankrupt player remaining
 * 2. If specialVictory enabled (LINE Get Rich style):
 *    - Triple Victory: player owns all properties of any 3 distinct color groups
 *    - Line Victory: player owns all purchasable properties on any single side of the board
 */
export function checkVictory(gameState: GameState, specialVictoryEnabled: boolean): VictoryResult {
  const activePlayers = gameState.players.filter((p) => !p.isBankrupt);

  // 1. Bankruptcy elimination
  if (activePlayers.length === 1 && gameState.players.length > 1) {
    return {
      hasWinner: true,
      winnerId: activePlayers[0].playerId,
      victoryType: 'bankruptcy',
      reason: `${activePlayers[0].name} is the last remaining player!`
    };
  }

  if (activePlayers.length === 0) {
    return { hasWinner: false, winnerId: null, victoryType: null };
  }

  // 2. LINE Get Rich Special Victories
  if (specialVictoryEnabled) {
    for (const player of activePlayers) {
      // Check Triple Victory (owns all properties of 3 distinct color groups)
      let completedColorGroups = 0;
      for (const groupName of Object.keys(COLOR_GROUPS)) {
        const tileIndices = COLOR_GROUPS[groupName];
        const ownsAll = tileIndices.every((idx) => {
          const prop = gameState.properties[idx];
          return prop && prop.ownerId === player.playerId && !prop.isMortgaged;
        });
        if (ownsAll) {
          completedColorGroups++;
        }
      }

      if (completedColorGroups >= 3) {
        return {
          hasWinner: true,
          winnerId: player.playerId,
          victoryType: 'triple_victory',
          reason: `${player.name} achieved Triple Victory! Owned 3 complete color sets!`
        };
      }

      // Check Line Victory (owns all purchasable properties on any 1 side of the board)
      for (let sideIndex = 0; sideIndex < SIDES_PURCHASABLE.length; sideIndex++) {
        const sideTiles = SIDES_PURCHASABLE[sideIndex];
        const ownsWholeSide = sideTiles.every((idx) => {
          const prop = gameState.properties[idx];
          return prop && prop.ownerId === player.playerId && !prop.isMortgaged;
        });

        if (ownsWholeSide) {
          return {
            hasWinner: true,
            winnerId: player.playerId,
            victoryType: 'line_victory',
            reason: `${player.name} achieved Line Victory! Owned all properties on Side ${sideIndex + 1}!`
          };
        }
      }
    }
  }

  return { hasWinner: false, winnerId: null, victoryType: null };
}
