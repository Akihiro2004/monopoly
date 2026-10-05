import { BoardId, Seat, buildBlockReason, effectiveBuildCost, ForceBuyMode } from '@monopoly/shared';
import { MonopolyGameEngine } from '../src/engine/game.js';
import { BotDriver } from '../src/bots/driver.js';

// Headless games for tests and tuning: smart bots (isBot seats, played by
// the real BotDriver) against "naive" seats that buy whatever they can,
// build when they can, never bid and decline every trade.

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
const TOKENS = ['car', 'hat', 'dog', 'ship', 'thimble', 'boot'] as const;

export interface SimOptions {
  kinds: ('smart' | 'naive')[];
  specialVictory?: boolean;
  randomEvents?: boolean;
  forceBuyMode?: ForceBuyMode;
  boardId?: BoardId;
  maxActions?: number;
}

export interface SimResult {
  winnerId: string | null;
  winnerKind: 'smart' | 'naive' | null;
  victoryType: string | null;
  turns: number;
  actions: number;
  stalled: string | null;
}

export function simulate(opts: SimOptions): SimResult {
  const seats: Seat[] = opts.kinds.map((kind, i) => ({
    seatIndex: i,
    playerId: `${kind}${i}`,
    displayName: `${kind}${i}`,
    color: COLORS[i],
    tokenType: TOKENS[i],
    isReady: true,
    isConnected: true,
    isHost: i === 0,
    ...(kind === 'smart' ? { isBot: true } : {})
  }));
  const engine = new MonopolyGameEngine('sim', seats, {
    specialVictory: opts.specialVictory ?? true,
    randomEvents: opts.randomEvents ?? false,
    forceBuyMode: opts.forceBuyMode ?? 'developed',
    boardId: opts.boardId
  });
  const driver = new BotDriver(engine, { instant: true });
  const max = opts.maxActions ?? 20000;
  let actions = 0;
  let stalled: string | null = null;

  try {
    while (engine.state.phase !== 'GAME_OVER' && actions < max) {
      actions++;
      const st = engine.state;
      const cur = engine.getCurrentPlayer();
      const bot = driver.next();
      if (bot) {
        driver.run(bot);
        continue;
      }
      // Naive seats decline offers sent to them.
      const toNaive = st.trades.find((t) => !st.players.find((p) => p.playerId === t.toId)?.isBot);
      if (toNaive) {
        engine.respondToTrade(toNaive.id, toNaive.toId, false);
        continue;
      }
      if (st.phase === 'AUCTION') {
        engine.finishAuction();
        continue;
      }
      if (cur.isBot) {
        stalled = `bot ${cur.playerId} has nothing to do in ${st.phase}`;
        break;
      }
      naiveStep(engine);
    }
  } finally {
    engine.dispose();
    driver.dispose();
  }
  if (!stalled && engine.state.phase !== 'GAME_OVER') stalled = `no winner after ${max} actions`;
  const winnerId = engine.state.winnerId;
  const winner = engine.state.players.find((p) => p.playerId === winnerId);
  return {
    winnerId,
    winnerKind: winner ? (winner.isBot ? 'smart' : 'naive') : null,
    victoryType: engine.state.victoryType,
    turns: engine.state.turnNumber,
    actions,
    stalled
  };
}

function naiveStep(engine: MonopolyGameEngine): void {
  const st = engine.state;
  const me = engine.getCurrentPlayer();
  switch (st.phase) {
    case 'ROLLING':
      engine.rollDice();
      return;
    case 'BUY_OFFER':
      engine.respondToBuyOffer(me.money >= st.buyOffer!.price);
      return;
    case 'FORCE_BUY_OFFER':
      engine.respondToForceBuy(false);
      return;
    case 'DEBT':
      engine.onTurnTimeout(); // the server's own auto-settle
      return;
    case 'TURN_ENDED': {
      const i = me.position;
      if (!buildBlockReason(st, me, i) && me.money - effectiveBuildCost(st, i) >= 150) {
        engine.build(i);
        return;
      }
      engine.endTurn();
      return;
    }
    default:
      throw new Error(`naive player stuck in ${st.phase}`);
  }
}
