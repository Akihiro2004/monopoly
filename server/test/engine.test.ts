import { describe, it, expect, beforeEach } from 'vitest';
import { MonopolyGameEngine } from '../src/engine/game.js';
import { CardDraw, Seat } from '@monopoly/shared';

describe('Monopoly Game Engine (LINE Get Rich rules)', () => {
  let seats: Seat[];

  beforeEach(() => {
    seats = [
      {
        seatIndex: 0,
        playerId: 'p1',
        displayName: 'Alice',
        color: 'red',
        tokenType: 'car',
        isReady: true,
        isConnected: true,
        isHost: true
      },
      {
        seatIndex: 1,
        playerId: 'p2',
        displayName: 'Bob',
        color: 'blue',
        tokenType: 'hat',
        isReady: true,
        isConnected: true,
        isHost: false
      }
    ];
  });

  it('initializes game state correctly', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    expect(engine.state.players.length).toBe(2);
    expect(engine.state.players[0].money).toBe(1500);
    expect(engine.state.phase).toBe('ROLLING');
    expect(engine.state.turnNumber).toBe(1);
    expect(Object.keys(engine.state.properties).length).toBe(40);
  });

  it('triggers buy offer when landing on unowned property (no auto-buy)', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.rollDice(1, 2);

    expect(engine.state.players[0].position).toBe(3);
    expect(engine.state.phase).toBe('BUY_OFFER');
    expect(engine.state.buyOffer).not.toBeNull();
    expect(engine.state.buyOffer?.tileIndex).toBe(3);
    expect(engine.state.buyOffer?.price).toBe(60);
    expect(engine.state.properties[3].ownerId).toBeNull();

    // Player accepts the offer:
    engine.respondToBuyOffer(true);
    expect(engine.state.properties[3].ownerId).toBe('p1');
    expect(engine.state.players[0].money).toBe(1500 - 60);
    expect(engine.state.properties[3].buildLevel).toBe(0);
    expect(engine.state.phase).toBe('TURN_ENDED');
  });

  it('declining a property sends it to a Bank auction; no bids keeps it with the Bank', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.rollDice(1, 2);

    expect(engine.state.phase).toBe('BUY_OFFER');
    engine.respondToBuyOffer(false);

    expect(engine.state.phase).toBe('AUCTION');
    expect(engine.state.auction?.tileIndex).toBe(3);
    engine.finishAuction();
    expect(engine.state.properties[3].ownerId).toBeNull();
    expect(engine.state.players[0].money).toBe(1500);
    expect(engine.state.phase).toBe('TURN_ENDED');
  });

  it('auctions a property the lander cannot afford', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.state.players[0].money = 10;
    engine.rollDice(1, 2);

    expect(engine.state.buyOffer).toBeNull();
    expect(engine.state.phase).toBe('AUCTION');
    engine.finishAuction();
    expect(engine.state.properties[3].ownerId).toBeNull();
  });

  it('triggers force-buy offer when landing on opponent developed property', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.state.properties[3].ownerId = 'p2';
    engine.state.properties[3].buildLevel = 1;

    engine.rollDice(1, 2);

    expect(engine.state.phase).toBe('FORCE_BUY_OFFER');
    expect(engine.state.forceBuyOffer).not.toBeNull();
    expect(engine.state.forceBuyOffer?.tileIndex).toBe(3);
    expect(engine.state.forceBuyOffer?.targetPlayerId).toBe('p2');
    expect(engine.state.forceBuyOffer?.buyerPlayerId).toBe('p1');
    expect(engine.state.forceBuyOffer?.price).toBe(220); // (60 + 50)*2
  });

  it('executes forced sale when buyer accepts: keeps build level, locks landmark', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.state.properties[3].ownerId = 'p2';
    engine.state.properties[3].buildLevel = 2;

    engine.rollDice(1, 2);
    expect(engine.state.phase).toBe('FORCE_BUY_OFFER');

    const aliceMoney = engine.state.players[0].money;
    const bobMoney = engine.state.players[1].money;
    const price = engine.state.forceBuyOffer!.price;

    engine.respondToForceBuy(true);

    expect(engine.state.properties[3].ownerId).toBe('p1');
    expect(engine.state.properties[3].buildLevel).toBe(2);
    expect(engine.state.properties[3].forceBought).toBe(true);
    expect(engine.state.players[0].money).toBe(aliceMoney - price);
    expect(engine.state.players[1].money).toBe(bobMoney + price);
    expect(engine.state.phase).toBe('TURN_ENDED');
  });

  it('prevents upgrading to Landmark if property was force-bought', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.state.properties[3].ownerId = 'p1';
    engine.state.properties[3].buildLevel = 2;
    engine.state.properties[3].forceBought = true;
    engine.state.players[0].position = 3;

    engine.build(3);
    expect(engine.state.properties[3].buildLevel).toBe(3);

    expect(() => engine.build(3)).toThrow(/Landmark locked/i);
    expect(engine.state.properties[3].buildLevel).toBe(3);
  });

  it('landmarks (level 4) cannot be force-bought by opponents', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.state.properties[39].ownerId = 'p2';
    engine.state.properties[39].buildLevel = 4;

    engine.state.players[0].position = 35;
    engine.rollDice(2, 2);

    expect(engine.state.phase).not.toBe('FORCE_BUY_OFFER');
    expect(engine.state.forceBuyOffer).toBeNull();
  });

  it('triggers Triple Victory when a player owns 3 complete color sets', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    // Brown
    engine.state.properties[1].ownerId = 'p1';
    engine.state.properties[3].ownerId = 'p1';
    // Dark Blue
    engine.state.properties[37].ownerId = 'p1';
    engine.state.properties[39].ownerId = 'p1';
    // Pink
    engine.state.properties[11].ownerId = 'p1';
    engine.state.properties[13].ownerId = 'p1';
    engine.state.properties[14].ownerId = 'p1';

    const hasWon = engine.checkAndApplyVictory();
    expect(hasWon).toBe(true);
    expect(engine.state.winnerId).toBe('p1');
    expect(engine.state.victoryType).toBe('triple_victory');
    expect(engine.state.phase).toBe('GAME_OVER');
  });

  it('triggers Line Victory when a player owns all properties on Side 1', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    [1, 3, 5, 6, 8, 9].forEach((idx) => {
      engine.state.properties[idx].ownerId = 'p1';
    });

    const hasWon = engine.checkAndApplyVictory();
    expect(hasWon).toBe(true);
    expect(engine.state.winnerId).toBe('p1');
    expect(engine.state.victoryType).toBe('line_victory');
    expect(engine.state.phase).toBe('GAME_OVER');
  });

  it('enters DEBT (not instant bankruptcy) when player cannot pay rent, then bankruptcy transfers properties', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.properties[37].ownerId = 'p2';
    engine.state.properties[37].buildLevel = 3;

    engine.state.players[0].money = 200;
    engine.state.players[0].position = 35;

    engine.rollDice(1, 1);

    expect(engine.state.players[0].isBankrupt).toBe(false);
    expect(engine.state.phase).toBe('DEBT');
    expect(engine.state.debt).not.toBeNull();
    expect(engine.state.debt?.creditorId).toBe('p2');

    engine.declareBankruptcy();

    expect(engine.state.players[0].isBankrupt).toBe(true);
    expect(engine.state.winnerId).toBe('p2');
    expect(engine.state.victoryType).toBe('bankruptcy');
    expect(engine.state.phase).toBe('GAME_OVER');
  });

  it('only allows upgrading the property the player stands on', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.state.properties[1].ownerId = 'p1';
    engine.state.properties[3].ownerId = 'p1';
    engine.state.players[0].position = 1;
    engine.state.players[0].lapsCompleted = 1;

    expect(() => engine.build(3)).toThrow(/must stand on/i);
    expect(engine.state.properties[3].buildLevel).toBe(0);

    engine.build(1);
    expect(engine.state.properties[1].buildLevel).toBe(1);
  });

  it('sells one building level for half the build cost and auto-pays debt when covered', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    // Alice owns Baltic (tile 3, buildCost 50) with a house, stands on it.
    engine.state.properties[3].ownerId = 'p1';
    engine.state.properties[3].buildLevel = 1;
    engine.state.players[0].position = 3;
    // Park Place (tile 37, hotel rent 900) owned by Bob; Alice has $100.
    engine.state.properties[37].ownerId = 'p2';
    engine.state.properties[37].buildLevel = 3;
    engine.state.players[0].money = 100;
    engine.state.players[0].position = 35;

    engine.rollDice(1, 1);
    expect(engine.state.phase).toBe('DEBT');

    // Give Alice enough cash (minus one refund) so selling covers the $1100 debt.
    engine.state.properties[3].buildLevel = 1;
    engine.state.players[0].money = 1080;
    engine.sell(3);

    expect(engine.state.properties[3].buildLevel).toBe(0);
    expect(engine.state.debt).toBeNull();
    expect(engine.state.phase).toBe('TURN_ENDED');
    // 1080 + 25 refund - 1100 debt = 5 left; Bob got 1100.
    expect(engine.state.players[0].money).toBe(5);
    expect(engine.state.players[1].money).toBe(1500 + 1100);
  });

  it('rejects selling when there is nothing to sell', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.state.properties[1].ownerId = 'p1';
    expect(() => engine.sell(1)).toThrow(/no buildings/i);
  });

  it('emits a card draw for the modal when landing on a chest tile', () => {
    const draws: CardDraw[] = [];
    const engine = new MonopolyGameEngine('room123', seats, {
      specialVictory: true,
      onCard: (d) => draws.push(d)
    });
    engine.rollDice(1, 1); // tile 2 = Community Chest

    expect(engine.state.players[0].position).not.toBe(0);
    expect(draws.length).toBe(1);
    expect(draws[0].deck).toBe('chest');
    expect(draws[0].title).toBe('COMMUNITY CHEST');
    expect(draws[0].text.length).toBeGreaterThan(0);
  });

  it('enters DEBT for unaffordable tax instead of instant bankruptcy', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.players[0].money = 50;
    engine.state.players[0].position = 2; // tile 4 = Income Tax $200

    engine.rollDice(1, 1);

    expect(engine.state.phase).toBe('DEBT');
    expect(engine.state.debt?.amount).toBe(200);
    expect(engine.state.debt?.creditorId).toBeNull();
    expect(engine.state.players[0].isBankrupt).toBe(false);
  });

  it('requires passing GO once before building on raw land', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.properties[1].ownerId = 'p1';
    engine.state.players[0].position = 1;
    expect(() => engine.build(1)).toThrow(/pass GO/i);

    // Rolling past GO counts a lap
    engine.state.players[0].position = 38;
    engine.rollDice(2, 1); // lands on 1
    expect(engine.state.players[0].lapsCompleted).toBe(1);
    engine.build(1);
    expect(engine.state.properties[1].buildLevel).toBe(1);
  });

  it('only allows a Landmark once the whole color set is built to Hotels', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    const me = engine.state.players[0];
    me.lapsCompleted = 1;
    me.money = 5000;
    me.position = 1;
    engine.state.properties[1].ownerId = 'p1';
    engine.state.properties[1].buildLevel = 3;
    engine.state.properties[3].ownerId = 'p1';
    engine.state.properties[3].buildLevel = 2;
    expect(() => engine.build(1)).toThrow(/whole color set/i);

    engine.state.properties[3].buildLevel = 3;
    engine.build(1);
    expect(engine.state.properties[1].buildLevel).toBe(4);
  });

  it('never offers or executes a force-buy on a Landmark', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.properties[6].ownerId = 'p2';
    engine.state.properties[6].buildLevel = 4;
    engine.state.players[0].money = 100000;
    engine.state.players[0].position = 4;
    engine.rollDice(1, 1); // lands on 6
    expect(engine.state.forceBuyOffer).toBeNull();
    expect(engine.state.properties[6].ownerId).toBe('p2');
  });

  it('bankruptcy sells everything to the bank and pays the creditor only the debt', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    const [p1, p2] = engine.state.players;
    engine.state.properties[1].ownerId = 'p1';
    engine.state.properties[1].buildLevel = 2; // 2 x $25 back
    engine.state.properties[5].ownerId = 'p1'; // railroad, $100 back
    p1.money = 10;
    p2.money = 1000;
    engine.state.phase = 'DEBT';
    engine.state.debt = { amount: 120, creditorId: 'p2', reason: 'rent' };

    engine.declareBankruptcy();

    expect(p1.isBankrupt).toBe(true);
    expect(p2.money).toBe(1120); // owed amount only, not the whole estate
    expect(engine.state.properties[1].ownerId).toBeNull();
    expect(engine.state.properties[1].buildLevel).toBe(0);
    expect(engine.state.properties[5].ownerId).toBeNull();
  });

  it('bankruptcy pays the creditor at most what the liquidation raised', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    const [p1, p2] = engine.state.players;
    p1.money = 40;
    p2.money = 0;
    engine.state.phase = 'DEBT';
    engine.state.debt = { amount: 500, creditorId: 'p2', reason: 'rent' };
    engine.declareBankruptcy();
    expect(p2.money).toBe(40);
  });

  it('bankrupt player is skipped and the turn advances automatically', () => {
    const three = [...seats, { ...seats[1], seatIndex: 2, playerId: 'p3', displayName: 'Cara', color: 'green' as const, tokenType: 'dog' as const }];
    const engine = new MonopolyGameEngine('room123', three, { specialVictory: false });
    engine.state.phase = 'DEBT';
    engine.state.debt = { amount: 5000, creditorId: null, reason: 'tax' };
    engine.declareBankruptcy();
    expect(engine.state.phase).toBe('ROLLING');
    expect(engine.getCurrentPlayer().playerId).toBe('p2');
  });

  it('resolves the destination tile after a Chance "advance to" card', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    (engine as any).chanceDeck = [
      { id: 'x', deck: 'chance', action: { type: 'moveTo', tileIndex: 24, passGoCheck: true, text: 'Advance to Illinois Ave.' } }
    ];
    engine.state.players[0].position = 5;
    engine.rollDice(1, 1); // lands on Chance (7)
    expect(engine.state.players[0].position).toBe(24);
    expect(engine.state.phase).toBe('BUY_OFFER');
    expect(engine.state.buyOffer?.tileIndex).toBe(24);
  });

  it('trades money and unbuilt properties both ways when accepted', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.properties[1].ownerId = 'p1';
    engine.state.properties[39].ownerId = 'p2';
    const t = engine.proposeTrade('p1', { toId: 'p2', giveMoney: 100, giveProps: [1], getMoney: 0, getProps: [39] });
    expect(engine.state.trades).toHaveLength(1);
    expect(() => engine.respondToTrade(t.id, 'p1', true)).toThrow(/receiving player/i);

    engine.respondToTrade(t.id, 'p2', true);
    expect(engine.state.properties[1].ownerId).toBe('p2');
    expect(engine.state.properties[39].ownerId).toBe('p1');
    expect(engine.state.players[0].money).toBe(1400);
    expect(engine.state.players[1].money).toBe(1600);
    expect(engine.state.trades).toHaveLength(0);
  });

  it('rejects trading built properties, unaffordable cash, and supports decline / cancel', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.properties[1].ownerId = 'p1';
    engine.state.properties[1].buildLevel = 1;
    expect(() => engine.proposeTrade('p1', { toId: 'p2', giveMoney: 0, giveProps: [1], getMoney: 0, getProps: [] })).toThrow(/Sell the buildings/);
    expect(() => engine.proposeTrade('p1', { toId: 'p2', giveMoney: 99999, giveProps: [], getMoney: 0, getProps: [] })).toThrow(/does not have/);

    const t1 = engine.proposeTrade('p1', { toId: 'p2', giveMoney: 10, giveProps: [], getMoney: 0, getProps: [] });
    engine.respondToTrade(t1.id, 'p2', false);
    expect(engine.state.players[1].money).toBe(1500);

    const t2 = engine.proposeTrade('p1', { toId: 'p2', giveMoney: 10, giveProps: [], getMoney: 0, getProps: [] });
    engine.cancelTrade(t2.id, 'p1');
    expect(engine.state.trades).toHaveLength(0);
  });

  it('a trade that gives the debtor enough cash settles their debt', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.phase = 'DEBT';
    engine.state.players[0].money = 0;
    engine.state.properties[39].ownerId = 'p1';
    engine.state.debt = { amount: 200, creditorId: null, reason: 'tax' };
    const t = engine.proposeTrade('p1', { toId: 'p2', giveMoney: 0, giveProps: [39], getMoney: 300, getProps: [] });
    engine.respondToTrade(t.id, 'p2', true);
    expect(engine.state.debt).toBeNull();
    expect(engine.state.phase).toBe('TURN_ENDED');
    expect(engine.state.players[0].money).toBe(100);
  });

  it('auction: highest bidder pays the Bank and takes the deed; bids are validated', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.rollDice(1, 2);
    engine.respondToBuyOffer(false);

    expect(() => engine.placeBid('p2', 5)).toThrow(/at least \$10/);
    engine.placeBid('p2', 20);
    expect(() => engine.placeBid('p1', 25)).toThrow(/at least \$30/);
    engine.placeBid('p1', 30);
    engine.placeBid('p2', 45);
    expect(() => engine.placeBid('p1', 99999)).toThrow(/only have/);
    engine.finishAuction();

    expect(engine.state.properties[3].ownerId).toBe('p2');
    expect(engine.state.players[1].money).toBe(1455);
    expect(engine.state.phase).toBe('TURN_ENDED');
    const txn = engine.state.bank.ledger.at(-1)!;
    expect(txn).toMatchObject({ fromId: 'p2', toId: null, amount: 45 });
  });

  it('the Bank has a limited supply of houses and hotels', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    const me = engine.state.players[0];
    me.lapsCompleted = 1;
    me.money = 5000;
    me.position = 1;
    engine.state.properties[1].ownerId = 'p1';

    engine.state.bank.houses = 0;
    expect(() => engine.build(1)).toThrow(/no houses/i);

    engine.state.bank.houses = 2;
    engine.build(1); // house
    engine.build(1); // building (2 houses on the tile)
    expect(engine.state.bank.houses).toBe(0);
    engine.state.bank.hotels = 0;
    expect(() => engine.build(1)).toThrow(/no hotels/i);
    engine.state.bank.hotels = 1;
    engine.build(1); // hotel: the 2 houses go back to the Bank
    expect(engine.state.bank.houses).toBe(2);
    expect(engine.state.bank.hotels).toBe(0);
  });

  it('selling a hotel during a housing shortage sells the property down to land', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.properties[1].ownerId = 'p1';
    engine.state.properties[1].buildLevel = 3;
    engine.state.bank.hotels = 11;
    engine.state.bank.houses = 1;
    const before = engine.state.players[0].money;
    engine.sell(1);
    expect(engine.state.properties[1].buildLevel).toBe(0);
    expect(engine.state.players[0].money).toBe(before + 25 * 3);
    expect(engine.state.bank.hotels).toBe(12);
    expect(engine.state.bank.houses).toBe(1);
  });

  it('keeps a bank statement of money movements', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.players[0].position = 38;
    engine.rollDice(2, 1); // passes GO, lands on 1 (buy offer)
    engine.respondToBuyOffer(true);
    const ledger = engine.state.bank.ledger;
    expect(ledger.some((t) => t.reason === 'GO salary' && t.toId === 'p1' && t.amount === 200)).toBe(true);
    expect(ledger.some((t) => t.reason.startsWith('Bought') && t.fromId === 'p1' && t.amount === 60)).toBe(true);
  });

  it('bankruptcy returns building pieces to the Bank', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: false });
    engine.state.properties[1].ownerId = 'p1';
    engine.state.properties[1].buildLevel = 2;
    engine.state.properties[3].ownerId = 'p1';
    engine.state.properties[3].buildLevel = 4;
    engine.state.bank.houses = 30;
    engine.state.bank.hotels = 11;
    engine.state.phase = 'DEBT';
    engine.state.debt = { amount: 9999, creditorId: null, reason: 'tax' };
    engine.declareBankruptcy();
    expect(engine.state.bank.houses).toBe(32);
    expect(engine.state.bank.hotels).toBe(12);
  });
});
