import { BoardDef } from '@monopoly/shared';
import type { MonopolyGameEngine } from '../engine/game.js';
import { BotAction, BotMemory, WaitKind, decide, newMemory } from './brain.js';

// Plays every bot seat of one game. After each state change it asks the
// brain what the next bot action is, waits a human-looking moment (and for
// the dice / token animation on screen), re-checks, and runs it. Bots pause
// while no human is connected, and resume when someone comes back.

export interface BotDriverOptions {
  // Tests: act immediately, and even with nobody watching.
  instant?: boolean;
}

const WAIT_MS: Record<WaitKind, [number, number]> = {
  roll: [1100, 1900],
  think: [900, 1700],
  quick: [450, 800],
  auction: [900, 2200],
  trade: [2200, 4200]
};

const STEP_MS = 170; // client: one tile hop
const DICE_MS = 1400;
const CARD_MS = 2600;
const GLIDE_MS = 900;
const HEARTBEAT_MS = 3000;

export class BotDriver {
  private memory = new Map<string, BotMemory>();
  private timer: NodeJS.Timeout | null = null;
  private planned: string | null = null;
  private heartbeat: NodeJS.Timeout | null = null;
  private lastSeq: number | null = null;
  private animUntil = 0;
  private disposed = false;

  constructor(
    private engine: MonopolyGameEngine,
    private options: BotDriverOptions = {}
  ) {
    this.lastSeq = engine.state.lastMove?.seq ?? null;
    if (!options.instant) {
      this.heartbeat = setInterval(() => this.poke(false), HEARTBEAT_MS);
      this.heartbeat.unref?.();
    }
  }

  /** Call on every engine state change. */
  public onState(): void {
    const move = this.engine.state.lastMove;
    if (move && move.seq !== this.lastSeq) {
      this.lastSeq = move.seq;
      this.animUntil = Date.now() + animationMs(this.engine.board, move);
    }
    this.poke(true);
  }

  /** The next action any bot wants to take (null = nothing to do). */
  public next(): BotAction | null {
    const st = this.engine.state;
    if (st.phase === 'GAME_OVER') return null;
    // The bot whose turn it is first, then the others (auctions, trades).
    const current = this.engine.getCurrentPlayer()?.playerId;
    const bots = st.players
      .filter((p) => p.isBot && !p.isBankrupt)
      .sort((a, b) => Number(b.playerId === current) - Number(a.playerId === current));
    for (const bot of bots) {
      const action = decide(this.engine, bot.playerId, this.memoryOf(bot.playerId));
      if (action) return action;
    }
    return null;
  }

  /** Runs one action; a failure is remembered so it isn't retried this turn. */
  public run(action: BotAction): void {
    try {
      action.run();
    } catch (e) {
      const mem = this.memoryOf(action.botId);
      mem.failed.add(action.key);
      if (process.env.BOT_DEBUG) console.warn(`[bot] ${action.key} failed:`, (e as Error).message);
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.clear();
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private memoryOf(botId: string): BotMemory {
    let mem = this.memory.get(botId);
    if (!mem) this.memory.set(botId, (mem = newMemory()));
    return mem;
  }

  private humansOnline(): boolean {
    return this.engine.state.players.some((p) => !p.isBot && p.isConnected);
  }

  private clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.planned = null;
  }

  // `changed`: the state moved, so re-plan; heartbeats only fill gaps.
  private poke(changed: boolean): void {
    if (this.disposed || this.options.instant) return;
    if (!this.humansOnline()) return this.clear();
    const action = this.next();
    if (!action) return this.clear();
    const key = `${action.botId}:${action.key}`;
    if (this.timer && (!changed || this.planned === key)) return;
    this.clear();
    this.planned = key;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.planned = null;
      if (this.disposed) return;
      const now = this.next();
      // Something else came up meanwhile: plan again from scratch.
      if (!now || `${now.botId}:${now.key}` !== key) return this.poke(true);
      this.run(now);
      this.poke(false);
    }, this.delayFor(action.wait));
    this.timer.unref?.();
  }

  private delayFor(wait: WaitKind): number {
    const [lo, hi] = WAIT_MS[wait];
    let ms = lo + Math.random() * (hi - lo);
    ms = Math.max(ms, this.animUntil - Date.now() + (wait === 'roll' ? 300 : 0));
    // Bids must land before the hammer falls.
    const auction = this.engine.state.auction;
    if (wait === 'auction' && auction) ms = Math.min(ms, auction.endsAt - Date.now() - 900);
    return Math.max(150, Math.round(ms));
  }
}

/** How long the client animates a dice move (walk, card, follow-up move). */
function animationMs(board: BoardDef, move: { from: number; landed: number; to: number }): number {
  const steps = (move.landed - move.from + board.size) % board.size;
  const tile = board.tiles[move.landed];
  const card = tile?.type === 'chance' || tile?.type === 'chest' ? CARD_MS : 0;
  const glide = move.to !== move.landed ? GLIDE_MS : 0;
  return Math.min(9000, DICE_MS + steps * STEP_MS + card + glide);
}
