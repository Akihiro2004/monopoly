import React, { useRef, useState } from 'react';
import { socket, saveSession, loadSession } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import {
  ArrowRight,
  Banknote,
  Car,
  Castle,
  Crown,
  Handshake,
  History,
  KeyRound,
  LogIn,
  Plus,
  Swords,
  Trophy,
  User
} from 'lucide-react';
import { Logo, Sky } from './common/Sky.js';
import { PipDie } from './PipDie.js';
import { useInstall } from '../hooks/useInstall.js';
import { Download, Share } from 'lucide-react';

// House rules, dealt like a hand of Chance cards.
const RULE_CARDS = [
  { icon: Swords, title: 'Force buy', text: 'Snatch a rival’s built city for double its value.', tone: 'red' },
  { icon: Castle, title: 'Landmarks', text: 'Build house, building, hotel, then an untouchable landmark.', tone: 'orange' },
  { icon: Trophy, title: 'Instant wins', text: 'Own three full countries or a whole side of the board.', tone: 'gold' },
  { icon: Handshake, title: 'Wheel & deal', text: 'Trade cash and cities with anyone, any time.', tone: 'blue' },
  { icon: Banknote, title: 'Never broke', text: 'Sell, mortgage or trade your way out of debt.', tone: 'green' }
] as const;

// A CSS 3D die: faces 1..6, tumbles now and then (pure transforms).
const Die3D: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`die3d ${className}`} aria-hidden="true">
    <div className="die3d-cube">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <span key={n} className={`die3d-face f${n}`}>
          <PipDie value={n} size={58} />
        </span>
      ))}
    </div>
  </div>
);

type Mode = 'create' | 'join';

export const HomeScreen: React.FC = () => {
  const saved = loadSession();
  const [name, setName] = useState(saved?.name || '');
  const [joinCode, setJoinCode] = useState(saved?.roomId || '');
  const [mode, setMode] = useState<Mode>(saved?.roomId ? 'join' : 'create');
  const [busy, setBusy] = useState(false);
  const [codeFocus, setCodeFocus] = useState(false);
  const [openCard, setOpenCard] = useState<number | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const addToast = useGameStore((s) => s.addToast);
  const install = useInstall();
  const [iosHelp, setIosHelp] = useState(false);

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

  const greeting = name.trim() ? `Hi ${name.trim()}! Ready to get rich?` : 'Hey there! What should we call you?';

  return (
    <div className="menu-screen home-screen">
      <Sky town />

      <div className="home-layout">
        <section className="home-hero">
          <div className="hero-title">
            <Logo />
            <span className="hero-tag">
              <Crown size={15} /> World cities edition
            </span>
          </div>
          <p className="hero-sub">
            Roll, buy and build your way across <b>8 countries</b> with up to <b>6 friends</b>. Real time, right in your
            browser.
          </p>

          <div className="hero-toys">
            <Die3D className="d1" />
            <Die3D className="d2" />
            <span className="toy-bill b1">$500</span>
            <span className="toy-bill b2">$100</span>
            <span className="toy-coin">$</span>
          </div>

          <div className={`rule-fan ${openCard !== null ? 'has-open' : ''}`} role="list" aria-label="House rules">
            {RULE_CARDS.map((c, i) => (
              <button
                type="button"
                role="listitem"
                key={c.title}
                className={`rule-card tone-${c.tone} ${openCard === i ? 'open' : ''}`}
                style={{ '--i': i - (RULE_CARDS.length - 1) / 2 } as React.CSSProperties}
                onClick={() => setOpenCard((o) => (o === i ? null : i))}
              >
                <span className="rule-card-top">
                  <c.icon size={22} strokeWidth={2.4} />
                </span>
                <strong>{c.title}</strong>
                <span className="rule-card-text">{c.text}</span>
                <span className="rule-card-foot">TMpoly</span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-panel">
          <form className="deed-form" onSubmit={submit}>
            <header className={`deed-head ${mode}`}>
              <small>Title deed</small>
              <h2>{mode === 'create' ? 'Host a table' : 'Join a table'}</h2>
            </header>

            <div className="deed-body">
              <div className="mascot-row" aria-live="polite">
                <span className="mascot">
                  <Car size={26} strokeWidth={2.4} />
                </span>
                <span className="mascot-bubble" key={greeting}>
                  {greeting}
                </span>
              </div>

              <label className="field">
                <span className="field-label">Your name</span>
                <span className="input-wrap">
                  <User size={19} />
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

              <div className="mode-tickets" role="tablist" aria-label="Host or join">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'create'}
                  className={`ticket create ${mode === 'create' ? 'active' : ''}`}
                  onClick={() => setMode('create')}
                >
                  <span className="ticket-icon">
                    <Plus size={20} strokeWidth={3} />
                  </span>
                  <span className="ticket-copy">
                    <b>New table</b>
                    <small>Get a code to share</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'join'}
                  className={`ticket join ${mode === 'join' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('join');
                    setTimeout(() => codeRef.current?.focus(), 50);
                  }}
                >
                  <span className="ticket-icon">
                    <KeyRound size={19} strokeWidth={2.6} />
                  </span>
                  <span className="ticket-copy">
                    <b>Have a code</b>
                    <small>Join your friends</small>
                  </span>
                </button>
              </div>

              {mode === 'join' && (
                <label className="field code-field">
                  <span className="field-label">Room code</span>
                  <span className="code-boxes" onClick={() => codeRef.current?.focus()}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <span
                        key={i}
                        className={`code-box ${joinCode[i] ? 'filled' : ''} ${
                          codeFocus && i === Math.min(joinCode.length, 5) ? 'caret' : ''
                        }`}
                      >
                        {joinCode[i] ?? ''}
                      </span>
                    ))}
                    <input
                      ref={codeRef}
                      className="code-input"
                      type="text"
                      name="room-code"
                      aria-label="Room code"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={6}
                      value={joinCode}
                      onFocus={() => setCodeFocus(true)}
                      onBlur={() => setCodeFocus(false)}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    />
                  </span>
                </label>
              )}

              <button
                type="submit"
                className={`btn btn-primary btn-xl btn-block btn-go ${mode === 'create' ? 'btn-create' : 'btn-join'}`}
                disabled={busy}
              >
                {mode === 'create' ? <Plus size={22} strokeWidth={3} /> : <LogIn size={22} strokeWidth={3} />}
                <span>{busy ? (mode === 'create' ? 'Setting the table…' : 'Joining…') : mode === 'create' ? 'Create room' : 'Join room'}</span>
                {!busy && <ArrowRight size={20} strokeWidth={3} className="btn-trail" />}
              </button>

              {install.canPrompt && (
                <button type="button" className="btn btn-gold btn-block btn-install" onClick={() => install.install()}>
                  <Download size={18} strokeWidth={2.6} /> Install app
                </button>
              )}
              {install.showIosHelp && (
                <button type="button" className="btn btn-secondary btn-block btn-install" onClick={() => setIosHelp((v) => !v)}>
                  <Share size={17} strokeWidth={2.6} /> Install on iPhone
                </button>
              )}
              {iosHelp && (
                <p className="ios-help">
                  Tap <Share size={14} /> <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>. It opens full screen like a real app.
                </p>
              )}

              <p className="panel-hint">
                <History size={14} />
                <span>Your seat is saved. Reload any time to rejoin.</span>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
