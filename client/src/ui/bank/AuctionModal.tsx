import React from 'react';
import { AUCTION_MIN_INCREMENT, AUCTION_MS, BOARD_TILES } from '@monopoly/shared';
import { Gavel } from 'lucide-react';
import { socket } from '../../net/socket.js';
import { useGameStore } from '../../store/gameStore.js';
import { audioManager } from '../../sound/audioManager.js';
import { Modal } from '../common/Modal.js';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { TitleDeed } from '../common/TitleDeed.js';
import { useCountdown } from '../game/useCountdown.js';
import { auctionKey, money } from '../theme.js';

const RING = 2 * Math.PI * 20;
const STEPS = [AUCTION_MIN_INCREMENT, 50, 100];

export const placeBid = (amount: number) => {
  audioManager.playClick();
  socket.emit('auction:bid', { amount });
};

// Bank auction: every player can bid until the hammer falls.
export const AuctionModal: React.FC = () => {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isWalking = useGameStore((s) => s.isWalking);
  const cardOpen = useGameStore((s) => s.cardDraw !== null);
  const dismissed = useGameStore((s) => s.dismissedAuction);
  const setDismissed = useGameStore((s) => s.setDismissedAuction);
  const left = useCountdown(game?.auction?.endsAt);

  if (!game || game.phase !== 'AUCTION' || !game.auction || isWalking || cardOpen) return null;
  const key = auctionKey(game);
  if (key && dismissed === key) return null;
  const me = game.players.find((p) => p.playerId === myPlayerId);
  if (!me || me.isBankrupt) return null;

  const { auction } = game;
  const tile = BOARD_TILES[auction.tileIndex];
  const leader = game.players.find((p) => p.playerId === auction.highBidderId);
  const iLead = auction.highBidderId === myPlayerId;
  const progress = Math.min(1, (left * 1000) / AUCTION_MS);

  return (
    <Modal width={440} label={`Auction for ${tile.name}`}>
      <div className="modal-pad auction">
        <div className="fb-head">
          <span className="fb-icon">
            <Gavel size={22} />
          </span>
          <div>
            <h2>Bank auction!</h2>
            <p>Highest bid when the timer runs out wins. Anyone can bid.</p>
          </div>
          <svg className={`fb-timer ${left <= 5 ? 'urgent' : ''}`} viewBox="0 0 48 48" aria-label={`${left} seconds left`}>
            <circle cx="24" cy="24" r="20" className="track" />
            <circle cx="24" cy="24" r="20" className="bar" strokeDasharray={RING} strokeDashoffset={RING * (1 - progress)} />
            <text x="24" y="29" textAnchor="middle">
              {left}
            </text>
          </svg>
        </div>

        <div className="auction-body">
          <div className="auction-deed">
            <TitleDeed tileIndex={tile.index} />
          </div>
          <div className="auction-bid">
            <span className="auction-label">Top bid</span>
            <strong key={auction.highBid} className="auction-amount tnum">
              {auction.highBid > 0 ? money(auction.highBid) : '—'}
            </strong>
            {leader ? (
              <span className={`auction-leader ${iLead ? 'me' : ''}`}>
                <PlayerAvatar token={leader.tokenType} color={leader.color} size={24} />
                {iLead ? 'You lead!' : leader.name}
              </span>
            ) : (
              <span className="auction-leader">No bids yet</span>
            )}
            <span className="auction-cash tnum">Your cash {money(me.money)}</span>
          </div>
        </div>

        <div className="auction-buttons">
          {STEPS.map((step) => {
            const amount = auction.highBid + step;
            return (
              <button
                key={step}
                className="btn btn-gold btn-lg btn-bid"
                onClick={() => placeBid(amount)}
                disabled={iLead || amount > me.money || left <= 0}
              >
                <span className="btn-stack">
                  <span className="tnum">+{money(step)}</span>
                  <small className="tnum">{money(amount)}</small>
                </span>
              </button>
            );
          })}
        </div>

        <button className="btn btn-secondary btn-block btn-auction-pass" onClick={() => key && setDismissed(key)}>
          Not interested
        </button>
      </div>
    </Modal>
  );
};
