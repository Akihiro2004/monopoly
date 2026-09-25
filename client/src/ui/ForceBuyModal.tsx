import React, { useState, useEffect } from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { BOARD_TILES } from '@monopoly/shared';
import { Zap, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

export const ForceBuyModal: React.FC = () => {
  const forceBuyOffer = useGameStore((s) => s.forceBuyOffer);
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isWalking = useGameStore((s) => s.isWalking);

  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!forceBuyOffer) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((forceBuyOffer.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [forceBuyOffer]);

  if (!forceBuyOffer || !gameState || isWalking) return null;

  const isBuyer = forceBuyOffer.buyerPlayerId === myPlayerId;
  const isVictim = forceBuyOffer.targetPlayerId === myPlayerId;
  const tile = BOARD_TILES[forceBuyOffer.tileIndex];
  const buyer = gameState.players.find((p) => p.playerId === forceBuyOffer.buyerPlayerId);
  const victim = gameState.players.find((p) => p.playerId === forceBuyOffer.targetPlayerId);

  const handleRespond = (accept: boolean) => {
    socket.emit('game:forceBuyResponse', { accept });
  };

  const levelNames = ['Raw Land', 'House (Lv 1)', 'Building (Lv 2)', 'Hotel (Lv 3)', 'Landmark (Lv 4)'];
  const levelName = levelNames[forceBuyOffer.currentBuildLevel];

  return (
    <div className="force-buy-overlay">
      <div className="force-buy-modal">
        <div className="modal-header">
          <Zap className="flash-icon" size={28} />
          <h2>FORCE BUY OFFER</h2>
          <div className="timer-badge">
            <span>{timeLeft}s</span>
          </div>
        </div>

        <div className="modal-content">
          <div className="property-preview">
            <span className="prop-name">{tile?.name}</span>
            <span className="prop-level">{levelName}</span>
          </div>

          <div className="transfer-flow">
            <div className="transfer-party">
              <span className="party-role">Owner</span>
              <span className="party-name">{victim?.name}</span>
            </div>
            <ArrowRight size={24} className="flow-arrow" />
            <div className="transfer-party">
              <span className="party-role">Buyer</span>
              <span className="party-name">{buyer?.name}</span>
            </div>
          </div>

          <div className="price-tag">
            <span className="price-label">2X FORCE-BUY PRICE</span>
            <span className="price-value">${forceBuyOffer.price}</span>
          </div>

          <div className="rules-note">
            <ShieldAlert size={16} />
            <span>Keeps {levelName}. Landmark lock applied (cannot upgrade to Landmark).</span>
          </div>

          {isBuyer ? (
            <div className="modal-actions">
              <button
                className="btn btn-force-buy"
                onClick={() => handleRespond(true)}
                disabled={(buyer?.money ?? 0) < forceBuyOffer.price}
              >
                <Zap size={18} />
                <span>FORCE BUY FOR ${forceBuyOffer.price}</span>
              </button>
              <button className="btn btn-decline" onClick={() => handleRespond(false)}>
                <span>DECLINE (PAY RENT)</span>
              </button>
            </div>
          ) : isVictim ? (
            <div className="waiting-message warning">
              <AlertTriangle size={20} />
              <span>{buyer?.name} can buy your property for ${forceBuyOffer.price}. The sale is mandatory if they accept.</span>
            </div>
          ) : (
            <div className="waiting-message">
              <span>{buyer?.name} is deciding whether to force-buy {tile?.name} from {victim?.name}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
