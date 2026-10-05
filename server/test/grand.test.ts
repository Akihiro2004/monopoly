import { describe, it, expect, afterEach, vi } from 'vitest';
import { CHANCE_CARDS, GRAND_BOARD, WORLD_BOARD, Seat, sideOf } from '@monopoly/shared';
import { MonopolyGameEngine } from '../src/engine/game.js';
import { simulate } from './botSim.js';

const seats: Seat[] = ['p1', 'p2', 'p3'].map((id, i) => ({
  seatIndex: i,
  playerId: id,
  displayName: id.toUpperCase(),
  color: (['red', 'blue', 'green'] as const)[i],
  tokenType: (['car', 'hat', 'dog'] as const)[i],
  isReady: true,
  isConnected: true,
  isHost: i === 0
}));

const engines: MonopolyGameEngine[] = [];
const grand = () => {
  const e = new MonopolyGameEngine('grand', seats, { specialVictory: true, boardId: 'grand' });
  engines.push(e);
  return e;
};

afterEach(() => {
  engines.splice(0).forEach((e) => e.dispose());
  vi.restoreAllMocks();
});

describe('Grand World board', () => {
  it('has 56 tiles, three countries per side and the new specials', () => {
    expect(GRAND_BOARD.size).toBe(56);
    expect(GRAND_BOARD.perSide).toBe(14);
    expect(Object.keys(GRAND_BOARD.groups)).toHaveLength(12);
    for (let side = 0; side < 4; side++) {
      const countries = new Set(
        Object.values(GRAND_BOARD.groups)
          .filter((g) => sideOf(GRAND_BOARD, g[0]) === side)
          .map((g) => GRAND_BOARD.tiles[g[0]].country)
      );
      expect(countries.size).toBe(3);
    }
    expect(GRAND_BOARD.tolls).toHaveLength(2);
    expect(GRAND_BOARD.railroads).toHaveLength(4);
    expect(GRAND_BOARD.tiles.filter((t) => t.type === 'bonus')).toHaveLength(2);
    expect([GRAND_BOARD.jail, GRAND_BOARD.parking, GRAND_BOARD.goToJail]).toEqual([14, 28, 42]);
    // The classic board is unchanged.
    expect(WORLD_BOARD.size).toBe(40);
    expect(WORLD_BOARD.jail).toBe(10);
  });

  it('starts with the bigger purse, bank supply and an empty jackpot', () => {
    const e = grand();
    expect(e.state.boardId).toBe('grand');
    expect(e.state.players[0].money).toBe(2000);
    expect(e.state.bank.houses).toBe(48);
    expect(e.state.jackpot).toBe(0);
    expect(Object.keys(e.state.properties)).toHaveLength(56);
  });

  it('charges a toll to everyone driving past a gate', () => {
    const e = grand();
    const gate = GRAND_BOARD.tolls[0]; // Causeway Toll, tile 11
    e.state.properties[gate].ownerId = 'p2';
    const p1 = e.state.players[0];
    p1.position = gate - 3;
    const before = p1.money;
    e.rollDice(2, 3); // drives through the gate, lands 2 past it
    expect(p1.position).toBe(gate + 2);
    expect(e.state.players[1].money).toBe(2000 + 25);
    expect(p1.money).toBeLessThanOrEqual(before - 25);
  });

  it('charges more when one owner holds both gates, and a toll never causes debt', () => {
    const e = grand();
    const [g1, g2] = GRAND_BOARD.tolls;
    e.state.properties[g1].ownerId = 'p2';
    e.state.properties[g2].ownerId = 'p2';
    const p1 = e.state.players[0];
    p1.position = g1 - 3;
    p1.money = 40;
    e.rollDice(2, 3);
    // Owner of both gates charges $60, but p1 only had $40: pays what they have.
    expect(e.state.players[1].money).toBe(2040);
    expect(e.state.debt).toBeNull();
  });

  it('landing on a gate is like rent', () => {
    const e = grand();
    const gate = GRAND_BOARD.tolls[0];
    e.state.properties[gate].ownerId = 'p2';
    e.state.players[0].position = gate - 4;
    e.rollDice(1, 3);
    expect(e.state.players[0].position).toBe(gate);
    expect(e.state.players[1].money).toBe(2025);
  });

  it('collects taxes into the jackpot and pays it out on Free Parking', () => {
    const e = grand();
    const p1 = e.state.players[0];
    p1.position = 1;
    e.rollDice(1, 2); // Income Tax (tile 4)
    expect(e.state.jackpot).toBe(200);
    e.state.phase = 'ROLLING';
    p1.position = GRAND_BOARD.parking - 5;
    const before = p1.money;
    e.rollDice(2, 3);
    expect(p1.position).toBe(GRAND_BOARD.parking);
    expect(p1.money).toBe(before + 200);
    expect(e.state.jackpot).toBe(0);
  });

  it('Lucky Draw pays a bonus (or a small fee into the pot)', () => {
    const e = grand();
    const draw = GRAND_BOARD.tiles.find((t) => t.type === 'bonus')!.index;
    const p1 = e.state.players[0];
    p1.position = draw - 3;
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // no fee, top bonus
    e.rollDice(1, 2);
    expect(p1.money).toBe(2000 + 200);
  });

  it('cards send players to the same city on the bigger board', () => {
    const e = grand();
    const london = GRAND_BOARD.tiles.find((t) => t.name === 'London')!.index;
    const toLondon = CHANCE_CARDS.find((c) => c.id === 'ch_london')!;
    // Put the London card on top of the Chance deck.
    const deck = (e as unknown as { chanceDeck: typeof CHANCE_CARDS }).chanceDeck;
    deck.splice(deck.indexOf(toLondon), 1);
    deck.unshift(toLondon);
    const chance = GRAND_BOARD.tiles.find((t) => t.type === 'chance')!.index;
    e.state.players[0].position = chance - 3;
    e.rollDice(1, 2);
    expect(e.state.players[0].position).toBe(london);
  });

  it('bot-only Grand World games finish', () => {
    for (let i = 0; i < 6; i++) {
      const r = simulate({ kinds: ['smart', 'smart', 'smart', 'smart', 'smart', 'smart'], boardId: 'grand', randomEvents: true });
      expect(r.stalled).toBeNull();
      expect(r.winnerId).not.toBeNull();
    }
  });
});
