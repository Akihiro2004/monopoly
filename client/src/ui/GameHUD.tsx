import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { audioManager } from '../sound/audioManager.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { DesktopHUD } from './game/DesktopHUD.js';
import { MobileHUD } from './game/MobileHUD.js';

export const GameHUD: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isMobile = useIsMobile();

  // Turn-start chime when it becomes my turn to roll.
  useEffect(() => {
    if (!gameState) return;
    const cur = gameState.players[gameState.currentPlayerIndex];
    if (cur?.playerId === myPlayerId && gameState.phase === 'ROLLING') {
      audioManager.playTurnAlert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.turnNumber, gameState?.currentPlayerIndex, gameState?.phase, myPlayerId]);

  if (!gameState) return null;
  return isMobile ? <MobileHUD /> : <DesktopHUD />;
};
