import { BOARD_TILES, COLOR_GROUPS } from './board.js';
import { GameState, PlayerState, PropertyState } from './types.js';

// Shared rule checks so the server enforces and the client explains the same
// thing. Each returns null when allowed, otherwise a human-readable reason.

export const LEVEL_LABELS = ['Land', 'House', 'Building', 'Hotel', 'Landmark'] as const;

/** Why `player` cannot upgrade `tileIndex` right now (null = allowed). */
export function buildBlockReason(state: GameState, player: PlayerState, tileIndex: number): string | null {
  const tile = BOARD_TILES[tileIndex];
  const prop = state.properties[tileIndex];
  if (!tile || !prop) return 'Invalid property';
  if (prop.ownerId !== player.playerId) return 'You do not own this property';
  if (tile.buildCost <= 0) return 'Railroads and utilities cannot be built on';
  if (player.position !== tileIndex) {
    return `You must stand on ${tile.name} to upgrade it. Build right after landing on your own property.`;
  }
  if (prop.isMortgaged) return 'Cannot build on a mortgaged property';
  if (prop.buildLevel >= 4) return `${tile.name} is already a Landmark`;
  if (prop.buildLevel === 0 && player.lapsCompleted < 1) {
    return 'Pass GO once before you start building houses';
  }
  if (prop.buildLevel === 3) {
    if (prop.forceBought) {
      return `Landmark locked. ${tile.name} was force-bought and cannot become a Landmark.`;
    }
    const group = COLOR_GROUPS[tile.group] ?? [tileIndex];
    const fullyBuilt = group.every((i) => {
      const p = state.properties[i];
      return p?.ownerId === player.playerId && p.buildLevel >= 3 && !p.isMortgaged;
    });
    if (!fullyBuilt) {
      return 'A Landmark needs the whole color set owned and built up to Hotels first';
    }
  }
  if (player.money < tile.buildCost) {
    return `Upgrade costs $${tile.buildCost}, you have $${player.money}`;
  }
  return null;
}

/** Why a property cannot be traded (null = tradeable). */
export function tradeBlockReason(prop: PropertyState | undefined, ownerId: string): string | null {
  if (!prop || prop.ownerId !== ownerId) return 'Property is not owned by that player';
  if (prop.buildLevel > 0) return `Sell the buildings on ${BOARD_TILES[prop.tileIndex].name} before trading it`;
  return null;
}

/** Cash a player could raise by selling every building and mortgaging all land. */
export function liquidationValue(state: GameState, playerId: string): number {
  return Object.values(state.properties).reduce((sum, p) => {
    if (p.ownerId !== playerId) return sum;
    const tile = BOARD_TILES[p.tileIndex];
    const buildings = Math.floor(tile.buildCost / 2) * p.buildLevel;
    const land = p.isMortgaged ? 0 : Math.floor(tile.price / 2);
    return sum + buildings + land;
  }, 0);
}
