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

  it('allows player to decline buying unowned property', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.rollDice(1, 2);

    expect(engine.state.phase).toBe('BUY_OFFER');
    engine.respondToBuyOffer(false);

    expect(engine.state.properties[3].ownerId).toBeNull();
    expect(engine.state.players[0].money).toBe(1500);
    expect(engine.state.phase).toBe('TURN_ENDED');
  });

  it('does not offer to buy if player has insufficient funds', () => {
    const engine = new MonopolyGameEngine('room123', seats, { specialVictory: true });
    engine.state.players[0].money = 10;
    engine.rollDice(1, 2);

    expect(engine.state.phase).toBe('TURN_ENDED');
    expect(engine.state.buyOffer).toBeNull();
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
});
