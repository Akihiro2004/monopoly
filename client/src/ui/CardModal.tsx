import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { Gift, HelpCircle } from 'lucide-react';
import { audioManager } from '../sound/audioManager.js';
import { Modal } from './common/Modal.js';

export const CardModal: React.FC = () => {
  const cardDraw = useGameStore((s) => s.cardDraw);
  const setCardDraw = useGameStore((s) => s.setCardDraw);

  if (!cardDraw) return null;
  const isChance = cardDraw.deck === 'chance';

  const handleClose = () => {
    audioManager.playClick();
    setCardDraw(null);
  };

  return (
    <Modal width={360} onClose={handleClose} label={isChance ? 'Chance card' : 'Community Chest card'}>
      <div className="modal-pad">
        <div className={`draw-card ${isChance ? 'chance' : 'chest'}`}>
          <span className="draw-deck">{isChance ? 'Chance' : 'Community Chest'}</span>
          <span className="draw-icon">{isChance ? <HelpCircle size={40} /> : <Gift size={40} />}</span>
          <h3>{cardDraw.title}</h3>
          <p>{cardDraw.text}</p>
        </div>
        <button className="btn btn-primary btn-lg btn-block btn-card-ok" onClick={handleClose}>
          Got it
        </button>
      </div>
    </Modal>
  );
};
