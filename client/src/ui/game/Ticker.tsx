import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

// Mobile replacement for toast stacks: one small line under the status bar
// showing the latest event, fading out after a few seconds.
export const Ticker: React.FC<{ onOpenLog: () => void }> = ({ onOpenLog }) => {
  const ticker = useGameStore((s) => s.ticker);
  const [visibleId, setVisibleId] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    setVisibleId(ticker.id);
    const t = setTimeout(() => setVisibleId((v) => (v === ticker.id ? null : v)), 3600);
    return () => clearTimeout(t);
  }, [ticker]);

  if (!ticker || visibleId !== ticker.id) return null;
  const Icon = ICONS[ticker.type] ?? Info;
  return (
    <button key={ticker.id} className={`ticker ${ticker.type}`} onClick={onOpenLog}>
      <Icon size={15} />
      <span className="truncate">{ticker.text}</span>
    </button>
  );
};
