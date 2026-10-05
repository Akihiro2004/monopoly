import { TileDef, TileGroup } from './types.js';

// The Grand World board: 56 tiles, 14 per side (corner + 13). Every side is
// one region with three countries (8 cities), one airport, one facility (a
// toll gate or a utility) and three specials. Built for 5-6 players: more
// cities to go around, and a longer lap.

type Rents = [number, number, number, number, number];

const city = (index: number, name: string, group: TileGroup, country: string, price: number, rentByLevel: Rents, buildCost: number): TileDef => ({
  index,
  name,
  type: 'property',
  group,
  price,
  rentByLevel,
  buildCost,
  country
});

const special = (index: number, name: string, type: TileDef['type'], amount = 0): TileDef => ({
  index,
  name,
  type,
  group: 'special',
  price: 0,
  rentByLevel: [amount, 0, 0, 0, 0],
  buildCost: 0
});

const airport = (index: number, name: string): TileDef => ({
  index,
  name,
  type: 'railroad',
  group: 'railroad',
  price: 200,
  rentByLevel: [25, 50, 100, 200, 200],
  buildCost: 0
});

const utility = (index: number, name: string): TileDef => ({
  index,
  name,
  type: 'utility',
  group: 'utility',
  price: 150,
  rentByLevel: [20, 40, 60, 80, 100],
  buildCost: 0
});

// Toll gate: rentByLevel[n - 1] is the toll when the owner holds n gates.
const toll = (index: number, name: string): TileDef => ({
  index,
  name,
  type: 'toll',
  group: 'toll',
  price: 160,
  rentByLevel: [25, 60, 0, 0, 0],
  buildCost: 0
});

export const GRAND_TILES: TileDef[] = [
  // Side 1 (Southeast Asia): 0 - 13
  special(0, 'GO', 'go'),
  city(1, 'Kuala Lumpur', 'brown', 'my', 60, [2, 10, 30, 90, 250], 50),
  special(2, 'Community Chest', 'chest'),
  city(3, 'Penang', 'brown', 'my', 60, [4, 20, 60, 180, 450], 50),
  special(4, 'Income Tax', 'tax', 200),
  city(5, 'Jakarta', 'lightblue', 'id', 100, [6, 30, 90, 270, 550], 50),
  city(6, 'Bali', 'lightblue', 'id', 100, [6, 30, 90, 270, 550], 50),
  special(7, 'Chance', 'chance'),
  city(8, 'Yogyakarta', 'lightblue', 'id', 120, [8, 40, 100, 300, 600], 50),
  airport(9, 'Changi Airport'),
  city(10, 'Bangkok', 'teal', 'th', 140, [10, 50, 150, 450, 750], 50),
  toll(11, 'Causeway Toll'),
  city(12, 'Phuket', 'teal', 'th', 140, [10, 50, 150, 450, 750], 50),
  city(13, 'Chiang Mai', 'teal', 'th', 160, [12, 60, 180, 500, 900], 50),

  // Side 2 (East Asia): 14 - 27
  special(14, 'Jail / Visiting', 'jail'),
  city(15, 'Beijing', 'pink', 'cn', 180, [14, 70, 200, 550, 950], 100),
  special(16, 'Lucky Draw', 'bonus'),
  city(17, 'Shanghai', 'pink', 'cn', 180, [14, 70, 200, 550, 950], 100),
  city(18, 'Hong Kong', 'pink', 'cn', 200, [16, 80, 220, 600, 1000], 100),
  utility(19, 'Electric Company'),
  city(20, 'Osaka', 'orange', 'jp', 220, [18, 90, 250, 700, 1050], 100),
  special(21, 'Community Chest', 'chest'),
  city(22, 'Kyoto', 'orange', 'jp', 220, [18, 90, 250, 700, 1050], 100),
  airport(23, 'Haneda Airport'),
  city(24, 'Tokyo', 'orange', 'jp', 240, [20, 100, 300, 750, 1100], 100),
  city(25, 'Busan', 'purple', 'kr', 260, [22, 110, 330, 800, 1150], 100),
  special(26, 'Chance', 'chance'),
  city(27, 'Seoul', 'purple', 'kr', 280, [24, 120, 360, 850, 1200], 100),

  // Side 3 (Europe): 28 - 41
  special(28, 'Free Parking', 'parking'),
  city(29, 'Manchester', 'red', 'gb', 300, [26, 130, 390, 900, 1275], 150),
  special(30, 'Chance', 'chance'),
  city(31, 'Edinburgh', 'red', 'gb', 300, [26, 130, 390, 900, 1275], 150),
  city(32, 'London', 'red', 'gb', 320, [28, 150, 450, 1000, 1400], 150),
  airport(33, 'Heathrow Airport'),
  city(34, 'Nice', 'yellow', 'fr', 340, [32, 160, 480, 1050, 1450], 150),
  city(35, 'Lyon', 'yellow', 'fr', 340, [32, 160, 480, 1050, 1450], 150),
  toll(36, 'Channel Toll'),
  city(37, 'Paris', 'yellow', 'fr', 360, [36, 170, 500, 1100, 1500], 150),
  special(38, 'Lucky Draw', 'bonus'),
  city(39, 'Milan', 'lime', 'it', 380, [40, 185, 550, 1250, 1750], 150),
  special(40, 'Community Chest', 'chest'),
  city(41, 'Rome', 'lime', 'it', 400, [50, 200, 600, 1400, 2000], 150),

  // Side 4 (Americas): 42 - 55
  special(42, 'Go To Jail', 'gotojail'),
  city(43, 'Salvador', 'green', 'br', 420, [52, 210, 630, 1450, 2050], 200),
  city(44, 'Sao Paulo', 'green', 'br', 420, [52, 210, 630, 1450, 2050], 200),
  special(45, 'Community Chest', 'chest'),
  city(46, 'Rio de Janeiro', 'green', 'br', 440, [55, 220, 660, 1500, 2100], 200),
  airport(47, 'JFK Airport'),
  city(48, 'Vancouver', 'crimson', 'ca', 460, [58, 230, 690, 1550, 2200], 200),
  special(49, 'Chance', 'chance'),
  city(50, 'Montreal', 'crimson', 'ca', 460, [58, 230, 690, 1550, 2200], 200),
  utility(51, 'Water Works'),
  city(52, 'Toronto', 'crimson', 'ca', 480, [60, 240, 720, 1600, 2300], 200),
  special(53, 'Luxury Tax', 'tax', 150),
  city(54, 'Los Angeles', 'darkblue', 'us', 500, [64, 260, 780, 1700, 2400], 200),
  city(55, 'New York', 'darkblue', 'us', 550, [70, 280, 840, 1800, 2600], 200)
];
