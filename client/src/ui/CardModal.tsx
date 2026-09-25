import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { Check, Gift, HelpCircle } from 'lucide-react';
import { audioManager } from '../sound/audioManager.js';

export const CardModal: React.FC = () => {
  const cardDraw = useGameStore((s) => s.cardDraw);
  const setCardDraw = useGameStore((s) => s.setCardDraw);

  if (!cardDraw) return null;

  const isChance = cardDraw.deck === 'chance';
  const headerColor = isChance ? '#d97706' : '#0284c7';

  const handleClose = () => {
    audioManager.playClick();
    setCardDraw(null);
  };

  return (
    <div className="deed-overlay">
      <div className="deed-card-modal">
        <div className="deed-header" style={{ backgroundColor: headerColor }}>
          <span className="deed-subtitle">{isChance ? 'CHANCE' : 'COMMUNITY CHEST'}</span>
          <h2 className="deed-title">{cardDraw.title}</h2>
        </div>

        <div className="deed-body">
          <div className="card-icon-row">
            {isChance ? <HelpCircle size={40} color="#d97706" /> : <Gift size={40} color="#0284c7" />}
          </div>
          <p className="card-text">{cardDraw.text}</p>
          <p className="card-note">The card effect is applied instantly.</p>

          <div className="deed-actions">
            <button className="btn-3d btn-3d-buy" onClick={handleClose}>
              <Check size={18} />
              <span>OK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
