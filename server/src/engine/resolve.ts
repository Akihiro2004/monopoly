import {
  BOARD_TILES,
  CardDef,
  CardDraw,
  GO_TO_JAIL_TILE_INDEX,
  JAIL_TILE_INDEX,
  GameState,
  PlayerState
} from '@monopoly/shared';
import { record } from './bank.js';
import { executeAutoBuy } from './actions.js';
import { canForceBuy, createForceBuyOffer } from './forceBuy.js';
import { calculateRent, payRent } from './rent.js';

export interface ResolveResult {
  needsForceBuyChoice: boolean;
  toast: string;
  // Unowned property the player cannot afford: the Bank auctions it.
  auctionTile?: number;
}

export function resolveLanding(
  gameState: GameState,
  player: PlayerState,
  chanceDeck: CardDef[],
  chestDeck: CardDef[],
  onCard?: (draw: CardDraw) => void,
  depth = 0
): ResolveResult {
  const tileIndex = player.position;
  const tile = BOARD_TILES[tileIndex];
  const prop = gameState.properties[tileIndex];

  // 1. Go To Jail tile
  if (tileIndex === GO_TO_JAIL_TILE_INDEX) {
    player.position = JAIL_TILE_INDEX;
    player.inJail = true;
    player.jailTurns = 0;
    const msg = `${player.name} landed on Go To Jail and is arrested.`;
    gameState.lastActionText = msg;
    return { needsForceBuyChoice: false, toast: msg };
  }

  // 2. Tax
  if (tile.type === 'tax') {
    const tax = tile.rentByLevel[0];
    if (player.money >= tax) {
      player.money -= tax;
      record(gameState, player.playerId, null, tax, tile.name);
      const msg = `${player.name} paid $${tax} in ${tile.name}.`;
      gameState.lastActionText = msg;
      return { needsForceBuyChoice: false, toast: msg };
    }
    gameState.debt = { amount: tax, creditorId: null, reason: `${tile.name} tax` };
    const debtMsg = `${player.name} cannot afford the $${tax} ${tile.name}. Sell buildings to pay or go bankrupt.`;
    gameState.lastActionText = debtMsg;
    return { needsForceBuyChoice: false, toast: debtMsg };
  }

  // 3. Chance / Chest
  if (tile.type === 'chance' || tile.type === 'chest') {
    const deck = tile.type === 'chance' ? chanceDeck : chestDeck;
    const card = deck.shift() || deck[0];
    deck.push(card);

    const action = card.action;
    let toast = `[${tile.name}] ${action.text}`;

    onCard?.({
      deck: tile.type,
      title: tile.type === 'chance' ? 'CHANCE' : 'COMMUNITY CHEST',
      text: action.text
    });

    if (action.type === 'money') {
      if (player.money + action.amount >= 0) {
        player.money += action.amount;
        const cardName = tile.type === 'chance' ? 'Chance' : 'Community Chest';
        if (action.amount > 0) record(gameState, null, player.playerId, action.amount, cardName);
        else record(gameState, player.playerId, null, -action.amount, cardName);
      } else {
        gameState.debt = {
          amount: -action.amount,
          creditorId: null,
          reason: tile.type === 'chance' ? 'Chance card payment' : 'Community Chest card payment'
        };
        const debtMsg = `${player.name} cannot pay $${-action.amount}. Sell buildings to pay or go bankrupt.`;
        gameState.lastActionText = debtMsg;
        return { needsForceBuyChoice: false, toast: debtMsg };
      }
    } else if (action.type === 'moveTo') {
      if (action.passGoCheck && player.position >= action.tileIndex) {
        player.money += 200; // Passed or landed on GO
        player.lapsCompleted++;
        record(gameState, null, player.playerId, 200, 'GO salary');
      }
      player.position = action.tileIndex;
      // Real Monopoly: the destination tile is resolved as a normal landing
      // (buy offer, rent, force-buy...). One level deep is enough for cards.
      if (depth === 0 && action.tileIndex !== 0) {
        const landed = resolveLanding(gameState, player, chanceDeck, chestDeck, onCard, depth + 1);
        const combined = landed.toast ? `${toast} ${landed.toast}` : toast;
        gameState.lastActionText = combined;
        return { needsForceBuyChoice: landed.needsForceBuyChoice, toast: combined, auctionTile: landed.auctionTile };
      }
    } else if (action.type === 'jail') {
      player.position = JAIL_TILE_INDEX;
      player.inJail = true;
      player.jailTurns = 0;
    } else if (action.type === 'getOutOfJail') {
      player.jailCards++;
    } else if (action.type === 'collectFromAll') {
      gameState.players.forEach((other) => {
        if (other.playerId !== player.playerId && !other.isBankrupt) {
          const amt = Math.min(other.money, action.amount);
          other.money -= amt;
          player.money += amt;
          record(gameState, other.playerId, player.playerId, amt, tile.type === 'chance' ? 'Chance' : 'Community Chest');
        }
      });
    } else if (action.type === 'payToAll') {
      gameState.players.forEach((other) => {
        if (other.playerId !== player.playerId && !other.isBankrupt) {
          if (player.money >= action.amount) {
            player.money -= action.amount;
            other.money += action.amount;
            record(gameState, player.playerId, other.playerId, action.amount, tile.type === 'chance' ? 'Chance' : 'Community Chest');
          }
        }
      });
    }

    gameState.lastActionText = toast;
    return { needsForceBuyChoice: false, toast };
  }

  // 4. Purchasable tiles: Property / Railroad / Utility
  if (prop) {
    // Unowned property: offer to buy if player has funds
    if (prop.ownerId === null && tile.price > 0) {
      if (player.money >= tile.price) {
        gameState.phase = 'BUY_OFFER';
        gameState.buyOffer = {
          tileIndex,
          price: tile.price,
          buyerPlayerId: player.playerId
        };
        const msg = `${player.name} landed on unowned ${tile.name}. Purchase offer: $${tile.price}.`;
        gameState.lastActionText = msg;
        return { needsForceBuyChoice: false, toast: msg };
      } else {
        gameState.buyOffer = null;
        const msg = `${player.name} cannot afford ${tile.name} ($${tile.price}). The Bank puts it up for auction.`;
        gameState.lastActionText = msg;
        return { needsForceBuyChoice: false, toast: msg, auctionTile: tileIndex };
      }
    }

    // Owned by self
    if (prop.ownerId === player.playerId) {
      const msg = `${player.name} landed on their own property (${tile.name}).`;
      gameState.lastActionText = msg;
      return { needsForceBuyChoice: false, toast: msg };
    }

    // Owned by opponent!
    const opponent = gameState.players.find((p) => p.playerId === prop.ownerId);
    if (!opponent) return { needsForceBuyChoice: false, toast: '' };

    // Check force-buy eligibility
    const fbCheck = canForceBuy(tileIndex, player, prop);
    if (fbCheck.eligible) {
      gameState.phase = 'FORCE_BUY_OFFER';
      gameState.forceBuyOffer = createForceBuyOffer(tileIndex, player, prop);
      const msg = `${player.name} landed on ${opponent.name}'s ${tile.name}. Force-buy offer: $${fbCheck.price}.`;
      gameState.lastActionText = msg;
      return { needsForceBuyChoice: true, toast: msg };
    }

    // Not eligible for force-buy: pay rent
    const diceTotal = gameState.dice[0] + gameState.dice[1];
    const rent = calculateRent(gameState, tileIndex, diceTotal);
    const result = payRent(gameState, player, opponent, rent, `Rent for ${tile.name}`);

    if (result.debt !== undefined) {
      gameState.debt = {
        amount: result.debt,
        creditorId: opponent.playerId,
        reason: `rent for ${tile.name}`
      };
      const debtMsg = `${player.name} cannot afford $${rent} rent to ${opponent.name}. Sell buildings to pay or go bankrupt.`;
      gameState.lastActionText = debtMsg;
      return { needsForceBuyChoice: false, toast: debtMsg };
    }

    const msg = `${player.name} paid $${result.paid} rent to ${opponent.name} for ${tile.name}.`;
    gameState.lastActionText = msg;
    return { needsForceBuyChoice: false, toast: msg };
  }

  return { needsForceBuyChoice: false, toast: `Landed on ${tile.name}` };
}
