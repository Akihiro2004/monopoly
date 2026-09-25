import React, { useEffect, useState } from 'react';
import { useGameStore, initSocketListeners } from './store/gameStore.js';
import { socket, loadSession, clearSession, saveSession } from './net/socket.js';
import { HomeScreen } from './ui/HomeScreen.js';
import { LobbyScreen } from './ui/LobbyScreen.js';
import { GameHUD } from './ui/GameHUD.js';
import { BuyPropertyModal } from './ui/BuyPropertyModal.js';
import { ForceBuyModal } from './ui/ForceBuyModal.js';
import { CardModal } from './ui/CardModal.js';
import { DebtModal } from './ui/DebtModal.js';
import { VictoryOverlay } from './ui/VictoryOverlay.js';
import { ToastContainer } from './ui/ToastContainer.js';
import { MonopolyScene } from './three/Scene.js';
import { useIsMobile } from './hooks/useIsMobile.js';
import { Logo, Sky } from './ui/common/Sky.js';
import { IncomingTradeModal } from './ui/trade/IncomingTradeModal.js';
import { RotateOverlay } from './ui/common/RotateOverlay.js';

export function App() {
  const roomState = useGameStore((s) => s.roomState);
  const [isReconnecting, setIsReconnecting] = useState(() => loadSession() !== null);
  const isMobile = useIsMobile();
  const inGame = roomState?.status === 'playing';
  const rootClass = `app-root ${isMobile ? 'layout-mobile' : 'layout-desktop'} ${inGame ? 'screen-game' : 'screen-menu'}`;

  useEffect(() => {
    initSocketListeners();

    let cancelled = false;

    const tryReconnect = () => {
      const session = loadSession();
      // Already back in a room, or no saved session: nothing to do.
      if (!session || useGameStore.getState().roomState) {
        if (!cancelled) setIsReconnecting(false);
        return;
      }

      if (!cancelled) setIsReconnecting(true);
      socket.emit(
        'room:reconnect',
        { roomId: session.roomId, playerId: session.playerId, name: session.name },
        (res) => {
          if (cancelled) return;
          if (res.ok) {
            // Keep the session so further reloads / socket reconnects rejoin.
            saveSession(session.roomId, session.name);
          } else {
            // Room is gone (server restart / finished and cleaned up).
            clearSession();
          }
          setIsReconnecting(false);
        }
      );
    };

    // If the socket is already connected, rejoin immediately; otherwise wait.
    if (socket.connected) {
      tryReconnect();
    }
    socket.on('connect', tryReconnect);

    return () => {
      cancelled = true;
      socket.off('connect', tryReconnect);
    };
  }, []);

  // Keep the persisted session in sync while in a room so a reload always
  // knows which room + display name to rejoin with.
  useEffect(() => {
    if (!roomState) return;
    const mySeat = roomState.seats.find(
      (s) => s.playerId === useGameStore.getState().myPlayerId
    );
    if (mySeat) {
      saveSession(roomState.roomId, mySeat.displayName);
    }
    setIsReconnecting(false);
  }, [roomState]);

  if (isReconnecting && !roomState) {
    return (
      <div className={rootClass}>
        <div className="menu-screen">
          <Sky />
          <div className="splash">
            <Logo />
            <div className="splash-card paper">
              <div className="spinner" />
              <p>Rejoining your game…</p>
            </div>
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className={rootClass}>
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
          <BuyPropertyModal />
          <ForceBuyModal />
          <CardModal />
          <DebtModal />
          <IncomingTradeModal />
        </>
      )}

      {/* Victory / Game Over Screen */}
      <VictoryOverlay />

      {/* Global Notifications */}
      <ToastContainer />
      <RotateOverlay />
    </div>
  );
}

export default App;
