import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest';
import { Seat } from '@monopoly/shared';
import { MonopolyGameEngine } from '../src/engine/game.js';
import { createForceBuyOffer } from '../src/engine/forceBuy.js';
import { BotDriver } from '../src/bots/driver.js';
import { decide, newMemory } from '../src/bots/brain.js';
import { pickBotName, tidyUsername } from '../src/bots/names.js';
import { RoomManager, rankPlayers, MatchRecord } from '../src/rooms.js';
import { simulate } from './botSim.js';

beforeAll(() => {
  process.env.BOT_NAMES_ONLINE = '0'; // tests never hit the network
});

function seat(id: string, i: number, bot: boolean): Seat {
  return {
    seatIndex: i,
    playerId: id,
    displayName: id,
    color: (['red', 'blue', 'green'] as const)[i],
    tokenType: (['car', 'hat', 'dog'] as const)[i],
    isReady: true,
    isConnected: true,
    isHost: i === 0,
    ...(bot ? { isBot: true } : {})
  };
}

const engines: MonopolyGameEngine[] = [];
function game(seats: Seat[], specialVictory = true) {
  const e = new MonopolyGameEngine('bots', seats, { specialVictory });
  engines.push(e);
  return e;
}
const own = (e: MonopolyGameEngine, owner: string, tiles: number[], level = 0) =>
  tiles.forEach((i) => Object.assign(e.state.properties[i], { ownerId: owner, buildLevel: level }));

afterEach(() => {
  engines.splice(0).forEach((e) => e.dispose());
  vi.useRealTimers();
});

describe('bot decisions', () => {
  it('buys an unowned deed it can afford', () => {
    const e = game([seat('a', 0, true), seat('b', 1, true)]);
    e.rollDice(1, 2);
    const action = decide(e, 'a', newMemory())!;
    expect(action.key).toBe('buy:3:true');
    action.run();
    expect(e.state.properties[3].ownerId).toBe('a');
  });

  it('force-buys the deed that completes a Line Victory', () => {
    const e = game([seat('a', 0, true), seat('b', 1, true)]);
    own(e, 'a', [1, 3, 5, 6, 8]);
    own(e, 'b', [9], 1);
    const a = e.state.players[0];
    a.money = 5000;
    a.position = 9;
    e.state.forceBuyOffer = createForceBuyOffer(e.board, 9, a, e.state.properties[9]);
    e.state.phase = 'FORCE_BUY_OFFER';
    decide(e, 'a', newMemory())!.run();
    expect(e.state.winnerId).toBe('a');
    expect(e.state.victoryType).toBe('line_victory');
  });

  it('bids to stop an opponent from winning at auction', () => {
    const e = game([seat('a', 0, true), seat('b', 1, true)]);
    own(e, 'b', [1, 3, 5, 6, 8]);
    e.state.phase = 'AUCTION';
    e.state.auction = { tileIndex: 9, highBid: e.board.tiles[9].price, highBidderId: null, endsAt: Date.now() + 10_000, bidders: [] };
    const action = decide(e, 'a', newMemory())!;
    expect(action.key).toMatch(/^bid:9:/);
    action.run();
    expect(e.state.auction?.highBidderId).toBe('a');
  });

  it('refuses a trade that hands the other player the game', () => {
    const e = game([seat('a', 0, true), seat('b', 1, true)]);
    own(e, 'b', [1, 3, 5, 6, 8]);
    own(e, 'a', [9]);
    e.state.players[1].money = 3000;
    const offer = e.proposeTrade('b', { toId: 'a', giveMoney: 2500, giveProps: [], getMoney: 0, getProps: [9] });
    const action = decide(e, 'a', newMemory())!;
    expect(action.key).toBe(`trade:${offer.id}`);
    action.run();
    expect(e.state.properties[9].ownerId).toBe('a');
    expect(e.state.winnerId).toBeNull();
  });

  it('accepts a generous cash offer for a deed it does not need', () => {
    const e = game([seat('a', 0, true), seat('b', 1, true)], false);
    own(e, 'a', [12]);
    e.proposeTrade('b', { toId: 'a', giveMoney: 600, giveProps: [], getMoney: 0, getProps: [12] });
    decide(e, 'a', newMemory())!.run();
    expect(e.state.properties[12].ownerId).toBe('b');
  });

  it('raises cash to pay a debt instead of going bankrupt', () => {
    const e = game([seat('a', 0, true), seat('b', 1, true)]);
    own(e, 'a', [39]);
    e.state.players[0].money = 10;
    e.state.debt = { amount: 100, creditorId: 'b', reason: 'test' };
    e.state.phase = 'DEBT';
    decide(e, 'a', newMemory())!.run();
    expect(e.state.debt).toBeNull();
    expect(e.state.players[0].isBankrupt).toBe(false);
    expect(e.state.properties[39].isMortgaged).toBe(true);
  });
});

