import React from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Logo } from '../common/Sky.js';
import { ActionPanel } from './ActionPanel.js';
import { PlayerList } from './Players.js';
import { SidePanel } from './SidePanel.js';
import { DiceReadout, GraphicsButton, FullscreenButton, MuteButton, TurnIdentity } from './TurnHeader.js';
import { useTurn } from './useTurn.js';
import { GameMenuButton } from '../session/GameMenu.js';
import { TurnClock } from '../session/TurnClock.js';

// Desktop: the board fills the window; everything else floats over it.
export const DesktopHUD: React.FC = () => {
  const turn = useTurn();
  const roomId = useGameStore((s) => s.roomState?.roomId);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const collapsed = useGameStore((s) => s.panelCollapsed);

  if (!turn) return null;

  return (
    <div className={`d-hud ${collapsed ? 'panel-collapsed' : ''}`}>
      <div className="d-brand">
        <Logo size="sm" />
        {roomId && <span className="room-chip tnum">Room {roomId}</span>}
      </div>

      <div className="d-players">
        <PlayerList game={turn.game} myPlayerId={myPlayerId} />
      </div>

      <header className={`turn-banner hud-top-bar ${turn.isMyTurn ? 'my-turn' : ''}`}>
        <TurnIdentity turn={turn} size={40} />
        <span className="banner-divider" />
        <DiceReadout d1={turn.d1} d2={turn.d2} />
        <TurnClock />
      </header>

      <div className="d-controls">
        <GameMenuButton />
        <GraphicsButton />
        <MuteButton />
        <FullscreenButton />
      </div>

      <SidePanel />

      <div className="d-dock">
        <ActionPanel variant="desktop" />
      </div>
    </div>
  );
};
