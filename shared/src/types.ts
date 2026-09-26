export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
export type TokenType = 'car' | 'hat' | 'dog' | 'ship' | 'thimble' | 'boot';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type VictoryType = 'bankruptcy' | 'triple_victory' | 'line_victory';

export interface RoomSettings {
  maxPlayers: number;
  specialVictory: boolean; // LINE Get Rich: Triple Victory & Line Victory enabled
  turnTimeoutSec: number;
}

export interface Seat {
  seatIndex: number; // 0..5
  playerId: string;
  displayName: string;
  tokenType: TokenType;
  color: PlayerColor;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
}

export interface RoomState {
  roomId: string;
  hostPlayerId: string;
  status: RoomStatus;
  settings: RoomSettings;
  seats: Seat[];
  winnerId: string | null;
  victoryType: VictoryType | null;
}

// Board & Tile types
export type TileGroup =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue'
  | 'railroad'
  | 'utility'
  | 'special';

export type TileType =
  | 'property'
  | 'railroad'
  | 'utility'
  | 'go'
  | 'jail'
  | 'gotojail'
  | 'parking'
  | 'chance'
  | 'chest'
  | 'tax';

export interface TileDef {
  index: number; // 0..39
  name: string;
  type: TileType;
  group: TileGroup;
  price: number; // 0 for non-purchasable
  // rentByLevel: index 0 = base rent, 1 = house, 2 = building, 3 = hotel, 4 = landmark
  rentByLevel: [number, number, number, number, number];
  buildCost: number; // cost per upgrade level (0 for non-buildable)
  country?: string; // ISO 3166 alpha-2 of the city's country (color sets)
}

// BuildLevel: 0 = unbuilt/raw land, 1 = house, 2 = building, 3 = hotel, 4 = landmark
export type BuildLevel = 0 | 1 | 2 | 3 | 4;

export interface PropertyState {
  tileIndex: number;
  ownerId: string | null;
  buildLevel: BuildLevel;
  isMortgaged: boolean;
  forceBought: boolean; // true if acquired via force-buy -> landmark LOCKED (cannot upgrade to 4)
}

export interface PlayerState {
  playerId: string;
  seatIndex: number;
  name: string;
  color: PlayerColor;
  tokenType: TokenType;
  money: number;
  position: number; // 0..39
  inJail: boolean;
  jailTurns: number;
  jailCards: number; // get-out-of-jail-free cards held
  isBankrupt: boolean;
  isConnected: boolean;
  consecutiveDoubles: number;
  // Times this player has passed / landed on GO. Building on land needs >= 1.
  lapsCompleted: number;
}

export type GamePhase =
  | 'ROLLING'
  | 'MOVING'
  | 'RESOLVING'
  | 'BUY_OFFER'
  | 'FORCE_BUY_OFFER'
  | 'DEBT'
  | 'AUCTION'
  | 'TURN_ENDED'
  | 'GAME_OVER';

export interface BuyOffer {
  tileIndex: number;
  price: number;
  buyerPlayerId: string;
}

export interface ForceBuyOffer {
  tileIndex: number;
  targetPlayerId: string; // the victim (owner)
  buyerPlayerId: string; // the active player landing
  price: number; // 2x total value
  currentBuildLevel: BuildLevel;
  expiresAt: number; // timestamp ms
}

// Pending payment the active player cannot afford yet.
// While debt is set, the game sits in DEBT phase: the debtor may sell
// buildings (or mortgage) to raise cash, then the debt auto-pays.
// creditorId null means the debt is owed to the bank (tax / cards).
export interface DebtOffer {
  amount: number;
  creditorId: string | null;
  reason: string;
}

// Player-to-player trade proposal. `give*` flows from -> to, `get*` flows
// to -> from. Only unbuilt properties can change hands.
export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  giveMoney: number;
  giveProps: number[];
  getMoney: number;
  getProps: number[];
  createdAt: number;
}

// A drawn Chance / Community Chest card, broadcast for the info modal.
export interface CardDraw {
  deck: 'chance' | 'chest';
  title: string;
  text: string;
}

// ---------------------------------------------------------------- Bank
// Every money movement, for the bank statement. null = the Bank.
export interface BankTxn {
  id: number;
  ts: number;
  fromId: string | null;
  toId: string | null;
  amount: number;
  reason: string;
}

// The Bank owns the limited building supply (real Monopoly: 32 houses,
// 12 hotels) and keeps a ledger of the latest transactions.
export interface BankState {
  houses: number;
  hotels: number;
  ledger: BankTxn[];
  nextTxnId: number;
}

// Bank auction of a property the landing player declined / could not afford.
export interface AuctionState {
  tileIndex: number;
  highBid: number;
  highBidderId: string | null;
  endsAt: number; // timestamp ms
  bidders: string[]; // players who placed at least one bid
}

// The last dice move, so clients can animate walk -> landing -> follow-up
// (e.g. walk onto Chance, show the card, then travel to the card target).
export interface MoveRecord {
  seq: number;
  playerId: string;
  from: number;
  landed: number; // tile the dice walk ends on
  to: number; // final tile after the landing resolved (card / go-to-jail)
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  turnNumber: number;
  currentPlayerIndex: number; // index into players array
  players: PlayerState[];
  properties: Record<number, PropertyState>; // key: tileIndex 0..39
  dice: [number, number];
  doubles: boolean;
  doublesCount: number;
  buyOffer: BuyOffer | null;
  forceBuyOffer: ForceBuyOffer | null;
  debt: DebtOffer | null;
  trades: TradeOffer[];
  lastMove: MoveRecord | null;
  bank: BankState;
  auction: AuctionState | null;
  winnerId: string | null;
  victoryType: VictoryType | null;
  lastActionText: string;
}

// Chat
export interface ChatMessage {
  id: string;
  senderName: string;
  senderColor: PlayerColor;
  text: string;
  timestamp: number;
}
