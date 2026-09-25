import { TileDef } from './types.js';
import { BOARD_TILES_PART1 } from './boardData.js';

const BOARD_TILES_PART2: TileDef[] = [
  // Side 3 (Top): 20 - 29
  { index: 20, name: 'Free Parking', type: 'parking', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 21, name: 'Kentucky Ave', type: 'property', group: 'red', price: 220, rentByLevel: [18, 90, 250, 700, 1050], buildCost: 150 },
  { index: 22, name: 'Chance', type: 'chance', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 23, name: 'Indiana Ave', type: 'property', group: 'red', price: 220, rentByLevel: [18, 90, 250, 700, 1050], buildCost: 150 },
  { index: 24, name: 'Illinois Ave', type: 'property', group: 'red', price: 240, rentByLevel: [20, 100, 300, 750, 1100], buildCost: 150 },
  { index: 25, name: 'B. & O. Railroad', type: 'railroad', group: 'railroad', price: 200, rentByLevel: [25, 50, 100, 200, 200], buildCost: 0 },
  { index: 26, name: 'Atlantic Ave', type: 'property', group: 'yellow', price: 260, rentByLevel: [22, 110, 330, 800, 1150], buildCost: 150 },
  { index: 27, name: 'Ventnor Ave', type: 'property', group: 'yellow', price: 260, rentByLevel: [22, 110, 330, 800, 1150], buildCost: 150 },
  { index: 28, name: 'Water Works', type: 'utility', group: 'utility', price: 150, rentByLevel: [20, 40, 60, 80, 100], buildCost: 0 },
  { index: 29, name: 'Marvin Gardens', type: 'property', group: 'yellow', price: 280, rentByLevel: [24, 120, 360, 850, 1200], buildCost: 150 },
  // Side 4 (Right): 30 - 39
  { index: 30, name: 'Go To Jail', type: 'gotojail', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 31, name: 'Pacific Ave', type: 'property', group: 'green', price: 300, rentByLevel: [26, 130, 390, 900, 1275], buildCost: 200 },
  { index: 32, name: 'North Carolina', type: 'property', group: 'green', price: 300, rentByLevel: [26, 130, 390, 900, 1275], buildCost: 200 },
  { index: 33, name: 'Community Chest', type: 'chest', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 34, name: 'Pennsylvania Ave', type: 'property', group: 'green', price: 320, rentByLevel: [28, 150, 450, 1000, 1400], buildCost: 200 },
  { index: 35, name: 'Short Line RR', type: 'railroad', group: 'railroad', price: 200, rentByLevel: [25, 50, 100, 200, 200], buildCost: 0 },
  { index: 36, name: 'Chance', type: 'chance', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 37, name: 'Park Place', type: 'property', group: 'darkblue', price: 350, rentByLevel: [35, 175, 500, 1100, 1500], buildCost: 200 },
  { index: 38, name: 'Luxury Tax', type: 'tax', group: 'special', price: 0, rentByLevel: [100, 0, 0, 0, 0], buildCost: 0 },
  { index: 39, name: 'Boardwalk', type: 'property', group: 'darkblue', price: 400, rentByLevel: [50, 200, 600, 1400, 2000], buildCost: 200 }
];

export const BOARD_TILES: TileDef[] = [...BOARD_TILES_PART1, ...BOARD_TILES_PART2];

export const COLOR_GROUPS: Record<string, number[]> = {
  brown: [1, 3],
  lightblue: [6, 8, 9],
  pink: [11, 13, 14],
  orange: [16, 18, 19],
  red: [21, 23, 24],
  yellow: [26, 27, 29],
  green: [31, 32, 34],
  darkblue: [37, 39]
};

export const SIDES_PURCHASABLE: number[][] = [
  [1, 3, 5, 6, 8, 9],
  [11, 12, 13, 14, 15, 16, 18, 19],
  [21, 23, 24, 25, 26, 27, 28, 29],
  [31, 32, 34, 35, 37, 39]
];

export const STARTING_MONEY = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_TILE_INDEX = 10;
export const GO_TO_JAIL_TILE_INDEX = 30;
export const FORCE_BUY_TIMER_MS = 15000;
