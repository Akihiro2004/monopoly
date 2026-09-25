import React, { useState } from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { Play, LogIn, Sparkles } from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
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
      if (!res.ok) {
        addToast(res.error || 'Failed to create room', 'danger');
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
    socket.emit('room:join', { roomId: joinCode.trim().toUpperCase(), name: name.trim() }, (res) => {
      setIsJoining(false);
      if (!res.ok) {
        addToast(res.error || 'Failed to join room', 'danger');
      }
    });
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-header">
          <div className="logo-badge">
            <Sparkles className="badge-icon" size={20} />
            <span>LINE GET RICH EDITION</span>
          </div>
          <h1 className="game-title">3D MONOPOLY</h1>
          <p className="subtitle">Real-time Multiplayer · Force Buy · 4 Build Levels · Up to 6 Players</p>
        </div>

        <div className="home-form">
          <div className="input-group">
            <label>YOUR NAME</label>
            <input
              type="text"
              placeholder="e.g. Alice"
              maxLength={15}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
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
              <input
                type="text"
                placeholder="6-CHAR ROOM CODE"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              <button className="btn btn-secondary" onClick={handleJoin} disabled={isJoining}>
                <LogIn size={18} />
                <span>{isJoining ? 'Joining...' : 'JOIN'}</span>
              </button>
            </div>
          </div>

          <div className="rules-highlight">
            <div className="highlight-pill">Auto-buy on landing</div>
            <div className="highlight-pill">Force-buy opponents at 2x</div>
            <div className="highlight-pill">Landmark protection</div>
            <div className="highlight-pill">Triple &amp; Line Victory</div>
          </div>
        </div>
      </div>
    </div>
  );
};
