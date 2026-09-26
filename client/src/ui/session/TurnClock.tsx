import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';
import { audioManager } from '../../sound/audioManager.js';

// Countdown for the current decision (server turn timer / away players).
export const TurnClock: React.FC = () => {
  const deadline = useGameStore((s) => s.gameState?.turnDeadline ?? null);
  const mine = useGameStore(
    (s) => !!s.gameState && s.gameState.players[s.gameState.currentPlayerIndex]?.playerId === s.myPlayerId
  );
  const total = useGameStore((s) => s.roomState?.settings.turnTimeoutSec ?? 0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);

  const left = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  // A soft tick in the last seconds of my own turn.
  useEffect(() => {
    if (mine && left > 0 && left <= 5) audioManager.playClockTick();
  }, [left, mine]);

  if (!deadline) return null;
  const span = Math.max(total, 20);
  const pct = Math.min(100, (left / span) * 100);
  return (
    <span
      className={`turn-clock ${left <= 10 ? 'urgent' : ''} ${mine ? 'mine' : ''}`}
      title={mine ? 'When time runs out the game plays this step for you' : 'Time left for this move'}
      style={{ '--p': `${pct}%` } as React.CSSProperties}
    >
      <Timer size={14} strokeWidth={2.6} />
      <b className="tnum">{left}s</b>
    </span>
  );
};
