import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore.js';
import { Trophy, RefreshCw } from 'lucide-react';

export const VictoryOverlay: React.FC = () => {
  const winner = useGameStore((s) => s.winner);
  const gameState = useGameStore((s) => s.gameState);
  const resetAll = useGameStore((s) => s.resetAll);

  useEffect(() => {
    if (winner) {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [winner]);

  if (!winner || !gameState) return null;

  const winningPlayer = gameState.players.find((p) => p.playerId === winner.winnerId);

  const getVictoryLabel = () => {
    switch (winner.victoryType) {
      case 'triple_victory':
        return 'Triple Victory: 3 complete color sets';
      case 'line_victory':
        return 'Line Victory: every property on one board side';
      case 'bankruptcy':
      default:
        return 'Bankruptcy: last player standing';
    }
  };

  return (
    <div className="victory-overlay">
      <div className="victory-card">
        <Trophy size={64} className="trophy-icon" color="#fbbf24" />
        <h1 className="winner-title">{winningPlayer?.name} WINS!</h1>
        <div className="victory-badge">{getVictoryLabel()}</div>
        <p className="final-net-worth">Final Balance: ${winningPlayer?.money}</p>

        <button className="btn btn-primary btn-play-again" onClick={resetAll}>
          <RefreshCw size={18} />
          <span>RETURN TO HOME</span>
        </button>
      </div>
    </div>
  );
};
