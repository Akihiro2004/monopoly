import React from 'react';
import { Smartphone } from 'lucide-react';

// Phones held sideways get a "turn me" card: the game is designed for
// portrait. Pure CSS decides visibility (see .rotate-overlay).
export const RotateOverlay: React.FC = () => (
  <div className="rotate-overlay" role="alert">
    <div className="rotate-card paper">
      <Smartphone size={44} className="rotate-icon" />
      <strong className="display">Turn your phone upright</strong>
      <span>TMpoly plays best in portrait.</span>
    </div>
  </div>
);
