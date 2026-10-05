import {
  AUCTION_MIN_INCREMENT,
  FORECLOSURE_ROUNDS,
  GO_TILE_INDEX,
  JAIL_FINE,
  MAX_MORTGAGES_PER_ROUND,
  GameState,
  PlayerState,
  TradeOffer,
  TradeProposal,
  buildBlockReason,
  effectiveBuildCost,
  liquidationValue,
  mortgageBlockReason,
  mortgageValue,
  tradeMortgageFees,
  unmortgageCost
} from '@monopoly/shared';
import type { MonopolyGameEngine } from '../engine/game.js';
import { calculateForceBuyPrice } from '../engine/forceBuy.js';
import {
  EvalCtx,
  View,
  boardDanger,
  cashReserve,
  cloneView,
  ctxOf,
  gainFrom,
  income,
  nextRollDanger,
  strategic,
  strength,
  viewOf,
  winDistance,
  winsWith
} from './evaluate.js';

// The bot's decisions. `decide` looks at the game and returns the single
// next thing one bot wants to do (or null). The driver runs it after a
// human-looking pause, then asks again: one action at a time, always against
// the latest state, so a bot never acts on something that already changed.

export type WaitKind = 'roll' | 'think' | 'quick' | 'auction' | 'trade';

export interface BotAction {
  botId: string;
  // Unique per decision ("build:12"): a failed action is not retried this turn.
  key: string;
  wait: WaitKind;
  run: () => void;
}

export interface BotMemory {
  // Turn number until which proposing deed X to player Y is on cooldown.
  proposalCooldown: Map<string, number>;
  // Our open offers: trade id -> turn it was sent.
  sentTrades: Map<string, number>;
  // Trades we already countered once (don't haggle forever).
  countered: Set<string>;
  lastProposalTurn: number;
  // Actions that failed this turn (skipped until the turn changes).
  failed: Set<string>;
  failedTurn: number;
}

export function newMemory(): BotMemory {
  return {
    proposalCooldown: new Map(),
    sentTrades: new Map(),
    countered: new Set(),
    lastProposalTurn: -99,
    failed: new Set(),
    failedTurn: 0
  };
}

// Trades: how much an opponent's gain counts against our own. With a single
// opponent the game is zero-sum, so their gain matters almost as much.
const rivalWeight = (ctx: EvalCtx) => (ctx.opponents <= 1 ? 0.9 : 0.6);
const TRADE_MARGIN = 15;
const MAX_COUNTER_ROUND = 5;
const PROPOSAL_EVERY_TURNS = 4;
const STALE_OFFER_TURNS = 5;
// Buildings are where the money is in this game (any deed you stand on can
// be built up): keep only half the usual cash cushion when building. Tuned
// in headless simulations (server/test/botSim.ts).
const BUILD_RESERVE = 0.5;
// Auctions: at most this times the list price for a deed that isn't decisive.
const MAX_OVERPAY = 1.6;

const round10 = (n: number) => Math.ceil(n / 10) * 10;

interface Ctx {
  engine: MonopolyGameEngine;
  state: GameState;
  me: PlayerState;
  mem: BotMemory;
  ctx: EvalCtx;
  view: View;
  forceBuyMode: 'off' | 'developed' | 'any';
}

