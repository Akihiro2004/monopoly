import React, { useState } from 'react';
import { BANK_HOTELS, BANK_HOUSES, BOARD_TILES, BankTxn, GameState } from '@monopoly/shared';
import { ArrowDownLeft, ArrowUpRight, Building2, Gavel, Home, Landmark, Receipt } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { useCountdown } from '../game/useCountdown.js';
import { auctionKey, money } from '../theme.js';

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`;
}

const Supply: React.FC<{ label: string; left: number; total: number; icon: React.ReactNode; kind: 'house' | 'hotel' }> = ({ label, left, total, icon, kind }) => (
  <div className={`supply ${kind}`}>
    <div className="supply-head">
      {icon}
      <span>{label}</span>
      <strong className="tnum">
        {left}
        <small>/{total}</small>
      </strong>
    </div>
    <div className="supply-bar">
      <span style={{ width: `${(left / total) * 100}%` }} />
    </div>
  </div>
);

const LiveAuction: React.FC<{ game: GameState }> = ({ game }) => {
  const left = useCountdown(game.auction?.endsAt);
  const setDismissed = useGameStore((s) => s.setDismissedAuction);
  if (!game.auction) return null;
  const leader = game.players.find((p) => p.playerId === game.auction!.highBidderId);
  return (
    <button className="live-auction" onClick={() => setDismissed(null)} title="Open the auction">
      <Gavel size={20} />
      <span className="live-auction-text">
        <strong>{BOARD_TILES[game.auction.tileIndex].name}</strong>
        <small>
          {game.auction.highBid > 0 ? `${money(game.auction.highBid)} by ${leader?.name}` : 'No bids yet'} · {left}s
        </small>
      </span>
      <span className="badge red">Live</span>
    </button>
  );
};

// Bank tab: the vault (building supply, unsold deeds), live auction and the
// bank statement.
export const BankView: React.FC = () => {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  if (!game) return null;

  const bank = game.bank;
  const unsold = BOARD_TILES.filter((t) => t.price > 0 && !game.properties[t.index]?.ownerId).length;
  const circulating = game.players.filter((p) => !p.isBankrupt).reduce((s, p) => s + p.money, 0);
  const name = (id: string | null) => (id === null ? 'Bank' : id === myPlayerId ? 'You' : game.players.find((p) => p.playerId === id)?.name ?? '?');
  const txns = [...(bank?.ledger ?? [])]
    .reverse()
    .filter((t) => scope === 'all' || t.fromId === myPlayerId || t.toId === myPlayerId);

  const row = (t: BankTxn) => {
    const incoming = t.toId === myPlayerId;
    const outgoing = t.fromId === myPlayerId;
    const other = incoming ? t.fromId : outgoing ? t.toId : null;
    const otherPlayer = other ? game.players.find((p) => p.playerId === other) : undefined;
    return (
      <li key={t.id} className={`txn ${incoming ? 'in' : outgoing ? 'out' : ''}`}>
        <span className="txn-icon">
          {otherPlayer ? (
            <PlayerAvatar token={otherPlayer.tokenType} color={otherPlayer.color} size={28} />
          ) : incoming ? (
            <ArrowDownLeft size={16} />
          ) : outgoing ? (
            <ArrowUpRight size={16} />
          ) : (
            <Receipt size={16} />
          )}
        </span>
        <span className="txn-main">
          <strong className="truncate">{t.reason}</strong>
          <small className="truncate">
            {name(t.fromId)} → {name(t.toId)} · {timeAgo(t.ts)}
          </small>
        </span>
        <span className="txn-amount tnum">
          {incoming ? '+' : outgoing ? '-' : ''}
          {money(t.amount)}
        </span>
      </li>
    );
  };

  return (
    <div className="bank-view">
      <section className="vault">
        <div className="vault-head">
          <span className="vault-icon">
            <Landmark size={22} />
          </span>
          <div>
            <h3 className="display">Bank of TMpoly</h3>
            <small>Salary, taxes, sales, mortgages and auctions all go through the Bank.</small>
          </div>
        </div>
        <div className="vault-grid">
          <Supply label="Houses" left={bank?.houses ?? BANK_HOUSES} total={BANK_HOUSES} icon={<Home size={16} />} kind="house" />
          <Supply label="Hotels" left={bank?.hotels ?? BANK_HOTELS} total={BANK_HOTELS} icon={<Building2 size={16} />} kind="hotel" />
        </div>
        <div className="vault-stats">
          <div>
            <span>Deeds for sale</span>
            <strong className="tnum">{unsold}</strong>
          </div>
          <div>
            <span>Cash in play</span>
            <strong className="tnum">{money(circulating)}</strong>
          </div>
        </div>
      </section>

      {game.phase === 'AUCTION' && auctionKey(game) && <LiveAuction game={game} />}

      <section className="statement">
        <header className="statement-head">
          <h3 className="section-title">Statement</h3>
          <div className="segmented small" role="tablist">
            <button role="tab" className={scope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}>
              Mine
            </button>
            <button role="tab" className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
              Everyone
            </button>
          </div>
        </header>
        {txns.length === 0 ? (
          <div className="empty-state">
            <Receipt size={26} />
            <span>No transactions yet.</span>
          </div>
        ) : (
          <ol className="txn-list">{txns.map(row)}</ol>
        )}
      </section>
    </div>
  );
};
