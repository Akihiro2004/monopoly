import {
  BoardDef,
  GameState,
  PlayerState,
  boardOf,
  liquidationValue,
  unmortgageCost
} from '@monopoly/shared';
import { calculateRent } from '../engine/rent.js';

// How a bot judges a position. Everything is in dollars so cash, deeds and
// strategy can be weighed against each other: "what is this player's
// position worth", and every decision (buy, bid, force-buy, trade, build)
// compares that number before and after.

/** A light, cloneable copy of who owns what (for "what if" questions). */
export interface View {
  board: BoardDef;
  owner: (string | null)[];
  level: number[];
  mortgaged: boolean[];
  money: Record<string, number>;
}

export interface EvalCtx {
  board: BoardDef;
  specialVictory: boolean;
  // Opponents still playing (rent comes from them).
  opponents: number;
}

export const WIN_SCORE = 1_000_000;

// A given opponent lands on a given tile about once a lap (board size).
const landP = (board: BoardDef) => 1.04 / board.size;
// Toll gates also charge everyone driving past: about 7 tiles of traffic.
const TOLL_TRAFFIC = 7;
// Opponent turns a deed is expected to keep earning over.
const HORIZON = 25;
// Building on any deed you land on is allowed here, so every deed carries
// part of its future hotel income.
const DEVELOP_SHARE = 0.25;
// Tiles right after Jail see more traffic.
const TRAFFIC: Record<string, number> = { orange: 1.2, red: 1.12, pink: 1.05 };


export function viewOf(state: GameState): View {
  const board = boardOf(state);
  const owner: (string | null)[] = [];
  const level: number[] = [];
  const mortgaged: boolean[] = [];
  for (let i = 0; i < board.size; i++) {
    const p = state.properties[i];
    owner.push(p?.ownerId ?? null);
    level.push(p?.buildLevel ?? 0);
    mortgaged.push(!!p?.isMortgaged);
  }
  const money: Record<string, number> = {};
  for (const pl of state.players) money[pl.playerId] = pl.isBankrupt ? 0 : pl.money;
  return { board, owner, level, mortgaged, money };
}

export function cloneView(v: View): View {
  return { board: v.board, owner: [...v.owner], level: [...v.level], mortgaged: [...v.mortgaged], money: { ...v.money } };
}

export function ctxOf(state: GameState, specialVictory: boolean): EvalCtx {
  const active = state.players.filter((p) => !p.isBankrupt).length;
  return { board: boardOf(state), specialVictory, opponents: Math.max(1, active - 1) };
}

/** Rent the owner of tile `i` collects (dice total 7), ignoring events. */
export function viewRent(v: View, i: number, level = v.level[i]): number {
  const board = v.board;
  const tile = board.tiles[i];
  const owner = v.owner[i];
  if (!owner || v.mortgaged[i]) return 0;
  if (tile.type === 'railroad') {
    const n = board.railroads.filter((r) => v.owner[r] === owner && !v.mortgaged[r]).length;
    return 25 * Math.pow(2, Math.max(0, n - 1));
  }
  if (tile.type === 'utility') {
    const n = board.utilities.filter((u) => v.owner[u] === owner && !v.mortgaged[u]).length;
    return 7 * (n >= 2 ? 10 : 4);
  }
  if (tile.type === 'toll') {
    const n = board.tolls.filter((t) => v.owner[t] === owner && !v.mortgaged[t]).length;
    const fees = tile.rentByLevel;
    return fees[Math.min(Math.max(n, 1), fees.length) - 1] || fees[0];
  }
  const base = tile.rentByLevel[level] ?? tile.rentByLevel[0];
  if (level === 0 && (board.groups[tile.group] ?? []).every((g) => v.owner[g] === owner)) return base * 2;
  return base;
}

/** Expected rent a deed earns over the planning horizon. */
export function income(v: View, i: number, ctx: EvalCtx, level = v.level[i]): number {
  const tile = v.board.tiles[i];
  const traffic = tile.type === 'toll' ? TOLL_TRAFFIC : (TRAFFIC[tile.group] ?? 1);
  return viewRent(v, i, level) * landP(v.board) * ctx.opponents * HORIZON * traffic;
}

function developValue(i: number, ctx: EvalCtx): number {
  const tile = ctx.board.tiles[i];
  if (tile.type !== 'property') return 0;
  const traffic = TRAFFIC[tile.group] ?? 1;
  return tile.rentByLevel[3] * landP(ctx.board) * ctx.opponents * HORIZON * traffic * DEVELOP_SHARE;
}

/**
 * How far `pid` is from a special victory, in "deeds still to get":
 * an unowned deed counts 1, an opponent's color deed 1.6 (needs a trade or a
 * force-buy), an opponent's airport / utility 2.5 (trade only), and an own
 * mortgaged deed 0.3 (just lift the mortgage). 0 = has won.
 */
