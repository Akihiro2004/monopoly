import React, { useState } from 'react';
import { socket, saveSession, loadSession } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import {
  ArrowRight,
  Banknote,
  Castle,
  Hash,
  History,
  LogIn,
  Plus,
  Swords,
  Trophy,
  User,
  Users
} from 'lucide-react';
import { MiniBoard } from './common/MiniBoard.js';

const FEATURES = [
  { icon: Swords, title: 'Force buy', text: 'Take rivals’ built land at 2x.' },
  { icon: Castle, title: 'Landmarks', text: 'Four build levels, landmarks are safe.' },
  { icon: Trophy, title: 'Special wins', text: 'Triple sets or a full board line.' },
  { icon: Banknote, title: 'Sell back', text: 'Raise cash instead of instant bankruptcy.' }
];

type Mode = 'create' | 'join';

export const HomeScreen: React.FC = () => {
  const saved = loadSession();
  const [name, setName] = useState(saved?.name || '');
  const [joinCode, setJoinCode] = useState(saved?.roomId || '');
  const [mode, setMode] = useState<Mode>(saved?.roomId ? 'join' : 'create');
  const [busy, setBusy] = useState(false);
  const addToast = useGameStore((s) => s.addToast);

  const handleCreate = () => {
    if (!name.trim()) return addToast('Enter your name first', 'warning');
    setBusy(true);
    socket.emit('room:create', { name: name.trim() }, (res) => {
      setBusy(false);
      if (!res.ok || !res.roomId) {
        addToast(res.error || 'Failed to create room', 'danger');
      } else {
        saveSession(res.roomId, name.trim());
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return addToast('Enter your name first', 'warning');
    if (joinCode.trim().length < 6) return addToast('Enter the 6-character room code', 'warning');
    setBusy(true);
    const code = joinCode.trim().toUpperCase();
    socket.emit('room:join', { roomId: code, name: name.trim() }, (res) => {
      setBusy(false);
      if (!res.ok) {
        addToast(res.error || 'Failed to join room', 'danger');
      } else {
        saveSession(code, name.trim());
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === 'create') handleCreate();
    else handleJoin();
  };

  return (
    <div className="menu-screen home-screen">
      <div className="menu-bg" />

      <div className="home-layout">
        <section className="home-hero">
          <div className="brand">
            <span className="brand-mark" />
            <span className="brand-name">Monopoly 3D</span>
            <span className="badge gold">Get Rich rules</span>
          </div>

          <div className="hero-art">
            <MiniBoard />
          </div>

          <div className="hero-copy">
            <h1 className="hero-title">
              Roll, build, <span>get rich.</span>
            </h1>
            <p className="hero-sub">
              Real-time 3D Monopoly for up to 6 friends. Nothing to install, just share a room code.
            </p>
          </div>

          <ul className="feature-list">
            {FEATURES.map((f) => (
              <li key={f.title} className="feature">
                <span className="feature-icon">
                  <f.icon size={18} />
                </span>
                <span className="feature-copy">
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-panel">
          <form className="panel-card" onSubmit={submit}>
            <div className="panel-head">
              <h2>{mode === 'create' ? 'Host a game' : 'Join a game'}</h2>
              <p>{mode === 'create' ? 'Create a room and invite friends with the code.' : 'Enter the code your host shared.'}</p>
            </div>

            <div className="segmented" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
                <Plus size={16} /> Create
              </button>
              <button type="button" role="tab" aria-selected={mode === 'join'} className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>
                <Users size={16} /> Join
              </button>
            </div>

            <label className="field">
              <span className="field-label">Your name</span>
              <span className="input-wrap">
                <User size={18} />
                <input
                  className="input"
                  type="text"
                  name="player-name"
                  placeholder="e.g. Alice"
                  autoComplete="nickname"
                  maxLength={15}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </span>
            </label>

            {mode === 'join' && (
              <label className="field">
                <span className="field-label">Room code</span>
                <span className="input-wrap">
                  <Hash size={18} />
                  <input
                    className="input code"
                    type="text"
                    name="room-code"
                    placeholder="ABC123"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  />
                </span>
              </label>
            )}

            <button
              type="submit"
              className={`btn btn-primary btn-lg btn-block ${mode === 'create' ? 'btn-create' : 'btn-join'}`}
              disabled={busy}
            >
              {mode === 'create' ? <Plus size={19} /> : <LogIn size={19} />}
              <span>{busy ? (mode === 'create' ? 'Creating room…' : 'Joining…') : mode === 'create' ? 'Create room' : 'Join room'}</span>
              {!busy && <ArrowRight size={18} className="btn-trail" />}
            </button>

            <p className="panel-hint">
              <History size={14} />
              <span>Your seat is saved. Reload the tab any time to rejoin.</span>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
};
