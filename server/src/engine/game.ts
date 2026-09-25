import {
  BOARD_TILES,
  CHANCE_CARDS,
  CHEST_CARDS,
  GO_SALARY,
  JAIL_FINE,
  JAIL_TILE_INDEX,
  STARTING_MONEY,
  CardDef,
  CardDraw,
  DebtOffer,
  GameState,
  PlayerState,
  PropertyState,
  Seat,
  TradeOffer,
  TradeProposal,
  tradeBlockReason
} from '@monopoly/shared';
import { executeForceBuy } from './forceBuy.js';
import { buildProperty, sellBuilding, toggleMortgage } from './actions.js';
import { applyBankruptcy, calculateRent, payRent } from './rent.js';
import { resolveLanding } from './resolve.js';
import { checkVictory } from './victory.js';

export interface GameEngineOptions {
  specialVictory: boolean;
  onStateChange?: (state: GameState) => void;
  onToast?: (toast: { text: string; type?: 'info' | 'success' | 'warning' | 'danger' }) => void;
  onCard?: (draw: CardDraw) => void;
}

export class MonopolyGameEngine {
  public state: GameState;
  public options: GameEngineOptions;
  private chanceDeck: CardDef[];
  private chestDeck: CardDef[];
  private forceBuyTimer: NodeJS.Timeout | null = null;

  constructor(roomId: string, seats: Seat[], options: GameEngineOptions) {
    this.options = options;

    const players: PlayerState[] = seats.map((seat) => ({
      playerId: seat.playerId,
      seatIndex: seat.seatIndex,
      name: seat.displayName,
      color: seat.color,
      tokenType: seat.tokenType,
      money: STARTING_MONEY,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      isBankrupt: false,
      isConnected: true,
      consecutiveDoubles: 0,
      lapsCompleted: 0
    }));

    const properties: Record<number, PropertyState> = {};
    for (let i = 0; i < 40; i++) {
      properties[i] = {
        tileIndex: i,
        ownerId: null,
        buildLevel: 0,
        isMortgaged: false,
        forceBought: false
      };
    }

    this.chanceDeck = [...CHANCE_CARDS].sort(() => Math.random() - 0.5);
    this.chestDeck = [...CHEST_CARDS].sort(() => Math.random() - 0.5);

    this.state = {
      roomId,
      phase: 'ROLLING',
      turnNumber: 1,
      currentPlayerIndex: 0,
      players,
      properties,
      dice: [1, 1],
      doubles: false,
      doublesCount: 0,
      buyOffer: null,
      forceBuyOffer: null,
      debt: null,
      trades: [],
      lastMove: null,
      winnerId: null,
      victoryType: null,
      lastActionText: 'Game started. Roll to begin.'
    };
  }

  private recordMove(player: PlayerState, from: number, landed: number, to: number): void {
    this.state.lastMove = {
      seq: (this.state.lastMove?.seq ?? 0) + 1,
      playerId: player.playerId,
      from,
      landed,
      to
    };
  }

  public getCurrentPlayer(): PlayerState {
    return this.state.players[this.state.currentPlayerIndex];
  }

