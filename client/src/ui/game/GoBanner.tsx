import React, { useEffect, useRef, useState } from 'react';
import { GO_SALARY } from '@monopoly/shared';
import { useGameStore } from '../../store/gameStore.js';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { money } from '../theme.js';

// "PASSED GO! +$200" sticker that pops over the board for a moment.
export const GoBanner: React.FC = () => {
  const celebration = useGameStore((s) => s.goCelebration);
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [shownId, setShownId] = useState<number | null>(null);
  const seenAtMount = useRef(celebration?.id);

  useEffect(() => {
    if (!celebration || celebration.id === seenAtMount.current) return;
    setShownId(celebration.id);
    const t = setTimeout(() => setShownId((v) => (v === celebration.id ? null : v)), 2600);
    return () => clearTimeout(t);
  }, [celebration]);

  if (!celebration || shownId !== celebration.id || !game) return null;
  const player = game.players.find((p) => p.playerId === celebration.playerId);
  if (!player) return null;

  return (
    <div className="go-banner" key={celebration.id} aria-live="polite">
      <div className="go-rays" />
      <div className="go-card">
        <PlayerAvatar token={player.tokenType} color={player.color} size={46} ring />
        <div className="go-copy">
          <span className="go-title">Passed GO!</span>
          <span className="go-sub">{player.playerId === myPlayerId ? 'You collect' : `${player.name} collects`}</span>
        </div>
        <span className="go-amount tnum">+{money(GO_SALARY)}</span>
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="go-coin" style={{ '--i': i } as React.CSSProperties} />
      ))}
    </div>
  );
};
