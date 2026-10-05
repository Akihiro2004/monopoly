import {
  GameState,
  boardOf,
  PlayerColor,
  PlayerState,
  PropertyState,
  TileGroup
} from '@monopoly/shared';
import { currentBoard } from '../board.js';

// Player colors as display hex (the raw PlayerColor names are too saturated).
export const PLAYER_HEX: Record<PlayerColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f5b83d',
  purple: '#8b5cf6',
  orange: '#f97316'
};

export function playerHex(color: string | undefined): string {
  return PLAYER_HEX[color as PlayerColor] ?? '#94a3b8';
}

// Board color-group swatches for UI chips (tuned for dark surfaces).
export const GROUP_HEX: Record<TileGroup, string> = {
  brown: '#a0623a',
  lightblue: '#7dd3fc',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#facc15',
  green: '#22c55e',
  darkblue: '#3b63f6',
  teal: '#2dd4bf',
  purple: '#a78bfa',
  lime: '#a3e635',
  crimson: '#e11d48',
  railroad: '#94a3b8',
  utility: '#a3a3a3',
  toll: '#f59e0b',
  special: '#64748b'
};

export const GROUP_LABEL: Record<TileGroup, string> = {
  brown: 'Malaysia',
  lightblue: 'Indonesia',
  pink: 'China',
  orange: 'Japan',
  red: 'United Kingdom',
  yellow: 'France',
  green: 'Brazil',
  darkblue: 'United States',
  teal: 'Thailand',
  purple: 'South Korea',
  lime: 'Italy',
  crimson: 'Canada',
  railroad: 'Airports',
  utility: 'Utilities',
  toll: 'Toll gates',
  special: 'Special'
};

// Board order of every group on either board (each board shows its own).
export const GROUP_ORDER: TileGroup[] = [
  'brown',
  'lightblue',
  'teal',
  'pink',
  'orange',
  'purple',
  'red',
  'yellow',
  'lime',
  'green',
  'crimson',
  'darkblue',
  'railroad',
  'toll',
  'utility'
];

export const LEVEL_NAMES = ['Land', 'House', 'Building', 'Hotel', 'Landmark'] as const;

export const PHASE_LABEL: Record<GameState['phase'], string> = {
  ROLLING: 'Roll',
  MOVING: 'Moving',
  RESOLVING: 'Resolving',
  BUY_OFFER: 'Buying',
  FORCE_BUY_OFFER: 'Force buy',
  DEBT: 'Debt',
  AUCTION: 'Auction',
  TURN_ENDED: 'End turn',
  GAME_OVER: 'Game over'
};

export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US')}`;
}

export function ownedBy(game: GameState, playerId: string): PropertyState[] {
  return Object.values(game.properties).filter((p) => p.ownerId === playerId);
}

// Value of one property if liquidated at face value (land + buildings).
export function propertyValue(p: PropertyState): number {
  const tile = currentBoard().tiles[p.tileIndex];
  if (!tile) return 0;
  const land = p.isMortgaged ? Math.floor(tile.price / 2) : tile.price;
  return land + tile.buildCost * p.buildLevel;
}

export function netWorth(game: GameState, player: PlayerState): number {
  return ownedBy(game, player.playerId).reduce((sum, p) => sum + propertyValue(p), player.money);
}

// Number of complete color sets a player owns.
export function completeSets(game: GameState, playerId: string): number {
  return Object.values(boardOf(game).groups).filter((idxs) =>
    idxs.every((i) => game.properties[i]?.ownerId === playerId)
  ).length;
}

// Rent label mirroring server/src/engine/rent.ts.
export function rentLabel(game: GameState, p: PropertyState): string {
  const board = boardOf(game);
  const tile = board.tiles[p.tileIndex];
  if (!tile || !p.ownerId) return '';
  if (p.isMortgaged) return 'No rent';
  const ownsActive = (idx: number) =>
    game.properties[idx]?.ownerId === p.ownerId && !game.properties[idx]?.isMortgaged;
  if (tile.type === 'railroad') {
    const n = board.railroads.filter(ownsActive).length;
    return money(25 * Math.pow(2, Math.max(0, n - 1)));
  }
  if (tile.type === 'utility') {
    return board.utilities.filter(ownsActive).length >= 2 ? '10x dice' : '4x dice';
  }
  if (tile.type === 'toll') {
    const n = board.tolls.filter(ownsActive).length;
    const fees = tile.rentByLevel;
    return `${money(fees[Math.min(Math.max(n, 1), fees.length) - 1] || fees[0])} toll`;
  }
  let rent = tile.rentByLevel[p.buildLevel] ?? tile.rentByLevel[0];
  const group = board.groups[tile.group];
  if (p.buildLevel === 0 && group && group.every((i) => game.properties[i]?.ownerId === p.ownerId)) {
    rent *= 2;
  }
  return money(rent);
}

// Rows for a title deed card.
export function rentSchedule(tileIndex: number): { label: string; value: string }[] {
  const tile = currentBoard().tiles[tileIndex];
  if (!tile) return [];
  if (tile.type === 'toll') {
    return [
      { label: '1 gate owned', value: money(tile.rentByLevel[0]) },
      { label: 'Both gates owned', value: money(tile.rentByLevel[1]) },
      { label: 'Charged to', value: 'Passing + landing' }
    ];
  }
  if (tile.type === 'railroad') {
    return [1, 2, 3, 4].map((n) => ({
      label: n === 1 ? '1 airport owned' : `${n} airports owned`,
      value: money(25 * Math.pow(2, n - 1))
    }));
  }
  if (tile.type === 'utility') {
    return [
      { label: '1 utility owned', value: '4x dice' },
      { label: 'Both utilities owned', value: '10x dice' }
    ];
  }
  return [
    { label: 'Rent (land)', value: money(tile.rentByLevel[0]) },
    { label: 'With house', value: money(tile.rentByLevel[1]) },
    { label: 'With building', value: money(tile.rentByLevel[2]) },
    { label: 'With hotel', value: money(tile.rentByLevel[3]) },
    { label: 'With landmark', value: money(tile.rentByLevel[4]) }
  ];
}

// Identifies one auction (same tile can be auctioned again on a later turn).
export function auctionKey(game: GameState): string | null {
  return game.auction ? `${game.turnNumber}:${game.auction.tileIndex}` : null;
}