export function decide(engine: MonopolyGameEngine, botId: string, mem: BotMemory): BotAction | null {
  const state = engine.state;
  if (state.phase === 'GAME_OVER') return null;
  const me = state.players.find((p) => p.playerId === botId);
  if (!me || me.isBankrupt) return null;
  if (mem.failedTurn !== state.turnNumber) {
    mem.failed.clear();
    mem.failedTurn = state.turnNumber;
  }
  const c: Ctx = {
    engine,
    state,
    me,
    mem,
    ctx: ctxOf(state, engine.options.specialVictory),
    view: viewOf(state),
    forceBuyMode: engine.options.forceBuyMode ?? 'developed'
  };
  const act = (key: string, wait: WaitKind, run: () => void): BotAction | null =>
    mem.failed.has(key) ? null : { botId, key, wait, run };

  const myTurn = engine.getCurrentPlayer()?.playerId === botId;

  // 1. Decisions the game is waiting on.
  if (myTurn) {
    if (state.phase === 'BUY_OFFER' && state.buyOffer) return decideBuy(c, act);
    if (state.phase === 'FORCE_BUY_OFFER' && state.forceBuyOffer) return decideForceBuy(c, act);
    if (state.phase === 'DEBT' && state.debt) return decideDebt(c, act);
  }
  if (state.phase === 'AUCTION' && state.auction) {
    const bid = decideBid(c, act);
    if (bid) return bid;
  }

  // 2. Offers other players sent us.
  const incoming = state.trades.find((t) => t.toId === botId && !mem.failed.has(`trade:${t.id}`));
  if (incoming) return decideTradeReply(c, incoming, act);

  // 3. Our own turn: housekeeping, then roll / end the turn.
  if (myTurn && (state.phase === 'ROLLING' || state.phase === 'TURN_ENDED')) {
    return (
      cancelStaleOffers(c, act) ??
      decideUnmortgage(c, act) ??
      decideBuild(c, act) ??
      decideProposal(c, act) ??
      (state.phase === 'ROLLING' ? decideJailOrRoll(c, act) : act('end', 'think', () => engine.endTurn()))
    );
  }
  return null;
}

type Act = (key: string, wait: WaitKind, run: () => void) => BotAction | null;

// ------------------------------------------------------------------
// Buying, auctions, force-buy
// ------------------------------------------------------------------

interface Worth {
  // Most the deed is worth to us (deed value + strategy + denial).
  worth: number;
  // Wins us the game, or stops an opponent from winning with it.
  critical: boolean;
}

function deedWorth(c: Ctx, i: number): Worth {
  const { view, ctx, state, me } = c;
  if (ctx.specialVictory && winsWith(view, i, me.playerId)) return { worth: Infinity, critical: true };
  let denial = 0;
  let blocks = false;
  for (const o of state.players) {
    if (o.isBankrupt || o.playerId === me.playerId) continue;
    if (ctx.specialVictory && winsWith(view, i, o.playerId)) blocks = true;
    const after = cloneView(view);
    after.owner[i] = o.playerId;
    denial = Math.max(denial, strategic(after, o.playerId, ctx) - strategic(view, o.playerId, ctx));
  }
  const worth = gainFrom(view, i, me.playerId, ctx) + 0.6 * denial;
  return blocks ? { worth: Math.max(worth, me.money), critical: true } : { worth, critical: false };
}

function decideBuy(c: Ctx, act: Act): BotAction | null {
  const offer = c.state.buyOffer!;
  const { worth, critical } = deedWorth(c, offer.tileIndex);
  const reserve = cashReserve(c.state, c.me);
  const left = c.me.money - offer.price;
  // Every deed here can be built on, so buying is usually right: pass only
  // when it would leave us too short for the rent ahead.
  const buy =
    left >= 0 && (critical || (worth >= offer.price && (left >= reserve || worth - offer.price > 150)));
  return act(`buy:${offer.tileIndex}:${buy}`, 'think', () => c.engine.respondToBuyOffer(buy));
}

function decideBid(c: Ctx, act: Act): BotAction | null {
  const a = c.state.auction!;
  if (a.highBidderId === c.me.playerId) return null;
  if (Date.now() > a.endsAt) return null;
  const { worth, critical } = deedWorth(c, a.tileIndex);
  const reserve = cashReserve(c.state, c.me);
  const cap = critical ? c.me.money : c.me.money - Math.round(reserve * 0.8);
  // Unless the deed decides the game, never pay far over the list price.
  const ceiling = critical ? Infinity : c.view.board.tiles[a.tileIndex].price * MAX_OVERPAY;
  const limit = Math.floor(Math.min(worth, cap, ceiling));
  const minBid = a.highBid + AUCTION_MIN_INCREMENT;
  if (minBid > limit) {
    // Worth fighting for but short of cash: mortgage something else.
    if (critical && minBid <= worth && c.me.money < minBid) return raiseCash(c, act, a.tileIndex);
    return null;
  }
  // Far from our limit: jump part of the way (like people do, and so two
  // bots don't crawl up $10 at a time). Close to it: the minimum raise.
  const room = limit - minBid;
  const jump = room > 60 ? Math.round((room * (0.15 + Math.random() * 0.25)) / 10) * 10 : 0;
  const bid = Math.min(limit, minBid + jump);
  // Keyed by the price we are answering, not our (random) amount, so the
  // re-check before acting sees the same decision.
  return act(`bid:${a.tileIndex}:${a.highBid}`, 'auction', () => c.engine.placeBid(c.me.playerId, bid));
}