  public rollDice(d1Custom?: number, d2Custom?: number): { d1: number; d2: number; doubles: boolean } {
    if (this.state.phase !== 'ROLLING') {
      throw new Error(`Cannot roll in phase ${this.state.phase}`);
    }

    const player = this.getCurrentPlayer();
    const d1 = d1Custom ?? Math.floor(Math.random() * 6) + 1;
    const d2 = d2Custom ?? Math.floor(Math.random() * 6) + 1;
    const doubles = d1 === d2;

    this.state.dice = [d1, d2];
    this.state.doubles = doubles;

    if (player.inJail) {
      if (doubles) {
        player.inJail = false;
        player.jailTurns = 0;
        this.emitToast(`${player.name} rolled doubles and escaped Jail!`, 'success');
      } else {
        player.jailTurns++;
        if (player.jailTurns >= 3) {
          player.money = Math.max(0, player.money - JAIL_FINE);
          player.inJail = false;
          player.jailTurns = 0;
          this.emitToast(`${player.name} paid $${JAIL_FINE} after 3 turns in Jail.`, 'info');
        } else {
          this.emitToast(`${player.name} stays in Jail.`, 'warning');
          this.state.phase = 'TURN_ENDED';
          this.notify();
          return { d1, d2, doubles };
        }
      }
    }

    if (doubles) {
      this.state.doublesCount++;
      if (this.state.doublesCount >= 3) {
        this.recordMove(player, player.position, JAIL_TILE_INDEX, JAIL_TILE_INDEX);
        player.position = JAIL_TILE_INDEX;
        player.inJail = true;
        player.jailTurns = 0;
        this.state.doublesCount = 0;
        this.emitToast(`3 consecutive doubles. ${player.name} goes directly to Jail.`, 'danger');
        this.state.phase = 'TURN_ENDED';
        this.notify();
        return { d1, d2, doubles };
      }
    } else {
      this.state.doublesCount = 0;
    }

    const total = d1 + d2;
    const oldPos = player.position;
    const newPos = (oldPos + total) % 40;

    if (newPos < oldPos) {
      player.money += GO_SALARY;
      player.lapsCompleted++;
      this.emitToast(`${player.name} passed GO and collected $${GO_SALARY}.`, 'success');
    }

    player.position = newPos;
    (this.state as any).phase = 'RESOLVING';

    const res = resolveLanding(
      this.state,
      player,
      this.chanceDeck,
      this.chestDeck,
      (draw: CardDraw) => this.options.onCard?.(draw)
    );
    this.recordMove(player, oldPos, newPos, player.position);
    if (res.toast) {
      this.emitToast(res.toast, 'info');
    }

    const currentPhase = this.state.phase as string;
    if (this.state.debt) {
      this.state.phase = 'DEBT';
    } else if (currentPhase === 'FORCE_BUY_OFFER' && this.state.forceBuyOffer) {
      this.setupForceBuyTimeout();
    } else if (currentPhase === 'BUY_OFFER' && this.state.buyOffer) {
      // Stay in BUY_OFFER phase waiting for player's purchase choice
    } else {
      this.state.phase = 'TURN_ENDED';
    }

    this.checkAndApplyVictory();
    this.notify();
    return { d1, d2, doubles };
  }

  public respondToBuyOffer(accept: boolean): void {
    if (this.state.phase !== 'BUY_OFFER' || !this.state.buyOffer) {
      throw new Error('No active buy offer');
    }

    const offer = this.state.buyOffer;
    const player = this.getCurrentPlayer();
    const tile = BOARD_TILES[offer.tileIndex];
    const prop = this.state.properties[offer.tileIndex];

    if (accept) {
      if (player.money < offer.price) {
        throw new Error('Insufficient funds to buy property');
      }
      player.money -= offer.price;
      prop.ownerId = player.playerId;
      prop.buildLevel = 0;
      prop.isMortgaged = false;
      prop.forceBought = false;
      this.emitToast(`${player.name} bought ${tile.name} for $${offer.price}.`, 'success');
    } else {
      this.emitToast(`${player.name} decided not to buy ${tile.name}.`, 'info');
    }

    this.state.buyOffer = null;
    this.state.phase = 'TURN_ENDED';
    this.checkAndApplyVictory();
    this.notify();
  }

  public respondToForceBuy(accept: boolean): void {
    if (this.state.phase !== 'FORCE_BUY_OFFER' || !this.state.forceBuyOffer) {
      throw new Error('No active force-buy offer');
    }

    this.clearForceBuyTimeout();

    const offer = this.state.forceBuyOffer;
    const player = this.getCurrentPlayer();
    const opponent = this.state.players.find((p) => p.playerId === offer.targetPlayerId);

    if (accept) {
      const res = executeForceBuy(this.state, offer.tileIndex);
      if (res.success) {
        this.emitToast(res.text, 'success');
      } else {
        this.emitToast(res.text, 'danger');
        if (opponent) {
          const rent = calculateRent(this.state, offer.tileIndex, this.state.dice[0] + this.state.dice[1]);
          this.payRentOrDebt(player, opponent, rent, `rent for ${BOARD_TILES[offer.tileIndex].name}`);
        }
      }
    } else {
      this.state.forceBuyOffer = null;
      if (opponent) {
        const rent = calculateRent(this.state, offer.tileIndex, this.state.dice[0] + this.state.dice[1]);
        const result = payRent(this.state, player, opponent, rent);
        if (result.debt !== undefined) {
          this.enterDebt(player, result.debt, opponent.playerId, `rent for ${BOARD_TILES[offer.tileIndex].name}`);
        } else {
          this.emitToast(`${player.name} declined force-buy. Paid $${result.paid} rent to ${opponent.name}.`, 'info');
        }
      }
    }

    if (!this.state.debt) {
      this.state.phase = 'TURN_ENDED';
    }
    this.checkAndApplyVictory();
    this.notify();
  }

