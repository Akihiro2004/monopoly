import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore.js';
import { socket, clearSession } from '../net/socket.js';
import { Home, Sparkles, Star, Trophy } from 'lucide-react';
import { PlayerAvatar } from './common/PlayerAvatar.js';
import { money, netWorth, ownedBy } from './theme.js';

const VICTORY_LABEL = {
  triple_victory: 'Triple Victory · three complete color sets',
  line_victory: 'Line Victory · a whole side of the board',
  bankruptcy: 'Last player standing'
} as const;

// Coins and stars drifting up behind the card (fixed layout: no re-renders).
const FLOATERS = Array.from({ length: 14 }, (_, i) => ({
  kind: i % 3 === 0 ? 'star' : 'coin',
  x: (i * 73) % 100,
  delay: -((i * 1.37) % 7),
  dur: 7 + ((i * 1.9) % 5),
  size: 0.7 + ((i * 0.37) % 0.6)
}));

export const VictoryOverlay: React.FC = () => {
  const winner = useGameStore((s) => s.winner);
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const resetAll = useGameStore((s) => s.resetAll);

  useEffect(() => {
    if (!winner) return;
    const colors = ['#f5b83d', '#ffd477', '#10b981', '#ffffff'];
    confetti({ particleCount: 140, spread: 100, origin: { y: 0.55 }, colors });
    const t = setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
    }, 450);
    // A few gentle extra bursts, then it settles down.
    let n = 0;
    const more = setInterval(() => {
      if (++n > 3) return clearInterval(more);
      confetti({ particleCount: 40, spread: 70, startVelocity: 30, origin: { x: 0.2 + Math.random() * 0.6, y: 0.3 }, colors, scalar: 0.9 });
    }, 2600);
    return () => {
      clearTimeout(t);
      clearInterval(more);
    };
  }, [winner]);

  if (!winner || !gameState) return null;

  const winningPlayer = gameState.players.find((p) => p.playerId === winner.winnerId);
  const standings = [...gameState.players].sort((a, b) => {
    if (a.playerId === winner.winnerId) return -1;
    if (b.playerId === winner.winnerId) return 1;
    if (a.isBankrupt !== b.isBankrupt) return a.isBankrupt ? 1 : -1;
    return netWorth(gameState, b) - netWorth(gameState, a);
  });

  const handleReturnHome = () => {
    socket.emit('room:leave');
    clearSession();
    resetAll();
  };

  return (
    <div className="victory-overlay" role="dialog" aria-label="Game over">
      <div className="victory-rays" aria-hidden="true" />
      <div className="victory-floaters" aria-hidden="true">
        {FLOATERS.map((f, i) => (
          <span
            key={i}
            className={`floater ${f.kind}`}
            style={{ left: `${f.x}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s`, '--s': f.size } as React.CSSProperties}
          >
            {f.kind === 'coin' ? '$' : <Star size={18} fill="currentColor" strokeWidth={2.5} />}
          </span>
        ))}
      </div>
      <div className="victory-card">
        <div className="trophy-wrap">
          <span className="trophy-glow" aria-hidden="true" />
          <div className="trophy-ring">
            <Trophy size={44} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <Sparkles key={i} size={18} className={`trophy-spark s${i}`} aria-hidden="true" />
          ))}
        </div>
        <span className="victory-kicker">{winner.winnerId === myPlayerId ? 'You win!' : 'Game over'}</span>
        <h1 className="victory-title">{winningPlayer?.name ?? 'Someone'} wins</h1>
        <span className="badge gold victory-type">{VICTORY_LABEL[winner.victoryType] ?? VICTORY_LABEL.bankruptcy}</span>

        <ol className="standings">
          {standings.map((p, i) => (
            <li
              key={p.playerId}
              className={p.playerId === winner.winnerId ? 'winner' : ''}
              style={{ animationDelay: `${0.35 + i * 0.12}s` }}
            >
              <span className="rank tnum">{i + 1}</span>
              <PlayerAvatar token={p.tokenType} color={p.color} size={32} dim={p.isBankrupt} />
              <span className="standing-name">
                <span className="truncate">{p.name}</span>
                <small>{p.isBankrupt ? 'Bankrupt' : `${ownedBy(gameState, p.playerId).length} properties`}</small>
              </span>
              <span className="standing-worth tnum">{p.isBankrupt ? '-' : money(netWorth(gameState, p))}</span>
            </li>
          ))}
        </ol>

        <div className="victory-meta">
          <span className="tnum">{gameState.turnNumber} turns</span>
          <span>·</span>
          <span className="tnum">{gameState.players.length} players</span>
        </div>

        <button className="btn btn-primary btn-lg btn-block btn-play-again" onClick={handleReturnHome}>
          <Home size={18} /> Back to home
        </button>
      </div>
    </div>
  );
};