export function winDistance(v: View, pid: string): number {
  const cost = (i: number) => {
    const o = v.owner[i];
    if (o === pid) return v.mortgaged[i] ? 0.3 : 0;
    if (o === null) return 1;
    return v.board.tiles[i].type === 'property' ? 1.6 : 2.5;
  };
  const sum = (list: number[]) => list.reduce((s, i) => s + cost(i), 0);
  const line = Math.min(...v.board.sides.map(sum));
  const sets = Object.values(v.board.groups)
    .map(sum)
    .sort((a, b) => a - b);
  const triple = sets[0] + sets[1] + sets[2];
  return Math.min(line, triple);
}

export function victoryScore(v: View, pid: string, ctx: EvalCtx): number {
  if (!ctx.specialVictory) return 0;
  const d = winDistance(v, pid);
  if (d <= 0) return WIN_SCORE;
  return Math.min(3000, 1200 / (d * d));
}

// Sets, airports and utilities are worth more together than apart.
function synergy(v: View, pid: string): number {
  let s = 0;
  const board = v.board;
  for (const group of Object.values(board.groups)) {
    const n = group.length;
    const mine = group.filter((i) => v.owner[i] === pid).length;
    if (!mine) continue;
    const others = group.filter((i) => v.owner[i] !== null && v.owner[i] !== pid).length;
    const worth = group.reduce((sum, i) => sum + board.tiles[i].price, 0);
    if (mine === n) s += worth * 0.6;
    else if (others === 0) s += worth * 0.3 * Math.pow(mine / (n - 1), 2);
    else s += worth * 0.08 * mine;
  }
  const rails = board.railroads.filter((i) => v.owner[i] === pid).length;
  s += [0, 0, 40, 120, 300][rails] ?? 300;
  if (board.utilities.length && board.utilities.every((i) => v.owner[i] === pid)) s += 50;
  if (board.tolls.length > 1 && board.tolls.every((i) => v.owner[i] === pid)) s += 60;
  return s;
}

/** Value of one owned deed (land, buildings, earnings, potential). */
export function deedValue(v: View, i: number, ctx: EvalCtx): number {
  const tile = v.board.tiles[i];
  if (v.mortgaged[i]) return tile.price + developValue(i, ctx) - unmortgageCost(v.board, i);
  return tile.price + developValue(i, ctx) + v.level[i] * tile.buildCost * 0.5 + income(v, i, ctx);
}

/** Everything `pid` has, in dollars: cash + deeds + set synergy + victory. */
export function strength(v: View, pid: string, ctx: EvalCtx): number {
  let s = v.money[pid] ?? 0;
  for (let i = 0; i < v.board.size; i++) if (v.owner[i] === pid) s += deedValue(v, i, ctx);
  return s + synergy(v, pid) + victoryScore(v, pid, ctx);
}

/** The strategic part only (synergy + victory), for "what does deed X add". */
export function strategic(v: View, pid: string, ctx: EvalCtx): number {
  return synergy(v, pid) + victoryScore(v, pid, ctx);
}

/** How much `pid`'s position improves if they get deed `i` for free. */
export function gainFrom(v: View, i: number, pid: string, ctx: EvalCtx): number {
  const before = strength(v, pid, ctx);
  const after = cloneView(v);
  after.owner[i] = pid;
  return strength(after, pid, ctx) - before;
}

/** Would `pid` win outright by owning deed `i` (unmortgaged)? */
export function winsWith(v: View, i: number, pid: string): boolean {
  const after = cloneView(v);
  after.owner[i] = pid;
  after.mortgaged[i] = false;
  return winDistance(after, pid) <= 0;
}

// ------------------------------------------------------------------
// Danger: what landing around the board could cost
// ------------------------------------------------------------------

const DICE_P = (d: number) => (6 - Math.abs(d - 7)) / 36;

/** Rent / tax `me` would pay landing on tile `i` right now. */
export function costOfLanding(state: GameState, me: PlayerState, i: number): number {
  const tile = boardOf(state).tiles[i];
  if (tile.type === 'tax') return tile.rentByLevel[0];
  const p = state.properties[i];
  if (!p?.ownerId || p.ownerId === me.playerId) return 0;
  return calculateRent(state, i, 7);
}

/** Worst and expected cost of the next roll from `me`'s position. */
export function nextRollDanger(state: GameState, me: PlayerState): { worst: number; expected: number } {
  const size = boardOf(state).size;
  let worst = 0;
  let expected = 0;
  for (let d = 2; d <= 12; d++) {
    const c = costOfLanding(state, me, (me.position + d) % size);
    worst = Math.max(worst, c);
    expected += DICE_P(d) * c;
  }
  return { worst, expected };
}

/** Average rent per turn around the whole board (for a lap's worth of risk). */
export function boardDanger(state: GameState, me: PlayerState): number {
  const size = boardOf(state).size;
  let total = 0;
  for (let i = 0; i < size; i++) total += costOfLanding(state, me, i);
  return total / size;
}

/**
 * Cash the bot wants to keep on hand: enough for the likely rent ahead, less
 * whatever it could raise by mortgaging bare land in a pinch.
 */
export function cashReserve(state: GameState, me: PlayerState): number {
  const { worst } = nextRollDanger(state, me);
  const lap = boardDanger(state, me) * 6;
  const liquid = liquidationValue(state, me.playerId);
  const want = Math.max(worst * 0.6, lap) - liquid * 0.25;
  return Math.round(Math.min(700, Math.max(60, want)));
}
