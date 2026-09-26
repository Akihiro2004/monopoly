import { useGameStore } from '../../store/gameStore.js';
import { ownedBy } from '../theme.js';

// Counts shown as badges on panel tabs / dock buttons / mobile tab bar.
export function useHudBadges() {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  return {
    deeds: game ? ownedBy(game, myPlayerId).length : 0,
    incomingTrades: game ? game.trades.filter((t) => t.toId === myPlayerId).length : 0,
    auctionLive: game?.phase === 'AUCTION' ? 1 : 0,
    myCash: game?.players.find((p) => p.playerId === myPlayerId)?.money ?? 0
  };
}
