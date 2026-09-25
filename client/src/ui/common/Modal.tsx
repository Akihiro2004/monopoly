import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile.js';

interface ModalProps {
  children: React.ReactNode;
  // Called on backdrop tap, Escape, or the close button. Omit for modals the
  // player must answer (buy / force-buy / debt).
  onClose?: () => void;
  width?: number;
  className?: string;
  label?: string;
}

// One modal primitive for the whole app: a centered dialog with a scale-in on
// desktop, a bottom sheet with a grab handle on phones.
export const Modal: React.FC<ModalProps> = ({ children, onClose, width = 420, className = '', label }) => {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={`modal-backdrop ${isMobile ? 'sheet-mode' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`dialog ${className}`}
        style={{ '--dialog-w': `${width}px` } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile && <div className="sheet-handle" />}
        {onClose && !isMobile && (
          <button className="icon-btn dialog-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
