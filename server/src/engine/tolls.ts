import { GameState, PlayerState, boardOf } from '@monopoly/shared';
import { record } from './bank.js';
import { calculateRent } from './rent.js';

/**
 * Toll gates (Grand World) charge everyone who drives through them, not just
 * whoever lands there. Gates passed on the way are paid out of the cash the
 * player has (a toll never puts anyone into debt mid-walk); landing on a gate
 * is settled like rent by resolveLanding. Returns a line per toll paid.
 */
export function chargePassingTolls(state: GameState, player: PlayerState, from: number, steps: number): string[] {
  const board = boardOf(state);
  if (!board.tolls.length) return [];
  const lines: string[] = [];
  for (let k = 1; k < steps; k++) {
    const i = (from + k) % board.size;
    if (board.tiles[i].type !== 'toll') continue;
    const ownerId = state.properties[i]?.ownerId;
    if (!ownerId || ownerId === player.playerId) continue;
    const owner = state.players.find((p) => p.playerId === ownerId);
    if (!owner || owner.isBankrupt) continue;
    const fee = Math.min(player.money, calculateRent(state, i, 0));
    if (fee <= 0) continue;
    player.money -= fee;
    owner.money += fee;
    record(state, player.playerId, owner.playerId, fee, `Toll: ${board.tiles[i].name}`);
    lines.push(`${player.name} paid a $${fee} toll to ${owner.name} at ${board.tiles[i].name}.`);
  }
  return lines;
}
