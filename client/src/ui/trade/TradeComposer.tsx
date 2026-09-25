import React, { useMemo, useState } from 'react';
import { Handshake, Minus, Plus, Send } from 'lucide-react';
import { tradeBlockReason } from '@monopoly/shared';
import { socket } from '../../net/socket.js';
import { useGameStore } from '../../store/gameStore.js';
import { audioManager } from '../../sound/audioManager.js';
import { Modal } from '../common/Modal.js';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { money, ownedBy } from '../theme.js';
import { DeedChip } from './TradeParts.js';

const MoneyStepper: React.FC<{ value: number; max: number; onChange: (v: number) => void; name: string }> = ({ value, max, onChange, name }) => {
  const clamp = (v: number) => Math.max(0, Math.min(max, Math.floor(v) || 0));
  return (
    <div className="money-stepper">
      <button type="button" className="icon-btn" onClick={() => onChange(clamp(value - 50))} aria-label="Less">
        <Minus size={16} strokeWidth={3} />
      </button>
      <label className="money-input">
        <span>$</span>
        <input
          name={name}
          inputMode="numeric"
          value={value === 0 ? '' : String(value)}
          placeholder="0"
          onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ''))))}
        />
      </label>
      <button type="button" className="icon-btn" onClick={() => onChange(clamp(value + 50))} aria-label="More">
        <Plus size={16} strokeWidth={3} />
      </button>
    </div>
  );
};

export const TradeComposer: React.FC<{ onClose: () => void; partnerId?: string }> = ({ onClose, partnerId }) => {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const partners = useMemo(
    () => game?.players.filter((p) => p.playerId !== myPlayerId && !p.isBankrupt) ?? [],
    [game, myPlayerId]
  );
  const [toId, setToId] = useState(partnerId ?? partners[0]?.playerId ?? '');
  const [giveMoney, setGiveMoney] = useState(0);
  const [getMoney, setGetMoney] = useState(0);
  const [giveProps, setGiveProps] = useState<number[]>([]);
  const [getProps, setGetProps] = useState<number[]>([]);

  if (!game) return null;
  const me = game.players.find((p) => p.playerId === myPlayerId);
  const partner = game.players.find((p) => p.playerId === toId);
  if (!me) return null;

  const toggle = (list: number[], set: (v: number[]) => void, i: number) =>
    set(list.includes(i) ? list.filter((x) => x !== i) : [...list, i]);

  const pickPartner = (id: string) => {
    setToId(id);
    setGetProps([]);
    setGetMoney(0);
  };

  const empty = giveMoney === 0 && getMoney === 0 && giveProps.length === 0 && getProps.length === 0;

  const send = () => {
    audioManager.playClick();
    socket.emit('trade:propose', { toId, giveMoney, giveProps, getMoney, getProps });
    onClose();
  };

  const deeds = (ownerId: string, selected: number[], set: (v: number[]) => void) => {
    const list = ownedBy(game, ownerId).sort((a, b) => a.tileIndex - b.tileIndex);
    if (list.length === 0) return <p className="trade-nothing">No properties</p>;
    return (
      <div className="trade-items">
        {list.map((p) => {
          const reason = tradeBlockReason(p, ownerId);
          return (
            <DeedChip
              key={p.tileIndex}
              tileIndex={p.tileIndex}
              selected={selected.includes(p.tileIndex)}
              disabled={!!reason}
              mortgaged={p.isMortgaged}
              title={reason ?? undefined}
              onClick={() => toggle(selected, set, p.tileIndex)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Modal width={640} onClose={onClose} label="New trade">
      <div className="modal-pad trade-composer">
        <div className="modal-title">
          <span className="modal-title-icon">
            <Handshake size={22} />
          </span>
          <div>
            <h2 className="display">Make a trade</h2>
            <p>Offer cash and deeds. Built properties must be sold down first.</p>
          </div>
        </div>

        {partners.length === 0 ? (
          <p className="trade-nothing">Nobody left to trade with.</p>
        ) : (
          <>
            <div className="partner-row" role="radiogroup" aria-label="Trade with">
              {partners.map((p) => (
                <button
                  key={p.playerId}
                  type="button"
                  role="radio"
                  aria-checked={p.playerId === toId}
                  className={`partner ${p.playerId === toId ? 'active' : ''}`}
                  onClick={() => pickPartner(p.playerId)}
                >
                  <PlayerAvatar token={p.tokenType} color={p.color} size={34} />
                  <span className="truncate">{p.name}</span>
                  <small className="tnum">{money(p.money)}</small>
                </button>
              ))}
            </div>

            <div className="trade-columns">
              <section className="trade-col give">
                <header>You give</header>
                <MoneyStepper name="give-money" value={giveMoney} max={me.money} onChange={setGiveMoney} />
                {deeds(me.playerId, giveProps, setGiveProps)}
              </section>
              <section className="trade-col get">
                <header>You get{partner ? ` from ${partner.name}` : ''}</header>
                {partner && (
                  <>
                    <MoneyStepper name="get-money" value={getMoney} max={partner.money} onChange={setGetMoney} />
                    {deeds(partner.playerId, getProps, setGetProps)}
                  </>
                )}
              </section>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-success btn-lg btn-send-trade" onClick={send} disabled={empty || !partner}>
                <Send size={18} /> Send offer
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
