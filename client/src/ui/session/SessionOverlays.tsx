import React, { useEffect, useState } from 'react';
import { MonitorSmartphone, WifiOff } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';
import { dropTabSession, socket } from '../../net/socket.js';
import { audioManager } from '../../sound/audioManager.js';

// Shown in game while the connection is down (after a short grace, so a
// blip does not flash it).
export const ConnectionBanner: React.FC = () => {
  const offline = useGameStore((s) => s.offline);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!offline) {
      setShow((was) => {
        if (was) audioManager.playReconnect();
        return false;
      });
      return;
    }
    const t = setTimeout(() => {
      setShow(true);
      audioManager.playDisconnect();
    }, 1200);
    return () => clearTimeout(t);
  }, [offline]);
  if (!show) return null;
  return (
    <div className="conn-banner" role="status">
      <WifiOff size={16} />
      <span>Connection lost. Reconnecting… your seat is safe.</span>
      <span className="spinner sm" />
    </div>
  );
};

// This seat was opened in another tab or device: this one steps aside.
export const ReplacedOverlay: React.FC<{ onUseHere: () => void }> = ({ onUseHere }) => {
  const resetAll = useGameStore((s) => s.resetAll);
  return (
    <div className="modal-backdrop replaced-backdrop" role="dialog" aria-modal="true" aria-label="Game opened elsewhere">
      <div className="dialog replaced-dialog">
        <div className="modal-pad">
          <span className="replaced-icon">
            <MonitorSmartphone size={30} />
          </span>
          <h2 className="display">Playing somewhere else</h2>
          <p>Your seat was opened in another tab or device. Only one window can play at a time.</p>
          <div className="modal-actions">
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                dropTabSession();
                resetAll();
                if (!socket.connected) socket.connect();
              }}
            >
              Close here
            </button>
            <button className="btn btn-primary btn-lg btn-use-here" onClick={onUseHere}>
              Play here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