describe('bot driver', () => {
  it('plays its turn after a short pause while a human is online', () => {
    vi.useFakeTimers();
    const e = game([seat('bot', 0, true), seat('human', 1, false)]);
    const driver = new BotDriver(e);
    e.options.onStateChange = () => driver.onState();
    driver.onState();
    expect(e.state.lastMove).toBeNull();
    vi.advanceTimersByTime(4000);
    expect(e.state.lastMove?.playerId).toBe('bot');
    driver.dispose();
  });

  it('waits while no human is connected', () => {
    vi.useFakeTimers();
    const e = game([seat('bot', 0, true), seat('human', 1, false)]);
    e.state.players[1].isConnected = false;
    const driver = new BotDriver(e);
    e.options.onStateChange = () => driver.onState();
    driver.onState();
    vi.advanceTimersByTime(60_000);
    expect(e.state.lastMove).toBeNull();
    // The human comes back: the bot carries on.
    e.setConnected('human', true);
    vi.advanceTimersByTime(4000);
    expect(e.state.lastMove?.playerId).toBe('bot');
    driver.dispose();
  });
});

describe('bot games (headless)', () => {
  it('bot-only games always finish, with every rule variant', () => {
    for (let i = 0; i < 12; i++) {
      const r = simulate({ kinds: ['smart', 'smart', 'smart', 'smart'], randomEvents: true, forceBuyMode: (['off', 'developed', 'any'] as const)[i % 3] });
      expect(r.stalled).toBeNull();
      expect(r.winnerId).not.toBeNull();
    }
  });

  it('beats a buy-everything, build-everything player most of the time', () => {
    let wins = 0;
    const N = 60;
    for (let i = 0; i < N; i++) {
      const r = simulate({ kinds: i % 2 ? ['smart', 'naive'] : ['naive', 'smart'] });
      expect(r.stalled).toBeNull();
      if (r.winnerKind === 'smart') wins++;
    }
    // ~70% in long runs; 50% leaves plenty of room for dice luck.
    expect(wins / N).toBeGreaterThan(0.5);
  });
});

describe('bots in rooms', () => {
  const manager = () => new RoomManager();

  it('only the host can add bots, which arrive ready with unique names', () => {
    const m = manager();
    const room = m.createRoom('s-host', 'host', 'Host');
    expect(m.addBot(room.roomId, 'someone-else').ok).toBe(false);
    for (let i = 0; i < 5; i++) expect(m.addBot(room.roomId, 'host').ok).toBe(true);
    expect(m.addBot(room.roomId, 'host').error).toMatch(/full/);
    const bots = room.seats.filter((s) => s.isBot);
    expect(bots).toHaveLength(5);
    expect(bots.every((b) => b.isReady && b.isConnected && !b.isHost)).toBe(true);
    expect(new Set(room.seats.map((s) => s.displayName.toLowerCase())).size).toBe(6);
    expect(new Set(room.seats.map((s) => s.color)).size).toBe(6);
    expect(new Set(room.seats.map((s) => s.tokenType)).size).toBe(6);
    expect(bots.every((b) => !b.displayName.toLowerCase().startsWith('bot'))).toBe(true);
    // The game starts straight away: bots are always ready.
    expect(m.startGame(room.roomId, 'host').ok).toBe(true);
    expect(room.engine!.state.players.filter((p) => p.isBot)).toHaveLength(5);
    room.engine!.dispose();
  });

  it('the host can remove a bot', () => {
    const m = manager();
    const room = m.createRoom('s-host', 'host', 'Host');
    const { seat: bot } = m.addBot(room.roomId, 'host');
    expect(m.kick(room.roomId, 'host', bot!.playerId).ok).toBe(true);
    expect(room.seats).toHaveLength(1);
  });

  it('hosting passes to a person, and a lobby left with only bots closes', () => {
    const m = manager();
    const room = m.createRoom('s-host', 'host', 'Host');
    m.addBot(room.roomId, 'host');
    m.joinRoom(room.roomId, 's-p2', 'p2', 'P2');
    m.leaveRoom('s-host');
    expect(room.hostPlayerId).toBe('p2');
    m.leaveRoom('s-p2');
    expect(m.getRoom(room.roomId)).toBeUndefined();
  });

  it('bots stay off the leaderboard', () => {
    const match: MatchRecord = {
      roomId: 'R', startedAt: 0, finishedAt: 1, turns: 10, winnerId: 'bot-x', victoryType: 'bankruptcy',
      players: [
        { playerId: 'bot-x', name: 'pixelpanda', token: 'car', color: 'red', netWorth: 3000, bankrupt: false, surrendered: false, bot: true },
        { playerId: 'p1', name: 'Me', token: 'hat', color: 'blue', netWorth: 0, bankrupt: true, surrendered: false }
      ]
    };
    expect(rankPlayers([match], 10).map((e) => e.name)).toEqual(['Me']);
  });
});

describe('bot names', () => {
  it('fit a seat and look like usernames', () => {
    expect(tidyUsername('smallgoose951')?.toLowerCase()).toBe('smallgoose951');
    expect(tidyUsername('beautifulzebra196')?.toLowerCase()).toBe('beautifulzebra');
    expect(tidyUsername('x!')).toBeNull();
    const taken = ['pixelpanda'];
    for (let i = 0; i < 30; i++) {
      const n = pickBotName(taken);
      expect(n.length).toBeLessThanOrEqual(15);
      expect(taken.map((t) => t.toLowerCase())).not.toContain(n.toLowerCase());
      taken.push(n);
    }
  });
});
