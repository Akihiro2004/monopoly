import React, { useState } from 'react';
import { Check, Clock, Handshake, Repeat2, X } from 'lucide-react';
import { TradeOffer } from '@monopoly/shared';
import { TradeComposer } from './TradeComposer.js';
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
  const [countering, setCountering] = useState<TradeOffer | null>(null);
  const busy = useGameStore(
    (s) =>
      s.cardDraw !== null ||
      s.gameState?.phase === 'AUCTION' ||
      s.gameState?.buyOffer?.buyerPlayerId === s.myPlayerId ||
      s.gameState?.forceBuyOffer?.buyerPlayerId === s.myPlayerId
  );
  // A player in debt may still take an offer (it can save them), so it is
  // shown above the debt planner.

  if (!game || busy) return null;
  // Editing a counter-offer: the composer replaces this popup.
  if (countering) {
    const still = game.trades.some((t) => t.id === countering.id);
    return still ? <TradeComposer counter={countering} layer="over-planner" onClose={() => setCountering(null)} /> : null;
  }
  const trade = game.trades.find((t) => t.toId === myPlayerId && !snoozed.includes(t.id));
  if (!trade) return null;
  const from = game.players.find((p) => p.playerId === trade.fromId);

  return (
    <Modal width={440} label="Trade offer" layer="over-planner">
      <div className="modal-pad">
        <div className="modal-title">
          <span className="modal-title-icon">
            <Handshake size={22} />
          </span>
          <div>
            <h2 className="display">{(trade.round ?? 1) > 1 ? 'Counter-offer!' : 'Trade offer!'}</h2>
            <p>
              {(trade.round ?? 1) > 1
                ? `${from?.name} changed the deal. Highlighted items are new.`
                : `${from?.name} wants to make a deal.`}
            </p>
          </div>
        </div>
        <TradeCard game={game} trade={trade} myPlayerId={myPlayerId} />
        <div className="modal-actions four">
          <button className="btn btn-secondary btn-lg" onClick={() => snooze(trade.id)} title="Decide later from the Trade tab">
            <Clock size={17} /> Later
          </button>
          <button className="btn btn-danger btn-lg" onClick={() => respondTrade(trade.id, false)}>
            <X size={18} strokeWidth={3} /> No
          </button>
          {(trade.round ?? 1) < 10 && (
            <button className="btn btn-blue btn-lg btn-counter-trade" onClick={() => setCountering(trade)} title="Change the offer and send it back">
              <Repeat2 size={18} strokeWidth={2.6} /> Counter
            </button>
          )}
          <button className="btn btn-success btn-lg btn-accept-trade" onClick={() => respondTrade(trade.id, true)}>
            <Check size={18} strokeWidth={3} /> Deal
          </button>
        </div>
      </div>
    </Modal>
  );
};
