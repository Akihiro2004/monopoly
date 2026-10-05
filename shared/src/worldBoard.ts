import { TileDef } from './types.js';

// The classic World board: 40 tiles, two countries per side.
export const WORLD_TILES: TileDef[] = [
  // Side 1 (Bottom): 0 - 9
  { index: 0, name: 'GO', type: 'go', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 1, name: 'Kuala Lumpur', type: 'property', group: 'brown', price: 60, rentByLevel: [2, 10, 30, 90, 250], buildCost: 50, country: 'my' },
  { index: 2, name: 'Community Chest', type: 'chest', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 3, name: 'Penang', type: 'property', group: 'brown', price: 60, rentByLevel: [4, 20, 60, 180, 450], buildCost: 50, country: 'my' },
  { index: 4, name: 'Income Tax', type: 'tax', group: 'special', price: 0, rentByLevel: [200, 0, 0, 0, 0], buildCost: 0 },
  { index: 5, name: 'Changi Airport', type: 'railroad', group: 'railroad', price: 200, rentByLevel: [25, 50, 100, 200, 200], buildCost: 0 },
  { index: 6, name: 'Jakarta', type: 'property', group: 'lightblue', price: 100, rentByLevel: [6, 30, 90, 270, 550], buildCost: 50, country: 'id' },
  { index: 7, name: 'Chance', type: 'chance', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 8, name: 'Bali', type: 'property', group: 'lightblue', price: 100, rentByLevel: [6, 30, 90, 270, 550], buildCost: 50, country: 'id' },
  { index: 9, name: 'Yogyakarta', type: 'property', group: 'lightblue', price: 120, rentByLevel: [8, 40, 100, 300, 600], buildCost: 50, country: 'id' },
  // Side 2 (Left): 10 - 19
  { index: 10, name: 'Jail / Visiting', type: 'jail', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 11, name: 'Beijing', type: 'property', group: 'pink', price: 140, rentByLevel: [10, 50, 150, 450, 750], buildCost: 100, country: 'cn' },
  { index: 12, name: 'Electric Company', type: 'utility', group: 'utility', price: 150, rentByLevel: [20, 40, 60, 80, 100], buildCost: 0 },
  { index: 13, name: 'Shanghai', type: 'property', group: 'pink', price: 140, rentByLevel: [10, 50, 150, 450, 750], buildCost: 100, country: 'cn' },
  { index: 14, name: 'Hong Kong', type: 'property', group: 'pink', price: 160, rentByLevel: [12, 60, 180, 500, 900], buildCost: 100, country: 'cn' },
  { index: 15, name: 'Haneda Airport', type: 'railroad', group: 'railroad', price: 200, rentByLevel: [25, 50, 100, 200, 200], buildCost: 0 },
  { index: 16, name: 'Osaka', type: 'property', group: 'orange', price: 180, rentByLevel: [14, 70, 200, 550, 950], buildCost: 100, country: 'jp' },
  { index: 17, name: 'Community Chest', type: 'chest', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 18, name: 'Kyoto', type: 'property', group: 'orange', price: 180, rentByLevel: [14, 70, 200, 550, 950], buildCost: 100, country: 'jp' },
  { index: 19, name: 'Tokyo', type: 'property', group: 'orange', price: 200, rentByLevel: [16, 80, 220, 600, 1000], buildCost: 100, country: 'jp' },
  // Side 3 (Top): 20 - 29
  { index: 20, name: 'Free Parking', type: 'parking', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 21, name: 'Manchester', type: 'property', group: 'red', price: 220, rentByLevel: [18, 90, 250, 700, 1050], buildCost: 150, country: 'gb' },
  { index: 22, name: 'Chance', type: 'chance', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 23, name: 'Edinburgh', type: 'property', group: 'red', price: 220, rentByLevel: [18, 90, 250, 700, 1050], buildCost: 150, country: 'gb' },
  { index: 24, name: 'London', type: 'property', group: 'red', price: 240, rentByLevel: [20, 100, 300, 750, 1100], buildCost: 150, country: 'gb' },
  { index: 25, name: 'Heathrow Airport', type: 'railroad', group: 'railroad', price: 200, rentByLevel: [25, 50, 100, 200, 200], buildCost: 0 },
  { index: 26, name: 'Nice', type: 'property', group: 'yellow', price: 260, rentByLevel: [22, 110, 330, 800, 1150], buildCost: 150, country: 'fr' },
  { index: 27, name: 'Lyon', type: 'property', group: 'yellow', price: 260, rentByLevel: [22, 110, 330, 800, 1150], buildCost: 150, country: 'fr' },
  { index: 28, name: 'Water Works', type: 'utility', group: 'utility', price: 150, rentByLevel: [20, 40, 60, 80, 100], buildCost: 0 },
  { index: 29, name: 'Paris', type: 'property', group: 'yellow', price: 280, rentByLevel: [24, 120, 360, 850, 1200], buildCost: 150, country: 'fr' },
  // Side 4 (Right): 30 - 39
  { index: 30, name: 'Go To Jail', type: 'gotojail', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 31, name: 'Salvador', type: 'property', group: 'green', price: 300, rentByLevel: [26, 130, 390, 900, 1275], buildCost: 200, country: 'br' },
  { index: 32, name: 'Sao Paulo', type: 'property', group: 'green', price: 300, rentByLevel: [26, 130, 390, 900, 1275], buildCost: 200, country: 'br' },
  { index: 33, name: 'Community Chest', type: 'chest', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 34, name: 'Rio de Janeiro', type: 'property', group: 'green', price: 320, rentByLevel: [28, 150, 450, 1000, 1400], buildCost: 200, country: 'br' },
  { index: 35, name: 'JFK Airport', type: 'railroad', group: 'railroad', price: 200, rentByLevel: [25, 50, 100, 200, 200], buildCost: 0 },
  { index: 36, name: 'Chance', type: 'chance', group: 'special', price: 0, rentByLevel: [0, 0, 0, 0, 0], buildCost: 0 },
  { index: 37, name: 'Los Angeles', type: 'property', group: 'darkblue', price: 350, rentByLevel: [35, 175, 500, 1100, 1500], buildCost: 200, country: 'us' },
  { index: 38, name: 'Luxury Tax', type: 'tax', group: 'special', price: 0, rentByLevel: [100, 0, 0, 0, 0], buildCost: 0 },
  { index: 39, name: 'New York', type: 'property', group: 'darkblue', price: 400, rentByLevel: [50, 200, 600, 1400, 2000], buildCost: 200, country: 'us' }
];