// One voluntary mortgage (per-round cap) of the deed we miss least.
function raiseCash(c: Ctx, act: Act, keep: number): BotAction | null {
  if ((c.me.mortgagesThisRound ?? 0) >= MAX_MORTGAGES_PER_ROUND) return null;
  const best = mortgageCandidates(c)
    .filter((m) => m.tileIndex !== keep)
    .sort((x, y) => x.loss / x.gain - y.loss / y.gain)[0];
  if (!best) return null;
  return act(`raise:${best.tileIndex}`, 'quick', () => c.engine.mortgage(best.tileIndex, true, c.me.playerId));
}

function decideForceBuy(c: Ctx, act: Act): BotAction | null {
  const offer = c.state.forceBuyOffer!;
  const { view, ctx, me } = c;
  const i = offer.tileIndex;
  const price = offer.price;
  let accept: boolean;
  if (ctx.specialVictory && winsWith(view, i, me.playerId)) {
    accept = me.money >= price;
  } else {
    const after = cloneView(view);
    after.owner[i] = me.playerId;
    after.money[me.playerId] -= price;
    after.money[offer.targetPlayerId] = (after.money[offer.targetPlayerId] ?? 0) + price;
    const mine = strength(after, me.playerId, ctx) - strength(view, me.playerId, ctx);
    const theirs = strength(after, offer.targetPlayerId, ctx) - strength(view, offer.targetPlayerId, ctx);
    // Good for us, and better for us than for the player we take it from.
    const score = mine - theirs / ctx.opponents;
    accept = score > 0 && me.money - price >= cashReserve(c.state, me) * 0.5;
  }
  return act(`force:${i}:${accept}`, 'think', () => c.engine.respondToForceBuy(accept));
}

// ------------------------------------------------------------------
// Debt: raise the cash giving up as little as possible
// ------------------------------------------------------------------

interface CashStep {
  tileIndex: number;
  kind: 'sell' | 'mortgage' | 'sellDeed';
  gain: number;
  loss: number;
}

function mortgageCandidates(c: Ctx): CashStep[] {
  const { view, ctx, me, state } = c;
  const out: CashStep[] = [];
  for (let i = 0; i < view.board.size; i++) {
    if (view.owner[i] !== me.playerId || view.mortgaged[i] || view.level[i] > 0) continue;
    if (mortgageBlockReason(state, me.playerId, i)) continue;
    const after = cloneView(view);
    after.mortgaged[i] = true;
    const loss = strength(view, me.playerId, ctx) - strength(after, me.playerId, ctx) + mortgageValue(view.board, i);
    out.push({ tileIndex: i, kind: 'mortgage', gain: mortgageValue(view.board, i), loss: Math.max(1, loss) });
  }
  return out;
}

function cashSteps(c: Ctx): CashStep[] {
  const { view, ctx, me, state } = c;
  const steps = mortgageCandidates(c);
  for (let i = 0; i < view.board.size; i++) {
    if (view.owner[i] !== me.playerId) continue;
    const tile = view.board.tiles[i];
    const lvl = view.level[i];
    if (lvl > 0 && tile.buildCost > 0) {
      // Selling the top level; a Landmark also loses its force-buy immunity.
      const loss = income(view, i, ctx, lvl) - income(view, i, ctx, lvl - 1) + (lvl === 4 ? 60 : 0);
      steps.push({ tileIndex: i, kind: 'sell', gain: Math.floor(tile.buildCost / 2), loss: Math.max(1, loss) });
    } else if (lvl === 0 && !view.mortgaged[i] && mortgageBlockReason(state, me.playerId, i)) {
      // Can't mortgage (someone else has buildings in the set): sell the deed.
      const after = cloneView(view);
      after.owner[i] = null;
      const loss = strength(view, me.playerId, ctx) - strength(after, me.playerId, ctx);
      steps.push({ tileIndex: i, kind: 'sellDeed', gain: mortgageValue(view.board, i), loss: Math.max(1, loss) });
    }
  }
  return steps;
}

