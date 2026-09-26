import { BANK_HOTELS, BANK_HOUSES, BankState, GameState, LEDGER_SIZE, piecesAt } from '@monopoly/shared';

export function createBank(): BankState {
  return { houses: BANK_HOUSES, hotels: BANK_HOTELS, ledger: [], nextTxnId: 1 };
}

/**
 * Records a money movement on the bank statement. `null` means the Bank.
 * Callers move the money themselves; this only keeps the books.
 */
export function record(
  state: GameState,
  fromId: string | null,
  toId: string | null,
  amount: number,
  reason: string
): void {
  if (!amount || amount <= 0) return;
  const bank = state.bank;
  bank.ledger.push({ id: bank.nextTxnId++, ts: Date.now(), fromId, toId, amount, reason });
  if (bank.ledger.length > LEDGER_SIZE) bank.ledger.splice(0, bank.ledger.length - LEDGER_SIZE);
}

/** Moves the building pieces for a level change (upgrade or sell). */
export function movePieces(state: GameState, fromLevel: number, toLevel: number): void {
  const before = piecesAt(fromLevel);
  const after = piecesAt(toLevel);
  state.bank.houses += before.houses - after.houses;
  state.bank.hotels += before.hotels - after.hotels;
}

/** Returns every piece standing on a property to the Bank (bankruptcy). */
export function returnPieces(state: GameState, level: number): void {
  movePieces(state, level, 0);
}