  public payJailFine(): void {
    const player = this.getCurrentPlayer();
    if (!player.inJail || player.money < JAIL_FINE) {
      throw new Error('Cannot pay jail fine');
    }
    player.money -= JAIL_FINE;
    player.inJail = false;
    player.jailTurns = 0;
    this.emitToast(`${player.name} paid $${JAIL_FINE} and left Jail.`, 'info');
    this.notify();
  }

  public useJailCard(): void {
    const player = this.getCurrentPlayer();
    if (!player.inJail || player.jailCards <= 0) {
      throw new Error('No jail cards');
    }
    player.jailCards--;
    player.inJail = false;
    player.jailTurns = 0;
    this.emitToast(`${player.name} used a Get Out of Jail Free card.`, 'success');
    this.notify();
  }

  public build(tileIndex: number): void {
    if (this.state.phase !== 'ROLLING' && this.state.phase !== 'TURN_ENDED') {
      throw new Error(`Cannot build in phase ${this.state.phase}`);
    }
    const player = this.getCurrentPlayer();
    const res = buildProperty(this.state, player, tileIndex);
    if (!res.success) {
      throw new Error(res.text);
    }
    this.emitToast(res.text, 'success');
    this.checkAndApplyVictory();
    this.notify();
  }

  public sell(tileIndex: number): void {
    if (this.state.phase !== 'ROLLING' && this.state.phase !== 'TURN_ENDED' && this.state.phase !== 'DEBT') {
      throw new Error(`Cannot sell in phase ${this.state.phase}`);
    }
    const player = this.getCurrentPlayer();
    const res = sellBuilding(this.state, player, tileIndex);
    if (!res.success) {
      throw new Error(res.text);
    }
    this.emitToast(res.text, 'info');
    this.tryPayDebt();
    this.checkAndApplyVictory();
    this.notify();
  }

  public declareBankruptcy(): void {
    if (this.state.phase !== 'DEBT' || !this.state.debt) {
      throw new Error('No pending debt to go bankrupt from');
    }
    const player = this.getCurrentPlayer();
    const debt = this.state.debt;
    this.clearForceBuyTimeout();
    this.state.buyOffer = null;
    this.state.forceBuyOffer = null;
    this.state.debt = null;

    const { raised, paid } = applyBankruptcy(this.state, player, debt.creditorId, debt.amount);
    const creditor = debt.creditorId
      ? this.state.players.find((p) => p.playerId === debt.creditorId)
      : null;
    const msg = creditor
      ? `${player.name} went BANKRUPT. Everything was sold to the bank for $${raised}; ${creditor.name} receives $${paid}.`
      : `${player.name} went BANKRUPT. Everything was sold back to the bank.`;
    this.emitToast(msg, 'danger');

    if (!this.checkAndApplyVictory()) {
      // The bankrupt player has nothing left to do: move straight on.
      this.state.doubles = false;
      this.state.doublesCount = 0;
      this.advanceToNextPlayer();
      return;
    }
    this.notify();
  }

  // ------------------------------------------------------------------
  // Trading (any time, any player, like the real game)
  // ------------------------------------------------------------------

  private validateTrade(t: Omit<TradeOffer, 'id' | 'createdAt'>): string | null {
    const from = this.state.players.find((p) => p.playerId === t.fromId);
    const to = this.state.players.find((p) => p.playerId === t.toId);
    if (!from || !to || from === to) return 'Pick another player to trade with';
    if (from.isBankrupt || to.isBankrupt) return 'Bankrupt players cannot trade';
    const ints = [t.giveMoney, t.getMoney];
    if (ints.some((n) => !Number.isInteger(n) || n < 0)) return 'Money amounts must be whole, non-negative numbers';
    if (new Set([...t.giveProps, ...t.getProps]).size !== t.giveProps.length + t.getProps.length) {
      return 'A property can only appear once in a trade';
    }
    if (t.giveMoney === 0 && t.getMoney === 0 && t.giveProps.length === 0 && t.getProps.length === 0) {
      return 'The trade is empty';
    }
    if (from.money < t.giveMoney) return `${from.name} does not have $${t.giveMoney}`;
    if (to.money < t.getMoney) return `${to.name} does not have $${t.getMoney}`;
    for (const i of t.giveProps) {
      const reason = tradeBlockReason(this.state.properties[i], from.playerId);
      if (reason) return reason;
    }
    for (const i of t.getProps) {
      const reason = tradeBlockReason(this.state.properties[i], to.playerId);
      if (reason) return reason;
    }
    return null;
  }