function decideDebt(c: Ctx, act: Act): BotAction | null {
  const { me, state, engine } = c;
  const debt = state.debt!;
  const bankrupt = () => act('bankrupt', 'think', () => engine.declareBankruptcy());
  if (me.money + liquidationValue(state, me.playerId) < debt.amount) return bankrupt();
  const steps = cashSteps(c).filter((s) => !c.mem.failed.has(`debt:${s.kind}:${s.tileIndex}`));
  if (!steps.length) return bankrupt();
  const short = debt.amount - me.money;
  // Cheapest loss per dollar; a step that covers the rest on its own wins
  // ties so we don't sell more than needed.
  steps.sort((a, b) => a.loss / Math.min(a.gain, short) - b.loss / Math.min(b.gain, short));
  const s = steps[0];
  const run =
    s.kind === 'sell'
      ? () => engine.sell(s.tileIndex, me.playerId)
      : s.kind === 'mortgage'
        ? () => engine.mortgage(s.tileIndex, true, me.playerId)
        : () => engine.sellProperty(s.tileIndex, me.playerId);
  return act(`debt:${s.kind}:${s.tileIndex}`, 'quick', run);
}

// ------------------------------------------------------------------
// Our own turn
// ------------------------------------------------------------------

function decideJailOrRoll(c: Ctx, act: Act): BotAction | null {
  const { me, engine, state } = c;
  const roll = act('roll', 'roll', () => {
    const dice = engine.rollDice();
    engine.options.onDice?.(dice);
  });
  if (!me.inJail) return roll;
  // Jail is a safe place once the board is full of rent; early on, get out
  // and buy things.
  const unowned = c.view.board.tiles.filter((t) => t.price > 0 && !state.properties[t.index]?.ownerId).length;
  const risky = nextRollDanger(state, me).expected > 60 || (unowned < 6 && boardDanger(state, me) > 25);
  if (risky) return roll;
  if (me.jailCards > 0) return act('jailCard', 'think', () => engine.useJailCard()) ?? roll;
  if (me.money - JAIL_FINE >= cashReserve(state, me)) return act('jailPay', 'think', () => engine.payJailFine()) ?? roll;
  return roll;
}

function decideUnmortgage(c: Ctx, act: Act): BotAction | null {
  const { view, ctx, me, state, engine } = c;
  const reserve = cashReserve(state, me);
  let best: { i: number; score: number } | null = null;
  for (let i = 0; i < view.board.size; i++) {
    if (view.owner[i] !== me.playerId || !view.mortgaged[i]) continue;
    const cost = unmortgageCost(view.board, i);
    if (me.money < cost) continue;
    const after = cloneView(view);
    after.mortgaged[i] = false;
    // Lifting it wins the game (mortgaged deeds don't count for victories).
    if (ctx.specialVictory && winDistance(after, me.playerId) <= 0) {
      return act(`unmortgage:${i}`, 'think', () => engine.mortgage(i, false, me.playerId));
    }
    const prop = state.properties[i];
    const atRisk = prop.mortgagedAtLap !== undefined && me.lapsCompleted - prop.mortgagedAtLap >= FORECLOSURE_ROUNDS - 1;
    const left = me.money - cost;
    if (atRisk ? left < reserve * 0.5 : left < reserve + 150) continue;
    const score = (strength(after, me.playerId, ctx) - strength(view, me.playerId, ctx) + cost) / cost + (atRisk ? 10 : 0);
    if (!best || score > best.score) best = { i, score };
  }
  if (!best) return null;
  const i = best.i;
  return act(`unmortgage:${i}`, 'think', () => engine.mortgage(i, false, me.playerId));
}

