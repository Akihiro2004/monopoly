import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, PiggyBank, Siren } from 'lucide-react';
import { BOARD_TILES, GameState } from '@monopoly/shared';
import { useGameStore } from '../../store/gameStore.js';
import { audioManager } from '../../sound/audioManager.js';
import { money } from '../theme.js';

// Cash warning tiers: 1 = under $300, 2 = under $200, 3 = under $100.
export const LOW_CASH = [300, 200, 100];
export function cashTier(amount: number): 0 | 1 | 2 | 3 {
  if (amount < LOW_CASH[2]) return 3;
  if (amount < LOW_CASH[1]) return 2;
  if (amount < LOW_CASH[0]) return 1;
  return 0;
}

// Highest rent a visitor could owe right now (other players' deeds).
function worstRent(game: GameState, myId: string): number {
  let worst = 0;
  for (const p of Object.values(game.properties)) {
    if (!p.ownerId || p.ownerId === myId || p.isMortgaged) continue;
    const t = BOARD_TILES[p.tileIndex];
    if (t.type !== 'property') continue;
    worst = Math.max(worst, t.rentByLevel[p.buildLevel] ?? 0);
  }
  return worst;
}

const COPY: Record<1 | 2 | 3, { icon: typeof Siren; title: string; tip: string[] }> = {
  1: {
    icon: PiggyBank,
    title: 'Heads up: under $300',
    tip: ['Maybe hold off on the next upgrade.', 'Passing GO pays $200.', 'A good moment to plan ahead.']
  },
  2: {
    icon: AlertTriangle,
    title: 'Cash is getting low',
    tip: ['Keep some cash for rent.', 'Selling a house back gets you half its cost.', 'Mortgaging bare land is a quick cash boost.']
  },
  3: {
    icon: Siren,
    title: 'Almost broke!',
    tip: ['Open Assets to sell or mortgage.', 'A trade could save you.', 'One bad landing could mean debt.']
  }
};

// A small note next to my own player card when my cash drops below a tier.
// Each tier warns once on the way down; it re-arms only after the balance
// recovers comfortably ($50 above the tier), so it never nags.
export const LowCashAlert: React.FC<{ amount: number; className?: string }> = ({ amount, className = '' }) => {
  const game = useGameStore((s) => s.gameState);
  const myId = useGameStore((s) => s.myPlayerId);
  const armed = useRef<number>(cashTier(amount)); // tiers already warned about
  const [shown, setShown] = useState<{ tier: 1 | 2 | 3; key: number; tip: string } | null>(null);

  useEffect(() => {
    const tier = cashTier(amount);
    if (tier > armed.current) {
      armed.current = tier;
      const copy = COPY[tier as 1 | 2 | 3];
      setShown({ tier: tier as 1 | 2 | 3, key: Date.now(), tip: copy.tip[Math.floor(Math.random() * copy.tip.length)] });
      audioManager.playLowCash(tier as 1 | 2 | 3);
    } else {
      // Re-arm tiers once the balance is back above them with some margin.
      while (armed.current > 0 && amount >= LOW_CASH[armed.current - 1] + 50) armed.current -= 1;
    }
  }, [amount]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 5000);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown || !game || game.phase === 'GAME_OVER' || game.phase === 'DEBT') return null;
  const copy = COPY[shown.tier];
  const Icon = copy.icon;
  const worst = worstRent(game, myId);
  return (
    <div key={shown.key} className={`low-cash t${shown.tier} ${className}`} role="status" onClick={() => setShown(null)}>
      <span className="low-cash-icon">
        <Icon size={18} />
      </span>
      <span className="low-cash-text">
        <b>{copy.title}</b>
        <span>
          You have {money(amount)}. {shown.tip}
          {worst > amount && shown.tier >= 2 ? ` The priciest rent on the board is ${money(worst)}.` : ''}
        </span>
      </span>
    </div>
  );
};
