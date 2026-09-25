import React, { useState } from 'react';
import { Box, Home, MessageSquare, ScrollText, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';
import { ActionPanel } from './ActionPanel.js';
import { ActivityLog } from './ActivityLog.js';
import { ChatView } from './ChatView.js';
import { PlayerStrip } from './Players.js';
import { Portfolio } from './Portfolio.js';
import { DiceReadout, MuteButton, TurnIdentity } from './TurnHeader.js';
import { useTurn } from './useTurn.js';
import { useUnreadChat } from './useUnread.js';
import { ownedBy } from '../theme.js';

type Tab = 'board' | 'assets' | 'log' | 'chat';

const SHEET_TITLE: Record<Exclude<Tab, 'board'>, string> = {
  assets: 'My properties',
  log: 'Activity',
  chat: 'Table chat'
};

// Mobile: full-bleed board with a status bar on top and a native-style
// tab bar at the bottom. Tabs other than Board open a bottom sheet.
export const MobileHUD: React.FC = () => {
  const turn = useTurn();
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [tab, setTab] = useState<Tab>('board');
  const unread = useUnreadChat(tab === 'chat');

  if (!turn) return null;
  const { game } = turn;
  const myCount = ownedBy(game, myPlayerId).length;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number; alert?: boolean }[] = [
    { id: 'board', label: 'Board', icon: <Box size={22} /> },
    { id: 'assets', label: 'Assets', icon: <Home size={22} />, badge: myCount },
    { id: 'log', label: 'Activity', icon: <ScrollText size={22} /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={22} />, badge: unread, alert: true }
  ];

  return (
    <div className="m-hud">
      <header className={`m-top hud-top-bar ${turn.isMyTurn ? 'my-turn' : ''}`}>
        <div className="m-top-row">
          <TurnIdentity turn={turn} size={32} />
          <DiceReadout d1={turn.d1} d2={turn.d2} size={18} />
          <MuteButton />
        </div>
        <PlayerStrip game={game} myPlayerId={myPlayerId} />
      </header>

      {tab !== 'board' && (
        <>
          <div className="m-sheet-scrim" onClick={() => setTab('board')} />
          <section className="m-sheet" role="dialog" aria-label={SHEET_TITLE[tab]}>
            <div className="sheet-handle" />
            <header className="m-sheet-head">
              <h2>{SHEET_TITLE[tab]}</h2>
              <button className="icon-btn outlined" onClick={() => setTab('board')} aria-label="Close">
                <X size={18} />
              </button>
            </header>
            <div className={`m-sheet-body ${tab === 'chat' ? 'no-scroll' : ''}`}>
              {tab === 'assets' && <Portfolio />}
              {tab === 'log' && <ActivityLog />}
              {tab === 'chat' && <ChatView />}
            </div>
          </section>
        </>
      )}

      <div className="m-bottom">
        {tab === 'board' && (
          <div className="m-action">
            <ActionPanel />
          </div>
        )}
        <nav className="m-tabbar" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab((cur) => (cur === t.id && t.id !== 'board' ? 'board' : t.id))}
            >
              <span className="tab-icon">
                {t.icon}
                {!!t.badge && <span className={`tab-badge ${t.alert ? 'alert' : ''}`}>{t.badge > 99 ? '99+' : t.badge}</span>}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
