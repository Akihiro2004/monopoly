import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { audioManager } from '../../sound/audioManager.js';
import { PipDie } from '../PipDie.js';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { PHASE_LABEL, playerHex } from '../theme.js';
import { TurnInfo } from './useTurn.js';

export const TurnIdentity: React.FC<{ turn: TurnInfo; size?: number }> = ({ turn, size = 34 }) => {
  const { current, isMyTurn, game } = turn;
  return (
    <div className={`turn-identity ${isMyTurn ? 'mine' : ''}`} style={{ '--c': playerHex(current.color) } as React.CSSProperties}>
      <PlayerAvatar token={current.tokenType} color={current.color} size={size} ring />
      <div className="turn-copy">
        <span className="turn-title">{isMyTurn ? 'Your turn!' : `${current.name}'s turn`}</span>
        <span className="turn-sub">
          Turn {game.turnNumber} · {PHASE_LABEL[game.phase]}
        </span>
      </div>
    </div>
  );
};

export const DiceReadout: React.FC<{ d1: number; d2: number; size?: number }> = ({ d1, d2, size = 22 }) => (
  <div className="dice-readout" aria-label={`Dice ${d1} and ${d2}`}>
    <PipDie value={d1} size={size} />
    <PipDie value={d2} size={size} />
    <span className="dice-sum tnum">{d1 + d2}</span>
    {d1 === d2 && <span className="badge gold dbl">Doubles</span>}
  </div>
);

export const MuteButton: React.FC = () => {
  const [muted, setMuted] = useState(audioManager.isMuted());
  useEffect(() => audioManager.subscribe(setMuted), []);
  return (
    <button
      className={`icon-btn btn-audio-toggle ${muted ? 'muted' : ''}`}
      onClick={() => audioManager.toggleMute()}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      title={muted ? 'Unmute sound' : 'Mute sound'}
    >
      {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
    </button>
  );
};

export const FullscreenButton: React.FC = () => {
  const [full, setFull] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  if (!document.documentElement.requestFullscreen) return null;
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  return (
    <button className="icon-btn" onClick={toggle} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen' : 'Full screen'}>
      {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
  );
};
