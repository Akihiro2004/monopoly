import React from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { ShieldAlert, Coins, Banknote, Flag } from 'lucide-react';
import { audioManager } from '../sound/audioManager.js';

export const DebtModal: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  if (!gameState || gameState.phase !== 'DEBT' || !gameState.debt) return null;

  const debt = gameState.debt;
  const debtor = gameState.players.find((p) => p.playerId === gameState.players[gameState.currentPlayerIndex]?.playerId);
  const isDebtor = debtor?.playerId === myPlayerId;
  const creditor = debt.creditorId
    ? gameState.players.find((p) => p.playerId === debt.creditorId)
    : null;

  const handleBankrupt = () => {
    audioManager.playClick();
    socket.emit('game:declareBankruptcy');
  };

  return (
    <div className="deed-overlay">
      <div className="deed-card-modal">
        <div className="deed-header" style={{ backgroundColor: '#b91c1c' }}>
          <span className="deed-subtitle">PAYMENT DUE</span>
          <h2 className="deed-title">
            {isDebtor ? 'You owe money!' : `${debtor?.name} owes money!`}
          </h2>
        </div>

        <div className="deed-body">
          <div className="deed-price-row">
            <span className="deed-price-label">Amount Due ({debt.reason})</span>
            <span className="deed-price-value">${debt.amount}</span>
          </div>

          <div className="deed-funds-bar">
            <div className="funds-label">
              <Coins size={16} />
              <span>{isDebtor ? 'Your Cash:' : `${debtor?.name}'s Cash:`}</span>
            </div>
            <span className="funds-amount negative">${debtor?.money ?? 0}</span>
          </div>

          <div className="deed-funds-bar">
            <div className="funds-label">
              <Banknote size={16} />
              <span>Pay to:</span>
            </div>
            <span className="funds-amount">{creditor ? creditor.name : 'Bank'}</span>
          </div>

          {isDebtor ? (
            <>
              <div className="deed-warning">
                <ShieldAlert size={16} />
                <span>Sell buildings from your tray to raise cash. The debt auto-pays once covered.</span>
              </div>
              <div className="deed-actions">
                <button className="btn-3d btn-3d-pass" onClick={handleBankrupt}>
                  <Flag size={18} />
                  <span>DECLARE BANKRUPTCY</span>
                </button>
              </div>
            </>
          ) : (
            <div className="deed-waiting">
              <ShieldAlert size={18} />
              <span>Waiting for {debtor?.name} to pay ${debt.amount}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
