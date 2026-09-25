import React, { useState } from 'react';
import { Home, MessageSquare, ScrollText, Users } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';
import { ActionPanel } from './ActionPanel.js';
import { ActivityLog } from './ActivityLog.js';
import { ChatView } from './ChatView.js';
import { PlayerList } from './Players.js';
import { Portfolio } from './Portfolio.js';
import { DiceReadout, MuteButton, TurnIdentity } from './TurnHeader.js';
import { useTurn } from './useTurn.js';
import { useUnreadChat } from './useUnread.js';
import { ownedBy } from '../theme.js';

type Tab = 'assets' | 'log' | 'chat';

// Desktop: docked chrome like a native game client. The 3D canvas is inset
// between the rails (see .layout-desktop .canvas-container).
export const DesktopHUD: React.FC = () => {
  const turn = useTurn();
  const roomId = useGameStore((s) => s.roomState?.roomId);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [tab, setTab] = useState<Tab>('assets');
  const unread = useUnreadChat(tab === 'chat');

  if (!turn) return null;
  const { game } = turn;
  const myCount = ownedBy(game, myPlayerId).length;

  return (
    <div className="d-hud">
      <header className={`d-topbar hud-top-bar ${turn.isMyTurn ? 'my-turn' : ''}`}>
        <div className="d-topbar-left">
          <span className="brand-mark" />
          <span className="brand-name">Monopoly 3D</span>
          {roomId && <span className="badge room-badge tnum">Room {roomId}</span>}
        </div>
        <TurnIdentity turn={turn} />
        <div className="d-topbar-right">
          <DiceReadout d1={turn.d1} d2={turn.d2} />
          <span className="d-divider" />
          <MuteButton />
        </div>
      </header>

      <aside className="d-rail d-rail-left">
        <div className="rail-head">
          <span className="section-title">
            <Users size={14} /> Players
          </span>
          <span className="rail-count tnum">{game.players.filter((p) => !p.isBankrupt).length} in play</span>
        </div>
        <div className="rail-scroll">
          <PlayerList game={game} myPlayerId={myPlayerId} />
        </div>
      </aside>

      <aside className="d-rail d-rail-right">
        <nav className="rail-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'assets'} className={tab === 'assets' ? 'active' : ''} onClick={() => setTab('assets')}>
            <Home size={15} /> Assets {myCount > 0 && <span className="tab-count">{myCount}</span>}
          </button>
          <button role="tab" aria-selected={tab === 'log'} className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>
            <ScrollText size={15} /> Activity
          </button>
          <button role="tab" aria-selected={tab === 'chat'} className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
            <MessageSquare size={15} /> Chat {unread > 0 && <span className="tab-count alert">{unread}</span>}
          </button>
        </nav>
        <div className={`rail-body ${tab === 'chat' ? 'no-scroll' : ''}`}>
          {tab === 'assets' && <Portfolio />}
          {tab === 'log' && <ActivityLog />}
          {tab === 'chat' && <ChatView autoFocus />}
        </div>
      </aside>

      <div className="d-dock">
        <ActionPanel showShortcuts />
      </div>
    </div>
  );
};
