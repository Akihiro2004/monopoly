import { TileDef } from './types.js';

export const BOARD_TILES_PART1: TileDef[] = [
  // Side 1 (Bottom): 0 - 9
  { index: 0, name: 'GO', type: 'go', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 1, name: 'Mediterranean Ave', type: 'property', group: 'brown', price: 60, rentByLevel: [2, 10, 30, 90, 250], buildCost: 50 },
  { index: 2, name: 'Community Chest', type: 'chest', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 3, name: 'Baltic Ave', type: 'property', group: 'brown', price: 60, rentByLevel: [4, 20, 60, 180, 450], buildCost: 50 },
  { index: 4, name: 'Income Tax', type: 'tax', group: 'special', price: 0, rentByLevel: [200, 0, 0, 0, 0], buildCost: 0 },
  { index: 5, name: 'Reading Railroad', type: 'railroad', group: 'railroad', price: 200, rentByLevel: [25, 50, 100, 200, 200], buildCost: 0 },
  { index: 6, name: 'Oriental Ave', type: 'property', group: 'lightblue', price: 100, rentByLevel: [6, 30, 90, 270, 550], buildCost: 50 },
  { index: 7, name: 'Chance', type: 'chance', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 8, name: 'Vermont Ave', type: 'property', group: 'lightblue', price: 100, rentByLevel: [6, 30, 90, 270, 550], buildCost: 50 },
  { index: 9, name: 'Connecticut Ave', type: 'property', group: 'lightblue', price: 120, rentByLevel: [8, 40, 100, 300, 600], buildCost: 50 },
  // Side 2 (Left): 10 - 19
  { index: 10, name: 'Jail / Visiting', type: 'jail', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 11, name: 'St. Charles Place', type: 'property', group: 'pink', price: 140, rentByLevel: [10, 50, 150, 450, 750], buildCost: 100 },
  { index: 12, name: 'Electric Company', type: 'utility', group: 'utility', price: 150, rentByLevel: [20, 40, 60, 80, 100], buildCost: 0 },
  { index: 13, name: 'States Ave', type: 'property', group: 'pink', price: 140, rentByLevel: [10, 50, 150, 450, 750], buildCost: 100 },
  { index: 14, name: 'Virginia Ave', type: 'property', group: 'pink', price: 160, rentByLevel: [12, 60, 180, 500, 900], buildCost: 100 },
  { index: 15, name: 'Pennsylvania RR', type: 'railroad', group: 'railroad', price: 200, rentByLevel: [25, 50, 100, 200, 200], buildCost: 0 },
  { index: 16, name: 'St. James Place', type: 'property', group: 'orange', price: 180, rentByLevel: [14, 70, 200, 550, 950], buildCost: 100 },
  { index: 17, name: 'Community Chest', type: 'chest', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 18, name: 'Tennessee Ave', type: 'property', group: 'orange', price: 180, rentByLevel: [14, 70, 200, 550, 950], buildCost: 100 },
  { index: 19, name: 'New York Ave', type: 'property', group: 'orange', price: 200, rentByLevel: [16, 80, 220, 600, 1000], buildCost: 100 }
];