  public proposeTrade(fromId: string, proposal: TradeProposal): TradeOffer {
    if (this.state.phase === 'GAME_OVER') throw new Error('The game is over');
    const draft = {
      fromId,
      toId: proposal.toId,
      giveMoney: Math.floor(Number(proposal.giveMoney) || 0),
      getMoney: Math.floor(Number(proposal.getMoney) || 0),
      giveProps: [...new Set((proposal.giveProps ?? []).map(Number))],
      getProps: [...new Set((proposal.getProps ?? []).map(Number))]
    };
    const invalid = this.validateTrade(draft);
    if (invalid) throw new Error(invalid);

    // One open offer per pair: a new proposal replaces the previous one.
    this.state.trades = this.state.trades.filter((t) => !(t.fromId === fromId && t.toId === draft.toId));
    const offer: TradeOffer = { ...draft, id: Math.random().toString(36).slice(2, 10), createdAt: Date.now() };
    this.state.trades.push(offer);

    const from = this.state.players.find((p) => p.playerId === fromId)!;
    const to = this.state.players.find((p) => p.playerId === draft.toId)!;
    this.emitToast(`${from.name} sent a trade offer to ${to.name}.`, 'info');
    this.notify();
    return offer;
  }

  public respondToTrade(tradeId: string, playerId: string, accept: boolean): void {
    const trade = this.state.trades.find((t) => t.id === tradeId);
    if (!trade) throw new Error('That trade is no longer available');
    if (trade.toId !== playerId) throw new Error('Only the receiving player can answer this trade');
    const from = this.state.players.find((p) => p.playerId === trade.fromId)!;
    const to = this.state.players.find((p) => p.playerId === trade.toId)!;
    this.state.trades = this.state.trades.filter((t) => t.id !== tradeId);

    if (!accept) {
      this.emitToast(`${to.name} declined ${from.name}'s trade.`, 'info');
      this.notify();
      return;
    }

    const invalid = this.validateTrade(trade);
    if (invalid) {
      this.notify();
      throw new Error(`Trade cancelled: ${invalid}`);
    }

    from.money += trade.getMoney - trade.giveMoney;
    to.money += trade.giveMoney - trade.getMoney;
    for (const i of trade.giveProps) this.state.properties[i].ownerId = to.playerId;
    for (const i of trade.getProps) this.state.properties[i].ownerId = from.playerId;

    // Offers that referenced these deeds or this cash may now be stale.
    this.state.trades = this.state.trades.filter((t) => this.validateTrade(t) === null);

    this.emitToast(`${from.name} and ${to.name} completed a trade.`, 'success');
    this.tryPayDebt();
    this.checkAndApplyVictory();
    this.notify();
  }

  public cancelTrade(tradeId: string, playerId: string): void {
    const trade = this.state.trades.find((t) => t.id === tradeId);
    if (!trade) return;
    if (trade.fromId !== playerId) throw new Error('Only the sender can cancel this trade');
    this.state.trades = this.state.trades.filter((t) => t.id !== tradeId);
    this.notify();
  }

  /**
   * Pays rent when affordable, otherwise parks the shortfall as DEBT
   * so the debtor can sell buildings / mortgage before paying.
   */
  private payRentOrDebt(
    debtor: PlayerState,
    creditor: PlayerState,
    amount: number,
    reason: string
  ): void {
    const result = payRent(this.state, debtor, creditor, amount);
    if (result.debt !== undefined) {
      this.enterDebt(debtor, result.debt, creditor.playerId, reason);
    } else {
      this.emitToast(`${debtor.name} paid $${result.paid} rent to ${creditor.name}.`, 'info');
    }
  }

