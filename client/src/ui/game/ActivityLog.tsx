import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ScrollText, XCircle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`;
}

export const ActivityLog: React.FC = () => {
  const activity = useGameStore((s) => s.activity);

  if (activity.length === 0) {
    return (
      <div className="empty-state">
        <ScrollText size={26} />
        <span>Game events will show up here.</span>
      </div>
    );
  }

  return (
    <ol className="activity-list">
      {[...activity].reverse().map((a) => {
        const Icon = ICONS[a.type] ?? Info;
        return (
          <li key={a.id} className={`activity-item ${a.type}`}>
            <span className="activity-icon">
              <Icon size={15} />
            </span>
            <span className="activity-text">{a.text}</span>
            <time className="activity-time">{timeAgo(a.timestamp)}</time>
          </li>
        );
      })}
    </ol>
  );
};
