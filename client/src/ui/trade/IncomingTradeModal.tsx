import React from 'react';
import { Check, Clock, Handshake, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';
import { Modal } from '../common/Modal.js';
import { TradeCard } from './TradeParts.js';
import { respondTrade } from './TradeView.js';

// Pops up when someone sends me a trade, unless another decision is on screen.
export const IncomingTradeModal: React.FC = () => {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const snoozed = useGameStore((s) => s.snoozedTrades);
  const snooze = useGameStore((s) => s.snoozeTrade);
  const busy = useGameStore(
    (s) =>
      s.cardDraw !== null ||
      s.gameState?.buyOffer?.buyerPlayerId === s.myPlayerId ||
      s.gameState?.forceBuyOffer?.buyerPlayerId === s.myPlayerId ||
      (s.gameState?.phase === 'DEBT' && s.gameState.players[s.gameState.currentPlayerIndex]?.playerId === s.myPlayerId)
  );

  if (!game || busy) return null;
  const trade = game.trades.find((t) => t.toId === myPlayerId && !snoozed.includes(t.id));
  if (!trade) return null;
  const from = game.players.find((p) => p.playerId === trade.fromId);

  return (
    <Modal width={440} label="Trade offer">
      <div className="modal-pad">
        <div className="modal-title">
          <span className="modal-title-icon">
            <Handshake size={22} />
          </span>
          <div>
            <h2 className="display">Trade offer!</h2>
            <p>{from?.name} wants to make a deal.</p>
          </div>
        </div>
        <TradeCard game={game} trade={trade} myPlayerId={myPlayerId} />
        <div className="modal-actions three">
          <button className="btn btn-secondary btn-lg" onClick={() => snooze(trade.id)} title="Decide later from the Trade tab">
            <Clock size={17} /> Later
          </button>
          <button className="btn btn-danger btn-lg" onClick={() => respondTrade(trade.id, false)}>
            <X size={18} strokeWidth={3} /> No
          </button>
          <button className="btn btn-success btn-lg btn-accept-trade" onClick={() => respondTrade(trade.id, true)}>
            <Check size={18} strokeWidth={3} /> Deal
          </button>
        </div>
      </div>
    </Modal>
  );
};
