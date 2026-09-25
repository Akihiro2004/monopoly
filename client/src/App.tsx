import React, { useEffect } from 'react';
import { useGameStore, initSocketListeners } from './store/gameStore.js';
import { HomeScreen } from './ui/HomeScreen.js';
import { LobbyScreen } from './ui/LobbyScreen.js';
import { GameHUD } from './ui/GameHUD.js';
import { ForceBuyModal } from './ui/ForceBuyModal.js';
import { VictoryOverlay } from './ui/VictoryOverlay.js';
import { ChatPanel } from './ui/ChatPanel.js';
import { ToastContainer } from './ui/ToastContainer.js';
import { MonopolyScene } from './three/Scene.js';
import './App.css';

export function App() {
  const roomState = useGameStore((s) => s.roomState);
  const gameState = useGameStore((s) => s.gameState);

  useEffect(() => {
    initSocketListeners();
  }, []);

  return (
    <div className="app-root">
      {/* 3D Monopoly Canvas (rendered when in playing/finished state) */}
      {roomState?.status === 'playing' && <MonopolyScene />}

      {/* Screen 1: Home / Room Creation & Joining */}
      {!roomState && <HomeScreen />}

      {/* Screen 2: Waiting Lobby */}
      {roomState && roomState.status === 'waiting' && <LobbyScreen />}

      {/* Screen 3: Game HUD Overlays (when playing) */}
      {roomState && roomState.status === 'playing' && (
        <>
          <GameHUD />
          <ForceBuyModal />
          <ChatPanel />
        </>
      )}

      {/* Victory / Game Over Screen */}
      <VictoryOverlay />

      {/* Global Notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;

