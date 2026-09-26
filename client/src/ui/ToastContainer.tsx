import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle
};

export const ToastContainer: React.FC = () => {
  const toasts = useGameStore((s) => s.toasts);
  const removeToast = useGameStore((s) => s.removeToast);
  const inGame = useGameStore((s) => !!s.roomState && s.roomState.status !== 'waiting');
  const isMobile = useIsMobile();

  // Phones in-game use the compact ticker instead of a toast stack.
  if (inGame && isMobile) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] ?? Info;
        return (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)} role="status">
            <span className="toast-icon">
              <Icon size={17} />
            </span>
            <span className="toast-text">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
};
