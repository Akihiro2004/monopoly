import React, { useState } from 'react';
import { Box, Handshake, Home, MessageSquare, ScrollText, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';
import { ActionPanel } from './ActionPanel.js';
import { ActivityLog } from './ActivityLog.js';
import { ChatView } from './ChatView.js';
import { PlayerStrip } from './Players.js';
import { Portfolio } from './Portfolio.js';
import { TradeView } from '../trade/TradeView.js';
import { DiceReadout, MuteButton, TurnIdentity } from './TurnHeader.js';
import { Ticker } from './Ticker.js';
import { useTurn } from './useTurn.js';
import { useUnreadChat } from './useUnread.js';
import { useHudBadges } from './useHudBadges.js';

type Tab = 'board' | 'assets' | 'trade' | 'log' | 'chat';

const SHEET_TITLE: Record<Exclude<Tab, 'board'>, string> = {
  assets: 'My properties',
  trade: 'Trades',
  log: 'Activity',
  chat: 'Table chat'
};

// Mobile (portrait): full-bleed board, a slim status bar, one event line,
// and a native-style tab bar. Tabs other than Board open a bottom sheet.
export const MobileHUD: React.FC = () => {
  const turn = useTurn();
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [tab, setTab] = useState<Tab>('board');
  const unread = useUnreadChat(tab === 'chat');
  const { deeds, incomingTrades } = useHudBadges();

  if (!turn) return null;

  const tabs: { id: Tab; label: string; icon: typeof Box; badge?: number; alert?: boolean }[] = [
    { id: 'board', label: 'Board', icon: Box },
    { id: 'assets', label: 'Assets', icon: Home, badge: deeds },
    { id: 'trade', label: 'Trade', icon: Handshake, badge: incomingTrades, alert: true },
    { id: 'log', label: 'Log', icon: ScrollText },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: unread, alert: true }
  ];

  return (
    <div className="m-hud">
      <header className={`m-top hud-top-bar ${turn.isMyTurn ? 'my-turn' : ''}`}>
        <div className="m-top-row">
          <TurnIdentity turn={turn} size={34} />
          <DiceReadout d1={turn.d1} d2={turn.d2} size={20} />
          <MuteButton />
        </div>
        <PlayerStrip game={turn.game} myPlayerId={myPlayerId} />
      </header>

      {tab === 'board' && (
        <div className="m-ticker-slot">
          <Ticker onOpenLog={() => setTab('log')} />
        </div>
      )}

      {tab !== 'board' && (
        <>
          <div className="m-sheet-scrim" onClick={() => setTab('board')} />
          <section className="m-sheet" role="dialog" aria-label={SHEET_TITLE[tab]}>
            <div className="sheet-handle" />
            <header className="m-sheet-head">
              <h2 className="display">{SHEET_TITLE[tab]}</h2>
              <button className="icon-btn" onClick={() => setTab('board')} aria-label="Close">
                <X size={18} strokeWidth={3} />
              </button>
            </header>
            <div className={`m-sheet-body ${tab === 'chat' ? 'no-scroll' : ''}`}>
              {tab === 'assets' && <Portfolio />}
              {tab === 'trade' && <TradeView />}
              {tab === 'log' && <ActivityLog />}
              {tab === 'chat' && <ChatView />}
            </div>
          </section>
        </>
      )}

      <div className="m-bottom">
        {tab === 'board' && (
          <div className="m-action">
            <ActionPanel variant="mobile" />
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
                <t.icon size={22} />
                {!!t.badge && <span className={`dot-badge ${t.alert ? 'alert' : ''}`}>{t.badge > 99 ? '99+' : t.badge}</span>}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