  private enterDebt(
    debtor: PlayerState,
    amount: number,
    creditorId: string | null,
    reason: string
  ): void {
    const debt: DebtOffer = { amount, creditorId, reason };
    this.state.debt = debt;
    this.state.phase = 'DEBT';
    const creditor = creditorId
      ? this.state.players.find((p) => p.playerId === creditorId)
      : null;
    const toWhom = creditor ? ` to ${creditor.name}` : '';
    this.emitToast(
      `${debtor.name} owes $${amount}${toWhom} (${reason}). Sell buildings to pay, or declare bankruptcy.`,
      'warning'
    );
  }

  /**
   * After the debtor raises cash (sell / mortgage), auto-pay the debt
   * as soon as it is covered.
   */
  private tryPayDebt(): void {
    const debt = this.state.debt;
    if (!debt || this.state.phase !== 'DEBT') return;
    const debtor = this.getCurrentPlayer();
    if (debtor.money < debt.amount) return;

    debtor.money -= debt.amount;
    const creditor = debt.creditorId
      ? this.state.players.find((p) => p.playerId === debt.creditorId)
      : null;
    if (creditor && !creditor.isBankrupt) {
      creditor.money += debt.amount;
    }
    this.state.debt = null;
    this.state.phase = 'TURN_ENDED';
    const msg = creditor
      ? `${debtor.name} paid off $${debt.amount} debt to ${creditor.name}.`
      : `${debtor.name} paid off $${debt.amount} debt to the bank.`;
    this.state.lastActionText = msg;
    this.emitToast(msg, 'success');
  }

  public mortgage(tileIndex: number, isMortgage: boolean): void {
    if (this.state.phase !== 'ROLLING' && this.state.phase !== 'TURN_ENDED' && this.state.phase !== 'DEBT') {
      throw new Error(`Cannot mortgage in phase ${this.state.phase}`);
    }
    const player = this.getCurrentPlayer();
    const res = toggleMortgage(this.state, player, tileIndex, isMortgage);
    if (!res.success) {
      throw new Error(res.text);
    }
    this.emitToast(res.text, 'info');
    this.tryPayDebt();
    this.notify();
  }

  public endTurn(): void {
    if (this.state.phase !== 'TURN_ENDED') {
      throw new Error(`Cannot end turn in phase ${this.state.phase}`);
    }

    const player = this.getCurrentPlayer();
    if (this.state.doubles && !player.inJail && !player.isBankrupt) {
      this.state.phase = 'ROLLING';
      this.emitToast(`Doubles! ${player.name} rolls again.`, 'info');
      this.notify();
      return;
    }

    this.state.doublesCount = 0;
    this.state.doubles = false;
    this.advanceToNextPlayer();
  }

  private advanceToNextPlayer(): void {
    const totalPlayers = this.state.players.length;
    let nextIdx = (this.state.currentPlayerIndex + 1) % totalPlayers;
    let attempts = 0;

    while (this.state.players[nextIdx].isBankrupt && attempts < totalPlayers) {
      nextIdx = (nextIdx + 1) % totalPlayers;
      attempts++;
    }

    this.state.currentPlayerIndex = nextIdx;
    this.state.turnNumber++;
    this.state.phase = 'ROLLING';

    const nextPlayer = this.state.players[nextIdx];
    this.emitToast(`It is now ${nextPlayer.name}'s turn.`, 'info');
    this.checkAndApplyVictory();
    this.notify();
  }

  public checkAndApplyVictory(): boolean {
    const result = checkVictory(this.state, this.options.specialVictory);
    if (result.hasWinner && result.winnerId) {
      this.state.winnerId = result.winnerId;
      this.state.victoryType = result.victoryType;
      this.state.phase = 'GAME_OVER';
      if (result.reason) {
        this.emitToast(`GAME OVER. ${result.reason}`, 'success');
      }
      return true;
    }
    return false;
  }

  private setupForceBuyTimeout(): void {
    this.clearForceBuyTimeout();
    this.forceBuyTimer = setTimeout(() => {
      if (this.state.phase === 'FORCE_BUY_OFFER') {
        this.respondToForceBuy(false);
      }
    }, 15000);
  }

  private clearForceBuyTimeout(): void {
    if (this.forceBuyTimer) {
      clearTimeout(this.forceBuyTimer);
      this.forceBuyTimer = null;
    }
  }

  private emitToast(text: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info'): void {
    this.state.lastActionText = text;
    this.options.onToast?.({ text, type });
  }

  private notify(): void {
    this.options.onStateChange?.(this.state);
  }
}

