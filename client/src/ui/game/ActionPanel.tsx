import React, { useEffect } from 'react';
import { BOARD_TILES, JAIL_FINE } from '@monopoly/shared';
import { ArrowUpCircle, Castle, Check, Dices, Footprints, Gavel, Info, KeyRound, Lock, RotateCcw, Zap } from 'lucide-react';
import { socket } from '../../net/socket.js';
import { audioManager } from '../../sound/audioManager.js';
import { useGameStore } from '../../store/gameStore.js';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { LEVEL_NAMES, money } from '../theme.js';
import { useCountdown } from './useCountdown.js';
import { useTurn } from './useTurn.js';

const click = (fn: () => void) => () => {
  audioManager.playClick();
  fn();
};

const roll = click(() => socket.emit('game:roll'));
const endTurn = click(() => socket.emit('game:endTurn'));
const payJail = click(() => socket.emit('game:payJail'));
const applyJailCard = click(() => socket.emit('game:useJailCard'));

// The one place that decides what the player can do right now. Desktop docks
// it under the board with a big round ROLL button, mobile pins it above the
// tab bar as full-width buttons.
export const ActionPanel: React.FC<{ variant: 'desktop' | 'mobile' }> = ({ variant }) => {
  const turn = useTurn();
  const cardOpen = useGameStore((s) => s.cardDraw !== null);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const forceLeft = useCountdown(turn?.game.forceBuyOffer?.expiresAt);
  const auctionLeft = useCountdown(turn?.game.auction?.endsAt);
  const setDismissedAuction = useGameStore((s) => s.setDismissedAuction);
  const desktop = variant === 'desktop';

  const phase = turn?.game.phase;
  const canAct = turn?.canAct ?? false;

  // Desktop: Space rolls / ends the turn, like a native game client.
  useEffect(() => {
    if (!desktop || !canAct) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || cardOpen) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, button, [contenteditable], [role="dialog"]')) return;
      e.preventDefault();
      if (phase === 'ROLLING') roll();
      else if (phase === 'TURN_ENDED') endTurn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [desktop, canAct, phase, cardOpen]);

  if (!turn || phase === 'GAME_OVER') return null;
  const { game, me, current, isMyTurn, isWalking, upgrade } = turn;
  const kbd = desktop ? <kbd className="kbd">Space</kbd> : null;

  if (isWalking) {
    return (
      <div className={`action-panel ${variant}`}>
        <div className="action-status">
          <Footprints size={18} className="status-icon pulse" />
          <span>{isMyTurn ? 'Moving…' : `${current.name} is moving…`}</span>
        </div>
      </div>
    );
  }

  if (isMyTurn && phase === 'ROLLING') {
    return (
      <div className={`action-panel ${variant}`}>
        {me?.inJail && (
          <div className="jail-row">
            <span className="jail-note">
              <Lock size={14} /> In jail: roll doubles, pay, or use a card
            </span>
            <div className="jail-buttons">
              <button className="btn btn-gold btn-sm" onClick={payJail} disabled={(me?.money ?? 0) < JAIL_FINE}>
                Pay {money(JAIL_FINE)}
              </button>
              {me.jailCards > 0 && (
                <button className="btn btn-blue btn-sm" onClick={applyJailCard}>
                  <KeyRound size={14} /> Free card ({me.jailCards})
                </button>
              )}
            </div>
          </div>
        )}
        {desktop ? (
          <button className="roll-btn btn-roll" onClick={roll} aria-label="Roll dice">
            <Dices size={34} strokeWidth={2.4} />
            <span>ROLL</span>
          </button>
        ) : (
          <button className="btn btn-primary btn-xl btn-main btn-roll" onClick={roll}>
            <Dices size={26} />
            <span>{me?.inJail ? 'Roll for doubles' : 'Roll dice'}</span>
          </button>
        )}
        {desktop && kbd}
      </div>
    );
  }

  if (isMyTurn && phase === 'TURN_ENDED') {
    const again = game.doubles && !me?.inJail && !me?.isBankrupt;
    return (
      <div className={`action-panel ${variant}`}>
        {upgrade?.blocked && (
          <div className="rule-hint">
            <Info size={15} /> {upgrade.blocked}
          </div>
        )}
        <div className="action-row">
          {upgrade && !upgrade.blocked && (
            <button
              className={`btn btn-xl btn-upgrade ${upgrade.nextLevel === 4 ? 'btn-purple landmark' : 'btn-blue'}`}
              onClick={click(() => socket.emit('game:build', { tileIndex: upgrade.prop.tileIndex }))}
              disabled={!upgrade.affordable}
              title={`${upgrade.tile.name}: upgrade to ${LEVEL_NAMES[upgrade.nextLevel]}`}
            >
              {upgrade.nextLevel === 4 ? <Castle size={22} /> : <ArrowUpCircle size={22} />}
              <span className="btn-stack">
                <span>Build {LEVEL_NAMES[upgrade.nextLevel]}</span>
                <small className="tnum">{money(upgrade.cost)}</small>
              </span>
            </button>
          )}
          <button className="btn btn-success btn-xl btn-main btn-end-turn" onClick={endTurn}>
            {again ? <RotateCcw size={22} strokeWidth={3} /> : <Check size={22} strokeWidth={3} />}
            <span>{again ? 'Roll again!' : 'End turn'}</span>
            {kbd}
          </button>
        </div>
      </div>
    );
  }

  // Waiting states: describe what the table is waiting on.
  let tone: 'neutral' | 'danger' = 'neutral';
  let text = `${current.name} is rolling…`;
  let icon: React.ReactNode = <PlayerAvatar token={current.tokenType} color={current.color} size={28} />;

  if (phase === 'AUCTION' && game.auction) {
    const a = game.auction;
    const leader = game.players.find((p) => p.playerId === a.highBidderId);
    return (
      <div className={`action-panel ${variant}`}>
        <div className="action-status auction-status">
          <Gavel size={18} className="status-icon" />
          <span>
            Auction · {BOARD_TILES[a.tileIndex].name} · {a.highBid > 0 ? `${money(a.highBid)} (${leader?.playerId === myPlayerId ? 'you' : leader?.name})` : 'no bids'} ·{' '}
            {auctionLeft}s
          </span>
          {!me?.isBankrupt && (
            <button className="btn btn-gold btn-sm" onClick={() => setDismissedAuction(null)}>
              Bid
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isMyTurn) {
    text = phase === 'DEBT' ? 'Raise cash to cover your debt' : 'Make your choice…';
  } else if (game.forceBuyOffer) {
    const fb = game.forceBuyOffer;
    const tile = BOARD_TILES[fb.tileIndex];
    if (fb.targetPlayerId === myPlayerId) {
      tone = 'danger';
      icon = <Zap size={18} className="status-icon" fill="currentColor" />;
      text = `${current.name} can force-buy your ${tile.name} for ${money(fb.price)} · ${forceLeft}s`;
    } else {
      text = `${current.name} is weighing a force-buy of ${tile.name}… ${forceLeft}s`;
    }
  } else if (game.buyOffer) {
    const tile = BOARD_TILES[game.buyOffer.tileIndex];
    text = `${current.name} is deciding on ${tile.name} (${money(game.buyOffer.price)})`;
  } else if (phase === 'DEBT' && game.debt) {
    text = `${current.name} owes ${money(game.debt.amount)} and is raising cash`;
  } else if (phase === 'TURN_ENDED') {
    text = `${current.name} is finishing their turn`;
  }

  return (
    <div className={`action-panel ${variant}`}>
      <div className={`action-status ${tone}`}>
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
};