function decideBuild(c: Ctx, act: Act): BotAction | null {
  const { view, ctx, me, state, engine } = c;
  const reserve = cashReserve(state, me);
  const spree = me.position === GO_TILE_INDEX;
  const tiles = spree ? view.owner.flatMap((o, i) => (o === me.playerId ? [i] : [])) : [me.position];
  let best: { i: number; score: number } | null = null;
  for (const i of tiles) {
    if (buildBlockReason(state, me, i)) continue;
    const cost = effectiveBuildCost(state, i);
    if (me.money - cost < reserve * BUILD_RESERVE) continue;
    const lvl = view.level[i];
    // Building on raw land makes it force-buyable ('developed' mode): never
    // hand an opponent the deed that would win them the game.
    if (c.forceBuyMode === 'developed' && lvl === 0 && exposesWin(c, i, 1)) continue;
    const gain = income(view, i, ctx, lvl + 1) - income(view, i, ctx, lvl);
    const score = gain / cost + (lvl + 1 === 4 ? 0.3 : 0);
    if (!best || score > best.score) best = { i, score };
  }
  if (!best) return null;
  const i = best.i;
  return act(`build:${i}:${view.level[i]}`, 'quick', () => engine.build(i));
}

function exposesWin(c: Ctx, i: number, level: number): boolean {
  if (!c.ctx.specialVictory || c.forceBuyMode === 'off') return false;
  const price = calculateForceBuyPrice(c.view.board, i, level);
  return c.state.players.some(
    (o) => !o.isBankrupt && o.playerId !== c.me.playerId && o.money >= price && winsWith(c.view, i, o.playerId)
  );
}

// ------------------------------------------------------------------
// Trades
// ------------------------------------------------------------------

interface TradeEffect {
  dFrom: number;
  dTo: number;
  after: View;
}

function tradeEffect(c: Ctx, t: Omit<TradeOffer, 'id' | 'createdAt'>): TradeEffect {
  const { view, ctx, state } = c;
  const after = cloneView(view);
  const feesFrom = tradeMortgageFees(state, t.getProps);
  const feesTo = tradeMortgageFees(state, t.giveProps);
  after.money[t.fromId] = (after.money[t.fromId] ?? 0) - t.giveMoney + t.getMoney - feesFrom;
  after.money[t.toId] = (after.money[t.toId] ?? 0) + t.giveMoney - t.getMoney - feesTo;
  for (const i of t.giveProps) after.owner[i] = t.toId;
  for (const i of t.getProps) after.owner[i] = t.fromId;
  return {
    dFrom: strength(after, t.fromId, ctx) - strength(view, t.fromId, ctx),
    dTo: strength(after, t.toId, ctx) - strength(view, t.toId, ctx),
    after
  };
}

function decideTradeReply(c: Ctx, t: TradeOffer, act: Act): BotAction | null {
  const { engine, me, ctx, mem } = c;
  const decline = act(`trade:${t.id}`, 'trade', () => engine.respondToTrade(t.id, me.playerId, false));
  const { dFrom, dTo, after } = tradeEffect(c, t);
  // Never hand anyone the game.
  if (ctx.specialVictory && winDistance(after, t.fromId) <= 0) return decline;
  const w = rivalWeight(ctx);
  // Paying cash that leaves us unable to cover rent counts against the deal.
  const cushion = cashReserve(c.state, me) * 0.5;
  const cashAfter = after.money[me.playerId] ?? 0;
  const short = cashAfter < me.money ? Math.max(0, cushion - cashAfter) : 0;
  const score = dTo - short - w * Math.max(0, dFrom);
  if (score >= TRADE_MARGIN) {
    return act(`trade:${t.id}`, 'trade', () => engine.respondToTrade(t.id, me.playerId, true));
  }
  // Close enough: ask for a bit more cash instead of a flat no.
  const extra = round10((TRADE_MARGIN - dTo + short + w * dFrom) / (1 + w));
  const from = c.state.players.find((p) => p.playerId === t.fromId);
  const theyCanPay = !!from && from.money - t.giveMoney - tradeMortgageFees(c.state, t.getProps) >= extra;
  if ((t.round ?? 1) < MAX_COUNTER_ROUND && !mem.countered.has(t.id) && extra > 0 && dFrom - extra >= 0 && theyCanPay) {
    const fromMine = Math.min(extra, t.getMoney);
    const proposal: TradeProposal = {
      toId: t.fromId,
      giveMoney: t.getMoney - fromMine,
      giveProps: t.getProps,
      getMoney: t.giveMoney + (extra - fromMine),
      getProps: t.giveProps,
      message: `Add $${extra} and it's a deal.`
    };
    return act(`trade:${t.id}`, 'trade', () => {
      mem.countered.add(t.id);
      const offer = engine.counterTrade(t.id, me.playerId, proposal);
      mem.countered.add(offer.id);
      mem.sentTrades.set(offer.id, c.state.turnNumber);
    });
  }
  return decline;
}

