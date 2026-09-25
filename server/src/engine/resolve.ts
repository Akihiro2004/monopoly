import {
  BOARD_TILES,
  CardDef,
  GO_TO_JAIL_TILE_INDEX,
  JAIL_TILE_INDEX,
  GameState,
  PlayerState
} from '@monopoly/shared';
import { executeAutoBuy } from './actions.js';
import { canForceBuy, createForceBuyOffer } from './forceBuy.js';
import { calculateRent, payRent } from './rent.js';

export interface ResolveResult {
  needsForceBuyChoice: boolean;
  toast: string;
}

export function resolveLanding(
  gameState: GameState,
  player: PlayerState,
  chanceDeck: CardDef[],
  chestDeck: CardDef[]
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
      const msg = `${player.name} paid $${tax} in ${tile.name}.`;
      gameState.lastActionText = msg;
      return { needsForceBuyChoice: false, toast: msg };
    } else {
      player.money = 0;
      player.isBankrupt = true;
      const msg = `${player.name} went bankrupt from ${tile.name}.`;
      gameState.lastActionText = msg;
      return { needsForceBuyChoice: false, toast: msg };
    }
  }

  // 3. Chance / Chest
  if (tile.type === 'chance' || tile.type === 'chest') {
    const deck = tile.type === 'chance' ? chanceDeck : chestDeck;
    const card = deck.shift() || deck[0];
    deck.push(card);

    const action = card.action;
    let toast = `[${tile.name}] ${action.text}`;

    if (action.type === 'money') {
      player.money += action.amount;
      if (player.money < 0) {
        player.money = 0;
        player.isBankrupt = true;
      }
    } else if (action.type === 'moveTo') {
      if (action.passGoCheck && player.position > action.tileIndex) {
        player.money += 200; // Passed GO
      }
      player.position = action.tileIndex;
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
        }
      });
    } else if (action.type === 'payToAll') {
      gameState.players.forEach((other) => {
        if (other.playerId !== player.playerId && !other.isBankrupt) {
          if (player.money >= action.amount) {
            player.money -= action.amount;
            other.money += action.amount;
          }
        }
      });
    }

    gameState.lastActionText = toast;
    return { needsForceBuyChoice: false, toast };
  }

  // 4. Purchasable tiles: Property / Railroad / Utility
  if (prop) {
    // Unowned: AUTO-BUY (LINE Get Rich)
    if (prop.ownerId === null) {
      const { text } = executeAutoBuy(gameState, player, tileIndex);
      return { needsForceBuyChoice: false, toast: text };
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
    const result = payRent(gameState, player, opponent, rent);

    let msg = `${player.name} paid $${result.paid} rent to ${opponent.name} for ${tile.name}.`;
    if (result.bankrupt) {
      msg = `${player.name} went BANKRUPT paying $${rent} rent to ${opponent.name}.`;
    }
    gameState.lastActionText = msg;
    return { needsForceBuyChoice: false, toast: msg };
  }

  return { needsForceBuyChoice: false, toast: `Landed on ${tile.name}` };
}
