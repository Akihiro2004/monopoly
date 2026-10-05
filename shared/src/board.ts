import { BoardId, GameState, TileDef, TileGroup } from './types.js';
import { WORLD_TILES } from './worldBoard.js';
import { GRAND_TILES } from './grandBoard.js';

// A board is its tiles; everything else (color sets, sides, corners, airport
// and utility lists, card destinations) is derived from them, so the engine,
// the bots and the 3D board never assume a size.

export interface BoardDef {
  id: BoardId;
  name: string;
  tiles: TileDef[];
  size: number;
  // Tiles per side including its corner (10 or 14).
  perSide: number;
  // Color sets (countries), each a list of tile indices.
  groups: Record<string, number[]>;
  // Color sets in board order (cheapest first).
  groupOrder: TileGroup[];
  // Purchasable tiles per side (Line Victory).
  sides: number[][];
  railroads: number[];
  utilities: number[];
  tolls: number[];
  jail: number;
  goToJail: number;
  parking: number;
  startingMoney: number;
  goSalary: number;
  // The Bank's building supply.
  houses: number;
  hotels: number;
  // Taxes and fines pile up and are paid out on Free Parking.
  jackpot: boolean;
  // Card "advance to" targets: the classic tile index printed on the card
  // (New York, London, Beijing, Changi, GO) -> this board's tile.
  cardTargets: Record<number, number>;
}

interface BoardSpec {
  id: BoardId;
  name: string;
  tiles: TileDef[];
  startingMoney: number;
  goSalary: number;
  houses: number;
  hotels: number;
  jackpot: boolean;
}

const NON_SET_GROUPS = new Set<TileGroup>(['railroad', 'utility', 'toll', 'special']);

function defineBoard(spec: BoardSpec): BoardDef {
  const { tiles } = spec;
  tiles.forEach((t, i) => {
    if (t.index !== i) throw new Error(`${spec.id} board: tile ${i} has index ${t.index}`);
  });
  const size = tiles.length;
  if (size % 4 !== 0) throw new Error(`${spec.id} board: ${size} tiles is not 4 equal sides`);
  const perSide = size / 4;
  const of = (type: TileDef['type']) => tiles.filter((t) => t.type === type).map((t) => t.index);
  const one = (type: TileDef['type']) => {
    const found = of(type);
    if (found.length !== 1) throw new Error(`${spec.id} board: needs exactly one '${type}' tile`);
    return found[0];
  };

  const groups: Record<string, number[]> = {};
  const groupOrder: TileGroup[] = [];
  for (const t of tiles) {
    if (NON_SET_GROUPS.has(t.group)) continue;
    if (!groups[t.group]) {
      groups[t.group] = [];
      groupOrder.push(t.group);
    }
    groups[t.group].push(t.index);
  }
  const sides = [0, 1, 2, 3].map((s) =>
    tiles.filter((t) => t.price > 0 && Math.floor(t.index / perSide) === s).map((t) => t.index)
  );
  const cardTargets: Record<number, number> = {};
  for (const classic of [0, 5, 11, 24, 39]) {
    const name = WORLD_TILES[classic].name;
    const here = tiles.find((t) => t.name === name);
    if (!here) throw new Error(`${spec.id} board: card target ${name} is missing`);
    cardTargets[classic] = here.index;
  }

  return {
    ...spec,
    size,
    perSide,
    groups,
    groupOrder,
    sides,
    railroads: of('railroad'),
    utilities: of('utility'),
    tolls: of('toll'),
    jail: one('jail'),
    goToJail: one('gotojail'),
    parking: one('parking'),
    cardTargets
  };
}

export const WORLD_BOARD = defineBoard({
  id: 'world',
  name: 'World',
  tiles: WORLD_TILES,
  startingMoney: 1500,
  goSalary: 200,
  houses: 32,
  hotels: 12,
  jackpot: false
});

export const GRAND_BOARD = defineBoard({
  id: 'grand',
  name: 'Grand World',
  tiles: GRAND_TILES,
  startingMoney: 2000,
  goSalary: 200,
  houses: 48,
  hotels: 18,
  jackpot: true
});

export const BOARDS: Record<BoardId, BoardDef> = { world: WORLD_BOARD, grand: GRAND_BOARD };
export const BOARD_IDS: BoardId[] = ['world', 'grand'];

export function getBoard(id: BoardId | undefined | null): BoardDef {
  return (id && BOARDS[id]) || WORLD_BOARD;
}

/** The board a game is played on (games saved before boards existed: World). */
export function boardOf(state: Pick<GameState, 'boardId'> | null | undefined): BoardDef {
  return getBoard(state?.boardId);
}

/** Which side (0-3) a tile is on. */
export function sideOf(board: BoardDef, tileIndex: number): number {
  return Math.floor((((tileIndex % board.size) + board.size) % board.size) / board.perSide);
}

// World edition: every color set is one country, every board side one region.
export const COUNTRY_NAMES: Record<string, string> = {
  my: 'Malaysia',
  id: 'Indonesia',
  th: 'Thailand',
  cn: 'China',
  jp: 'Japan',
  kr: 'South Korea',
  gb: 'United Kingdom',
  fr: 'France',
  it: 'Italy',
  br: 'Brazil',
  ca: 'Canada',
  us: 'United States'
};

export const GROUP_COUNTRY: Record<string, string> = {
  brown: 'my',
  lightblue: 'id',
  teal: 'th',
  pink: 'cn',
  orange: 'jp',
  purple: 'kr',
  red: 'gb',
  yellow: 'fr',
  lime: 'it',
  green: 'br',
  crimson: 'ca',
  darkblue: 'us'
};

export const SIDE_NAMES = ['Southeast Asia', 'East Asia', 'Europe', 'Americas'];

export const GO_TILE_INDEX = 0;
export const JAIL_FINE = 50;
export const FORCE_BUY_TIMER_MS = 15000;

// Mortgages
// A mortgage the owner hasn't lifted after this many of their own laps gets
// foreclosed: the Bank seizes and auctions the deed.
export const FORECLOSURE_ROUNDS = 3;
// Voluntary mortgages per player per round (resets when they pass GO).
// Doesn't limit mortgaging forced by an active debt.
export const MAX_MORTGAGES_PER_ROUND = 1;

// Bank
export const AUCTION_MS = 15000; // opening countdown
export const AUCTION_EXTEND_MS = 6000; // every bid keeps at least this much time
export const AUCTION_MIN_INCREMENT = 10;
export const LEDGER_SIZE = 80;

// Lucky Draw (Grand World): usually a bonus from the Bank, sometimes a fee
// that goes into the jackpot.
export const LUCKY_DRAW_BONUS: [number, number] = [50, 200];
export const LUCKY_DRAW_FEE: [number, number] = [25, 100];
export const LUCKY_DRAW_FEE_CHANCE = 0.3;