function cancelStaleOffers(c: Ctx, act: Act): BotAction | null {
  const { mem, state, engine, me } = c;
  for (const [id, turn] of mem.sentTrades) {
    if (!state.trades.some((t) => t.id === id)) {
      mem.sentTrades.delete(id);
      continue;
    }
    if (state.turnNumber - turn >= STALE_OFFER_TURNS * state.players.length) {
      mem.sentTrades.delete(id);
      return act(`cancel:${id}`, 'quick', () => engine.cancelTrade(id, me.playerId));
    }
  }
  return null;
}

/**
 * Looks for a deed an opponent owns that would complete one of our sets (or
 * bring a special victory close) and offers cash, or a swap plus cash, that
 * we still come out ahead on.
 */
function decideProposal(c: Ctx, act: Act): BotAction | null {
  const { state, me, view, ctx, mem, engine } = c;
  if (state.turnNumber - mem.lastProposalTurn < PROPOSAL_EVERY_TURNS * state.players.length) return null;
  if (state.trades.some((t) => t.fromId === me.playerId)) return null;
  const reserve = cashReserve(state, me);
  const w = rivalWeight(ctx);
  let best: { proposal: TradeProposal; score: number; key: string } | null = null;

  const consider = (proposal: TradeProposal, key: string) => {
    const { dFrom, dTo, after } = tradeEffect(c, { ...proposal, fromId: me.playerId });
    if (ctx.specialVictory && winDistance(after, proposal.toId) <= 1 && winDistance(view, proposal.toId) > 1) return;
    // It has to look good to them too, or nobody accepts.
    if (dTo < 20) return;
    const score = dFrom - w * dTo;
    if (score < TRADE_MARGIN) return;
    if (!best || score > best.score) best = { proposal, score, key };
  };

  for (let i = 0; i < view.board.size; i++) {
    const owner = view.owner[i];
    if (!owner || owner === me.playerId || view.board.tiles[i].price <= 0) continue;
    const them = state.players.find((p) => p.playerId === owner);
    if (!them || them.isBankrupt) continue;
    const key = `${owner}:${i}`;
    if ((mem.proposalCooldown.get(key) ?? -1) > state.turnNumber) continue;
    const after = cloneView(view);
    after.owner[i] = me.playerId;
    const strat = strategic(after, me.playerId, ctx) - strategic(view, me.playerId, ctx);
    if (strat < 120) continue; // only deeds that really matter to us

    // Their loss in deed terms, so the cash looks fair to them.
    const theirLoss = strength(view, owner, ctx) - strength(after, owner, ctx);
    const cash = round10(Math.max(0, theirLoss) * 1.15 + 20);
    if (me.money - cash >= reserve * 0.5) {
      consider({ toId: owner, giveMoney: cash, giveProps: [], getMoney: 0, getProps: [i], message: `Sell me ${view.board.tiles[i].name}?` }, key);
    }
    // A swap: one of our deeds they'd like, balanced with cash.
    for (let s = 0; s < view.board.size; s++) {
      if (view.owner[s] !== me.playerId || view.level[s] > 0) continue;
      const swap = { toId: owner, giveMoney: 0, giveProps: [s], getMoney: 0, getProps: [i] };
      const { dTo } = tradeEffect(c, { ...swap, fromId: me.playerId });
      const top = Math.max(0, round10(25 - dTo));
      if (top > 0 && me.money - top < reserve * 0.5) continue;
      consider({ ...swap, giveMoney: top, message: `${view.board.tiles[s].name} for ${view.board.tiles[i].name}?` }, key);
    }
  }
  if (!best) return null;
  const { proposal, key } = best as { proposal: TradeProposal; key: string };
  return act(`propose:${key}`, 'think', () => {
    mem.lastProposalTurn = state.turnNumber;
    mem.proposalCooldown.set(key, state.turnNumber + 12 * state.players.length);
    const offer = engine.proposeTrade(me.playerId, proposal);
    mem.sentTrades.set(offer.id, state.turnNumber);
  });
}
