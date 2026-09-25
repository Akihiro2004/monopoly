import React from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { BOARD_TILES } from '@monopoly/shared';
import { audioManager } from '../sound/audioManager.js';
import { Home, Coins, Check, X, ShieldAlert } from 'lucide-react';

const GROUP_COLORS: Record<string, string> = {
  brown: '#8B4513',
  lightblue: '#0284c7',
  pink: '#db2777',
  orange: '#ea580c',
  red: '#dc2626',
  yellow: '#ca8a04',
  green: '#16a34a',
  darkblue: '#1d4ed8',
  railroad: '#475569',
  utility: '#64748b',
  special: '#94a3b8'
};

export const BuyPropertyModal: React.FC = () => {
  const buyOffer = useGameStore((s) => s.buyOffer);
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isWalking = useGameStore((s) => s.isWalking);

  // Suppress modal while token is still walking across the board
  if (!buyOffer || !gameState || isWalking) return null;

  const isBuyer = buyOffer.buyerPlayerId === myPlayerId;
  const tile = BOARD_TILES[buyOffer.tileIndex];
  const buyer = gameState.players.find((p) => p.playerId === buyOffer.buyerPlayerId);
  if (!tile || !buyer) return null;

  const groupColor = GROUP_COLORS[tile.group] || '#475569';
  const canAfford = buyer.money >= buyOffer.price;

  const handleRespond = (accept: boolean) => {
    if (accept) {
      audioManager.playBuy();
    } else {
      audioManager.playClick();
    }
    socket.emit('game:buyResponse', { accept });
  };

  return (
    <div className="deed-overlay">
      <div className="deed-card-modal">
        {/* Deed Card Header */}
        <div className="deed-header" style={{ backgroundColor: groupColor }}>
          <span className="deed-subtitle">TITLE DEED</span>
          <h2 className="deed-title">{tile.name}</h2>
        </div>

        {/* Deed Body */}
        <div className="deed-body">
          <div className="deed-price-row">
            <span className="deed-price-label">Purchase Price</span>
            <span className="deed-price-value">${tile.price}</span>
          </div>

          {/* Rent Schedule Table */}
          {tile.rentByLevel && (
            <div className="deed-rent-table">
              <div className="deed-rent-row">
                <span>Rent (Site Only)</span>
                <span className="rent-num">${tile.rentByLevel[0]}</span>
              </div>
              <div className="deed-rent-row">
                <span>With 1 House</span>
                <span className="rent-num">${tile.rentByLevel[1]}</span>
              </div>
              <div className="deed-rent-row">
                <span>With Building</span>
                <span className="rent-num">${tile.rentByLevel[2]}</span>
              </div>
              <div className="deed-rent-row">
                <span>With Hotel</span>
                <span className="rent-num">${tile.rentByLevel[3]}</span>
              </div>
              <div className="deed-rent-row highlight">
                <span>With Landmark</span>
                <span className="rent-num">${tile.rentByLevel[4]}</span>
              </div>
            </div>
          )}

          {/* Buyer Funds Status */}
          <div className="deed-funds-bar">
            <div className="funds-label">
              <Coins size={16} />
              <span>Your Cash:</span>
            </div>
            <span className={`funds-amount ${canAfford ? 'positive' : 'negative'}`}>
              ${buyer.money}
            </span>
          </div>

          {!canAfford && (
            <div className="deed-warning">
              <ShieldAlert size={16} />
              <span>Insufficient funds to purchase this property.</span>
            </div>
          )}

          {/* 3D Action Buttons */}
          {isBuyer ? (
            <div className="deed-actions">
              <button
                className="btn-3d btn-3d-buy"
                onClick={() => handleRespond(true)}
                disabled={!canAfford}
              >
                <Check size={18} />
                <span>BUY PROPERTY (${buyOffer.price})</span>
              </button>
              <button
                className="btn-3d btn-3d-pass"
                onClick={() => handleRespond(false)}
              >
                <X size={18} />
                <span>PASS</span>
              </button>
            </div>
          ) : (
            <div className="deed-waiting">
              <Home size={18} className="spin-slow" />
              <span>{buyer.name} is deciding whether to buy {tile.name}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
