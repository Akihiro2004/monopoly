import React, { useState } from 'react';
import { Check, Handshake, Plus, Repeat2, X } from 'lucide-react';
import { TradeOffer } from '@monopoly/shared';
import { socket } from '../../net/socket.js';
import { useGameStore } from '../../store/gameStore.js';
import { audioManager } from '../../sound/audioManager.js';
import { TradeCard } from './TradeParts.js';
import { TradeComposer } from './TradeComposer.js';

export const respondTrade = (tradeId: string, accept: boolean) => {
  if (accept) audioManager.playBuy();
  else audioManager.playClick();
  socket.emit('trade:respond', { tradeId, accept });
};

// Trade tab: start a trade, answer incoming offers, cancel your own.
export const TradeView: React.FC = () => {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [composing, setComposing] = useState(false);
  const [countering, setCountering] = useState<TradeOffer | null>(null);
  if (!game) return null;

  const me = game.players.find((p) => p.playerId === myPlayerId);
  const incoming = game.trades.filter((t) => t.toId === myPlayerId);
  const outgoing = game.trades.filter((t) => t.fromId === myPlayerId);
  const canTrade = !!me && !me.isBankrupt && game.phase !== 'GAME_OVER';

  return (
    <div className="trade-view">
      <button className="btn btn-blue btn-lg btn-block btn-new-trade" onClick={() => setComposing(true)} disabled={!canTrade}>
        <Plus size={20} strokeWidth={3} /> New trade
      </button>

      {incoming.length > 0 && (
        <section className="trade-group">
          <h3 className="section-title">Offers for you</h3>
          {incoming.map((t) => (
            <TradeCard
              key={t.id}
              game={game}
              trade={t}
              myPlayerId={myPlayerId}
              actions={
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => respondTrade(t.id, false)}>
                    <X size={15} strokeWidth={3} /> Decline
                  </button>
                  {(t.round ?? 1) < 10 && (
                    <button className="btn btn-blue btn-sm btn-counter-trade" onClick={() => setCountering(t)}>
                      <Repeat2 size={15} strokeWidth={2.6} /> Counter
                    </button>
                  )}
                  <button className="btn btn-success btn-sm btn-accept-trade" onClick={() => respondTrade(t.id, true)}>
                    <Check size={15} strokeWidth={3} /> Accept
                  </button>
                </>
              }
            />
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="trade-group">
          <h3 className="section-title">Waiting for answer</h3>
          {outgoing.map((t) => (
            <TradeCard
              key={t.id}
              game={game}
              trade={t}
              myPlayerId={myPlayerId}
              actions={
                <button className="btn btn-danger-soft btn-sm" onClick={() => socket.emit('trade:cancel', { tradeId: t.id })}>
                  <X size={15} strokeWidth={3} /> Cancel offer
                </button>
              }
            />
          ))}
        </section>
      )}

      {incoming.length === 0 && outgoing.length === 0 && (
        <div className="empty-state">
          <Handshake size={30} />
          <span>Swap cash and cities with other players, any time. Got an offer you almost like? Send a counter-offer.</span>
        </div>
      )}

      {composing && <TradeComposer onClose={() => setComposing(false)} />}
      {countering && <TradeComposer counter={countering} onClose={() => setCountering(null)} />}
    </div>
  );
};
