import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const toasts = useGameStore((s) => s.toasts);
  const removeToast = useGameStore((s) => s.removeToast);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type}`} onClick={() => removeToast(t.id)}>
          <span className="toast-text">{t.text}</span>
          <button className="toast-close">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
