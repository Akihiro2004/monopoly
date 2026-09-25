import React from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { BOARD_TILES } from '@monopoly/shared';
import { audioManager } from '../sound/audioManager.js';
import { AlertTriangle, ShoppingBag } from 'lucide-react';
import { Modal } from './common/Modal.js';
import { TitleDeed } from './common/TitleDeed.js';
import { money } from './theme.js';

// Only the buyer gets a modal; everyone else sees the decision in the action panel.
export const BuyPropertyModal: React.FC = () => {
  const buyOffer = useGameStore((s) => s.buyOffer);
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isWalking = useGameStore((s) => s.isWalking);

  if (!buyOffer || !gameState || isWalking || buyOffer.buyerPlayerId !== myPlayerId) return null;

  const tile = BOARD_TILES[buyOffer.tileIndex];
  const buyer = gameState.players.find((p) => p.playerId === buyOffer.buyerPlayerId);
  if (!tile || !buyer) return null;
  const canAfford = buyer.money >= buyOffer.price;

  const respond = (accept: boolean) => {
    if (accept) audioManager.playBuy();
    else audioManager.playClick();
    socket.emit('game:buyResponse', { accept });
  };

  return (
    <Modal width={400} label={`Buy ${tile.name}`}>
      <div className="modal-pad">
        <div className="modal-kicker">
          <ShoppingBag size={15} /> Unowned property
        </div>
        <TitleDeed tileIndex={tile.index} />

        <div className="ledger">
          <div>
            <span>Price</span>
            <strong className="tnum">{money(buyOffer.price)}</strong>
          </div>
          <div>
            <span>Your cash</span>
            <strong className="tnum">{money(buyer.money)}</strong>
          </div>
          <div className={canAfford ? '' : 'neg'}>
            <span>After purchase</span>
            <strong className="tnum">{money(buyer.money - buyOffer.price)}</strong>
          </div>
        </div>

        {!canAfford && (
          <div className="callout danger">
            <AlertTriangle size={16} />
            <span>You don’t have enough cash for this one.</span>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary btn-lg btn-pass" onClick={() => respond(false)}>
            Pass
          </button>
          <button className="btn btn-primary btn-lg btn-buy" onClick={() => respond(true)} disabled={!canAfford}>
            Buy for <span className="tnum">{money(buyOffer.price)}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
