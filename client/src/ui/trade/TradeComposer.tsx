import React, { useMemo, useState } from 'react';
import { Handshake, MessageSquareText, Minus, Plus, Repeat2, Send } from 'lucide-react';
import { TradeOffer, tradeBlockReason, tradeMortgageFees } from '@monopoly/shared';
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

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * New trade, or (with `counter`) a counter-offer: the incoming offer is
 * loaded from your side (what they asked from you = what you give) so you
 * only change what you want and send it back.
 */
export const TradeComposer: React.FC<{ onClose: () => void; partnerId?: string; layer?: string; counter?: TradeOffer }> = ({
  onClose,
  partnerId,
  layer,
  counter
}) => {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const partners = useMemo(
    () => game?.players.filter((p) => p.playerId !== myPlayerId && !p.isBankrupt) ?? [],
    [game, myPlayerId]
  );
  const [toId, setToId] = useState(counter?.fromId ?? partnerId ?? partners[0]?.playerId ?? '');
  const [giveMoney, setGiveMoney] = useState(counter?.getMoney ?? 0);
  const [getMoney, setGetMoney] = useState(counter?.giveMoney ?? 0);
  const [giveProps, setGiveProps] = useState<number[]>(counter?.getProps ?? []);
  const [getProps, setGetProps] = useState<number[]>(counter?.giveProps ?? []);
  const [message, setMessage] = useState('');

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
  // A counter-offer must change something (otherwise just accept).
  const unchanged =
    !!counter &&
    giveMoney === counter.getMoney &&
    getMoney === counter.giveMoney &&
    sameSet(giveProps, counter.getProps) &&
    sameSet(getProps, counter.giveProps);

  const send = () => {
    audioManager.playClick();
    const proposal = { toId, giveMoney, giveProps, getMoney, getProps, message: message.trim() || undefined };
    if (counter) socket.emit('trade:counter', { tradeId: counter.id, proposal });
    else socket.emit('trade:propose', proposal);
    onClose();
  };

  // `was`: the deeds in the offer being countered (changes get marked).
  const deeds = (ownerId: string, selected: number[], set: (v: number[]) => void, was?: number[]) => {
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
              level={p.buildLevel}
              changed={!!was && was.includes(p.tileIndex) !== selected.includes(p.tileIndex)}
              title={reason ?? undefined}
              onClick={() => toggle(selected, set, p.tileIndex)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Modal width={640} onClose={onClose} label={counter ? 'Counter-offer' : 'New trade'} layer={layer}>
      <div className={`modal-pad trade-composer ${counter ? 'is-counter' : ''}`}>
        <div className="modal-title">
          <span className="modal-title-icon">
            {counter ? <Repeat2 size={22} /> : <Handshake size={22} />}
          </span>
          <div>
            <h2 className="display">{counter ? 'Counter-offer' : 'Make a trade'}</h2>
            <p>
              {counter
                ? `Change what you give or ask for, then send it back to ${partner?.name ?? 'them'}. Round ${(counter.round ?? 1) + 1}.`
                : 'Offer cash and deeds. Cities keep their buildings when traded; mortgaged deeds can be traded too.'}
            </p>
          </div>
        </div>

        {partners.length === 0 ? (
          <p className="trade-nothing">Nobody left to trade with.</p>
        ) : (
          <>
            <div className="partner-row" role="radiogroup" aria-label="Trade with">
              {partners.filter((p) => !counter || p.playerId === toId).map((p) => (
                <button
                  key={p.playerId}
                  type="button"
                  role="radio"
                  aria-checked={p.playerId === toId}
                  className={`partner ${p.playerId === toId ? 'active' : ''}`}
                  onClick={() => !counter && pickPartner(p.playerId)}
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
                {counter && giveMoney !== counter.getMoney && <WasNote amount={counter.getMoney} />}
                {deeds(me.playerId, giveProps, setGiveProps, counter?.getProps)}
              </section>
              <section className="trade-col get">
                <header>You get{partner ? ` from ${partner.name}` : ''}</header>
                {partner && (
                  <>
                    <MoneyStepper name="get-money" value={getMoney} max={partner.money} onChange={setGetMoney} />
                    {counter && getMoney !== counter.giveMoney && <WasNote amount={counter.giveMoney} />}
                    {deeds(partner.playerId, getProps, setGetProps, counter?.giveProps)}
                  </>
                )}
              </section>
            </div>

            <MortgageFeeNote
              myFee={tradeMortgageFees(game, getProps)}
              theirFee={tradeMortgageFees(game, giveProps)}
              partnerName={partner?.name ?? 'They'}
            />

            <label className="trade-note-field">
              <MessageSquareText size={16} />
              <input
                name="trade-note"
                maxLength={80}
                placeholder={counter ? 'Add a note, e.g. "Add $50 and it\'s a deal"' : 'Add a note (optional)'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success btn-lg btn-send-trade"
                onClick={send}
                disabled={empty || !partner || unchanged}
                title={unchanged ? 'Change something first (or just accept their offer)' : undefined}
              >
                {counter ? <Repeat2 size={18} /> : <Send size={18} />} {counter ? 'Send counter-offer' : 'Send offer'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

const WasNote: React.FC<{ amount: number }> = ({ amount }) => (
  <small className="was-note tnum">was {money(amount)}</small>
);

// Classic rule: whoever receives a mortgaged deed pays the Bank 10% interest.
const MortgageFeeNote: React.FC<{ myFee: number; theirFee: number; partnerName: string }> = ({ myFee, theirFee, partnerName }) => {
  if (!myFee && !theirFee) return null;
  return (
    <p className="trade-fee-note">
      Mortgaged deeds stay mortgaged; the new owner pays 10% interest to the Bank.
      {myFee > 0 && <> You pay <b className="tnum">{money(myFee)}</b>.</>}
      {theirFee > 0 && (
        <>
          {' '}
          {partnerName} pays <b className="tnum">{money(theirFee)}</b>.
        </>
      )}
    </p>
  );
};
