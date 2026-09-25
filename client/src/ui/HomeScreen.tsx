import React, { useState } from 'react';
import { socket, saveSession, loadSession } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import {
  Play,
  LogIn,
  Dices,
  User,
  Hash,
  ScrollText,
  Swords,
  Castle,
  Trophy,
  History,
  Banknote,
  Gift
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const saved = loadSession();
  const [name, setName] = useState(saved?.name || '');
  const [joinCode, setJoinCode] = useState(saved?.roomId || '');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const addToast = useGameStore((s) => s.addToast);

  const handleCreate = () => {
    if (!name.trim()) {
      return addToast('Please enter your player name', 'warning');
    }
    setIsCreating(true);
    socket.emit('room:create', { name: name.trim() }, (res) => {
      setIsCreating(false);
      if (!res.ok || !res.roomId) {
        addToast(res.error || 'Failed to create room', 'danger');
      } else {
        saveSession(res.roomId, name.trim());
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) {
      return addToast('Please enter your player name', 'warning');
    }
    if (!joinCode.trim()) {
      return addToast('Please enter the 6-character room code', 'warning');
    }
    setIsJoining(true);
    const code = joinCode.trim().toUpperCase();
    socket.emit('room:join', { roomId: code, name: name.trim() }, (res) => {
      setIsJoining(false);
      if (!res.ok) {
        addToast(res.error || 'Failed to join room', 'danger');
      } else {
        saveSession(code, name.trim());
      }
    });
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-header">
          <div className="logo-badge">
            <Dices size={14} />
            <span>LINE GET RICH EDITION</span>
          </div>
          <h1 className="game-title">3D MONOPOLY</h1>
          <p className="subtitle">Real-time Multiplayer · Force Buy · 4 Build Levels · Up to 6 Players</p>
        </div>

        <div className="home-form">
          <div className="input-group">
            <label>YOUR NAME</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                placeholder="e.g. Alice"
                maxLength={15}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>

          <div className="actions-section">
            <button className="btn btn-primary" onClick={handleCreate} disabled={isCreating}>
              <Play size={18} />
              <span>{isCreating ? 'Creating Room...' : 'CREATE NEW ROOM'}</span>
            </button>

            <div className="divider">
              <span>OR JOIN WITH CODE</span>
            </div>

            <div className="join-group">
              <div className="input-with-icon" style={{ flex: 1, minWidth: 0 }}>
                <Hash size={16} className="input-icon" />
                <input
                  type="text"
                  className="code-input"
                  placeholder="6-CHAR ROOM CODE"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>
              <button className="btn btn-secondary" onClick={handleJoin} disabled={isJoining}>
                <LogIn size={18} />
                <span>{isJoining ? 'Joining...' : 'JOIN'}</span>
              </button>
            </div>
          </div>

          <div className="rules-highlight">
            <div className="highlight-pill">
              <ScrollText size={14} />
              <span>Property deed purchase</span>
            </div>
            <div className="highlight-pill">
              <Swords size={14} />
              <span>Force-buy opponents at 2x</span>
            </div>
            <div className="highlight-pill">
              <Castle size={14} />
              <span>Landmark protection</span>
            </div>
            <div className="highlight-pill">
              <Trophy size={14} />
              <span>Triple &amp; Line Victory</span>
            </div>
            <div className="highlight-pill">
              <Banknote size={14} />
              <span>Sell back buildings at half price</span>
            </div>
            <div className="highlight-pill">
              <Gift size={14} />
              <span>Chance &amp; Chest card modals</span>
            </div>
          </div>

          <div className="session-hint">
            <History size={14} />
            <span>Session auto-saves — reload the tab to rejoin your room.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
