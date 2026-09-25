import React, { useEffect, useState } from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { Flag, Receipt } from 'lucide-react';
import { audioManager } from '../sound/audioManager.js';
import { Modal } from './common/Modal.js';
import { Portfolio } from './game/Portfolio.js';
import { money } from './theme.js';

// Only the debtor gets the modal; others see "X owes $Y" in the action panel.
export const DebtModal: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [confirming, setConfirming] = useState(false);

  // A new debt always starts unarmed.
  useEffect(() => setConfirming(false), [gameState?.debt?.amount, gameState?.debt?.reason]);

  if (!gameState || gameState.phase !== 'DEBT' || !gameState.debt) return null;
  const debtor = gameState.players[gameState.currentPlayerIndex];
  if (!debtor || debtor.playerId !== myPlayerId) return null;

  const debt = gameState.debt;
  const creditor = debt.creditorId ? gameState.players.find((p) => p.playerId === debt.creditorId) : null;
  const shortfall = Math.max(0, debt.amount - debtor.money);
  const covered = Math.min(1, debtor.money / debt.amount);

  const handleBankrupt = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    audioManager.playClick();
    socket.emit('game:declareBankruptcy');
  };

  return (
    <Modal width={460} label="Payment due" className="debt-dialog">
      <div className="modal-pad">
        <div className="debt-head">
          <span className="debt-icon">
            <Receipt size={22} />
          </span>
          <div>
            <small>Payment due · {debt.reason}</small>
            <h2 className="tnum">{money(debt.amount)}</h2>
            <p>to {creditor ? creditor.name : 'the Bank'}</p>
          </div>
        </div>

        <div className="debt-progress">
          <div className="debt-bar">
            <span style={{ width: `${covered * 100}%` }} />
          </div>
          <div className="debt-progress-labels">
            <span className="tnum">Cash {money(debtor.money)}</span>
            <span className="tnum neg">Short {money(shortfall)}</span>
          </div>
        </div>

        <p className="debt-help">Sell buildings or mortgage land to raise cash. The debt is paid automatically once you can cover it.</p>

        <div className="debt-assets">
          <Portfolio hideSummary liquidOnly />
        </div>

        <button className={`btn btn-lg btn-block ${confirming ? 'btn-danger' : 'btn-danger-soft'}`} onClick={handleBankrupt}>
          <Flag size={17} />
          {confirming ? 'Tap again to declare bankruptcy' : 'Declare bankruptcy'}
        </button>
      </div>
    </Modal>
  );
};
