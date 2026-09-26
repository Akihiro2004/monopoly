import React, { useState } from 'react';
import { ChevronRight, Handshake, Home, Landmark, MessageSquare, PanelRightOpen, ScrollText } from 'lucide-react';
import { BankView } from '../bank/BankView.js';
import { useGameStore } from '../../store/gameStore.js';
import { ActivityLog } from './ActivityLog.js';
import { ChatView } from './ChatView.js';
import { Portfolio } from './Portfolio.js';
import { TradeView } from '../trade/TradeView.js';
import { useUnreadChat } from './useUnread.js';
import { useHudBadges } from './useHudBadges.js';
import { ChatBubbles } from './ChatBubbles.js';
import { money } from '../theme.js';

type Tab = 'assets' | 'trade' | 'bank' | 'log' | 'chat';

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'assets', label: 'Assets', icon: Home },
  { id: 'trade', label: 'Trade', icon: Handshake },
  { id: 'bank', label: 'Bank', icon: Landmark },
  { id: 'log', label: 'Log', icon: ScrollText },
  { id: 'chat', label: 'Chat', icon: MessageSquare }
];

// Desktop right panel: a floating card that collapses into a slim dock of
// round buttons that still show cash, deeds, trade offers and unread chat.
export const SidePanel: React.FC = () => {
  const collapsed = useGameStore((s) => s.panelCollapsed);
  const setCollapsed = useGameStore((s) => s.setPanelCollapsed);
  const [tab, setTab] = useState<Tab>('assets');
  const unread = useUnreadChat(!collapsed && tab === 'chat');
  const { deeds, incomingTrades, auctionLive, myCash } = useHudBadges();

  const badge = (id: Tab) =>
    id === 'assets' ? deeds : id === 'trade' ? incomingTrades : id === 'bank' ? auctionLive : id === 'chat' ? unread : 0;
  const alert = (id: Tab) => id === 'trade' || id === 'bank' || id === 'chat';

  const open = (id: Tab) => {
    setTab(id);
    setCollapsed(false);
  };

  if (collapsed) {
    return (
      <aside className="panel-dock" aria-label="Game panel (collapsed)">
        <button className="dock-cash paper" onClick={() => open('assets')} title="My assets">
          <small>Cash</small>
          <span className="money tnum">{money(myCash)}</span>
        </button>
        {TABS.map((t) => (
          <div key={t.id} className="dock-slot">
            <button className={`dock-btn dock-${t.id}`} onClick={() => open(t.id)} title={t.label} aria-label={t.label}>
              <t.icon size={21} />
              {badge(t.id) > 0 && <span className={`dot-badge ${alert(t.id) ? 'alert' : ''}`}>{badge(t.id)}</span>}
            </button>
            {t.id === 'chat' && <ChatBubbles hidden={false} placement="left" onOpen={() => open('chat')} />}
          </div>
        ))}
        <button className="dock-btn dock-expand" onClick={() => setCollapsed(false)} title="Expand panel" aria-label="Expand panel">
          <PanelRightOpen size={20} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="side-panel paper" aria-label="Game panel">
      <header className="side-head">
        <nav className="side-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <t.icon size={17} />
              <span>{t.label}</span>
              {badge(t.id) > 0 && <span className={`dot-badge ${alert(t.id) ? 'alert' : ''}`}>{badge(t.id)}</span>}
            </button>
          ))}
          <ChatBubbles hidden={tab === 'chat'} placement="below" onOpen={() => setTab('chat')} />
        </nav>
        <button className="icon-btn side-collapse" onClick={() => setCollapsed(true)} title="Collapse panel" aria-label="Collapse panel">
          <ChevronRight size={20} strokeWidth={3} />
        </button>
      </header>
      <div className={`side-body ${tab === 'chat' ? 'no-scroll' : ''}`}>
        {tab === 'assets' && <Portfolio />}
        {tab === 'trade' && <TradeView />}
        {tab === 'bank' && <BankView />}
        {tab === 'log' && <ActivityLog />}
        {tab === 'chat' && <ChatView autoFocus />}
      </div>
    </aside>
  );
};
