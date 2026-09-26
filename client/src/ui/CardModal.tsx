import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Gift, HelpCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore.js';
import { audioManager } from '../sound/audioManager.js';
import { PlayerAvatar } from './common/PlayerAvatar.js';
import { projectDeck } from '../three/deckAnchor.js';

const AUTO_CLOSE_MS = 6500; // spectators' card closes by itself

// A Chance / Community Chest card lifted off its deck on the board: it flies
// from the deck's on-screen position to the middle of the screen face down,
// then flips over. Pure CSS transforms (GPU-composited, no WebGL work).
export const CardModal: React.FC = () => {
  const cardDraw = useGameStore((s) => s.cardDraw);
  const setCardDraw = useGameStore((s) => s.setCardDraw);
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const flightRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  // Start point = where the 3D deck is on screen (fallback: top center).
  useLayoutEffect(() => {
    const el = flightRef.current;
    if (!el || !cardDraw) return;
    setLeaving(false);
    const from = projectDeck(cardDraw.deck) ?? { x: window.innerWidth / 2, y: 40 };
    el.style.setProperty('--fx', `${from.x - window.innerWidth / 2}px`);
    el.style.setProperty('--fy', `${from.y - window.innerHeight / 2}px`);
    el.style.setProperty('--rz', cardDraw.deck === 'chance' ? '-24deg' : '18deg');
  }, [cardDraw]);

  const isMine = cardDraw?.drawerId === myPlayerId;

  useEffect(() => {
    if (!cardDraw || isMine) return;
    const t = setTimeout(() => setCardDraw(null), AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [cardDraw, isMine, setCardDraw]);

  if (!cardDraw) return null;
  const isChance = cardDraw.deck === 'chance';
  const drawer = game?.players.find((p) => p.playerId === cardDraw.drawerId);

  const close = () => {
    if (leaving) return;
    audioManager.playClick();
    setLeaving(true);
    setTimeout(() => setCardDraw(null), 220);
  };

  return (
    <div className={`card-stage ${leaving ? 'leaving' : ''}`} role="dialog" aria-modal="true" aria-label={isChance ? 'Chance card' : 'Community Chest card'}>
      <div className="card-scrim" onClick={close} />
      <div className="card-flight" ref={flightRef} key={cardDraw.id}>
        <div className="card-flip">
          {/* face down: the deck back */}
          <div className={`card-face card-back ${isChance ? 'chance' : 'chest'}`}>
            <span className="card-back-mark">{isChance ? '?' : 'CHEST'}</span>
          </div>
          {/* face up */}
          <div className={`card-face card-front ${isChance ? 'chance' : 'chest'}`}>
            <span className="draw-deck">{isChance ? 'Chance' : 'Community Chest'}</span>
            <span className="draw-icon">{isChance ? <HelpCircle size={38} /> : <Gift size={38} />}</span>
            <h3>{cardDraw.title}</h3>
            <p>{cardDraw.text}</p>
            {cardDraw.detail && <p className="draw-detail">{cardDraw.detail}</p>}
            {drawer && !isMine && (
              <span className="draw-by">
                <PlayerAvatar token={drawer.tokenType} color={drawer.color} size={22} /> {drawer.name} drew this card
              </span>
            )}
            <button className="btn btn-gold btn-lg btn-block btn-card-ok" onClick={close}>
              {isMine ? 'Got it' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
