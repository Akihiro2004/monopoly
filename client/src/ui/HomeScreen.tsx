import React, { useRef, useState } from 'react';
import { useRoomEntry } from './home/useRoomEntry.js';
import { ResumeCard } from './session/Resume.js';
import { AccountChip } from './session/AccountChip.js';
import { ArrowRight, Bot, Crown, Download, Globe2, History, KeyRound, LogIn, Plus, Share, Trophy, User, Users, Zap } from 'lucide-react';
import { Logo } from './common/Logo.js';
import { MenuScene } from './menu/MenuScene.js';
import { useInstall } from '../hooks/useInstall.js';
import { Die3D, RULE_CARDS } from './home/homeParts.js';
import { MobileHome } from './home/MobileHome.js';
import { MuteButton } from './game/TurnHeader.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { useGameStore } from '../store/gameStore.js';
import { audioManager } from '../sound/audioManager.js';

type Mode = 'create' | 'join';

// Phones get the game-style main menu; larger screens the full page.
export const HomeScreen: React.FC = () => (useIsMobile() ? <MobileHome /> : <DesktopHome />);

const FACTS = [
  { icon: Globe2, text: '8 countries' },
  { icon: Users, text: '2–6 players' },
  { icon: Bot, text: 'Bots on tap' },
  { icon: Zap, text: 'Real time' }
];

const DesktopHome: React.FC = () => {
  const { name, setName, busy, create, join } = useRoomEntry();
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<Mode>('create');
  const [codeFocus, setCodeFocus] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const install = useInstall();
  const [iosHelp, setIosHelp] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    audioManager.playClick();
    if (mode === 'create') create();
    else join(joinCode);
  };

  const pickMode = (m: Mode) => {
    setMode(m);
    if (m === 'join') setTimeout(() => codeRef.current?.focus(), 50);
  };

  return (
    <div className="menu-screen mx home-screen">
      <MenuScene />

      <header className="mx-topbar">
        <span className="mx-edition">
          <Crown size={14} strokeWidth={2.8} /> World Cities Edition
        </span>
        <div className="mx-topbar-actions">
          <button
            type="button"
            className="mx-pill gold"
            onClick={() => {
              audioManager.playClick();
              useGameStore.getState().setLeaderboardOpen(true);
            }}
          >
            <Trophy size={16} strokeWidth={2.6} /> Leaderboard
          </button>
          <MuteButton />
        </div>
      </header>

      <main className="home-layout">
        <section className="home-hero">
          <Logo />
          <h1 className="home-headline">
            Roll the dice.
            <br />
            <span>Own the world.</span>
          </h1>
          <p className="home-sub">
            Buy cities across four continents, build them into landmarks and bankrupt your friends, live in the
            browser.
          </p>
          <ul className="home-facts">
            {FACTS.map((f) => (
              <li key={f.text}>
                <f.icon size={15} strokeWidth={2.6} /> {f.text}
              </li>
            ))}
          </ul>
          <ul className="home-features" aria-label="House rules">
            {RULE_CARDS.map((c) => (
              <li key={c.title} className={`tone-${c.tone}`}>
                <span className="home-feature-icon">
                  <c.icon size={19} strokeWidth={2.4} />
                </span>
                <span>
                  <b>{c.title}</b>
                  <small>{c.text}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-play">
          <div className="home-toys" aria-hidden="true">
            <Die3D className="d1" />
            <Die3D className="d2" />
            <span className="mx-coin c1">$</span>
            <span className="mx-coin c2">$</span>
          </div>

          <form className="mx-panel play-panel" onSubmit={submit}>
            <AccountChip />
            <ResumeCard />

            <label className="mx-field">
              <span className="mx-label">Your name</span>
              <span className="mx-input">
                <User size={19} strokeWidth={2.4} />
                <input
                  type="text"
                  name="player-name"
                  placeholder="What should we call you?"
                  autoComplete="nickname"
                  maxLength={15}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </span>
            </label>

            <div className="mode-tickets" role="tablist" aria-label="Host or join">
              <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'active' : ''} onClick={() => pickMode('create')}>
                <Plus size={17} strokeWidth={3} /> Host a table
              </button>
              <button type="button" role="tab" aria-selected={mode === 'join'} className={mode === 'join' ? 'active' : ''} onClick={() => pickMode('join')}>
                <KeyRound size={16} strokeWidth={2.8} /> Join with code
              </button>
            </div>

            {mode === 'create' ? (
              <p className="play-note">
                You get a 6-letter table code to share. Friends join with it, or fill the seats with bots.
              </p>
            ) : (
              <label className="mx-field">
                <span className="mx-label">Table code</span>
                <span className="code-boxes" onClick={() => codeRef.current?.focus()}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <span
                      key={i}
                      className={`code-box ${joinCode[i] ? 'filled' : ''} ${codeFocus && i === Math.min(joinCode.length, 5) ? 'caret' : ''}`}
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

            <button type="submit" className={`mx-cta gold ${mode === 'create' ? 'btn-create' : 'btn-join'}`} disabled={busy}>
              {mode === 'create' ? <Plus size={24} strokeWidth={3.2} /> : <LogIn size={22} strokeWidth={3} />}
              <span>{busy ? (mode === 'create' ? 'Setting the table…' : 'Joining…') : mode === 'create' ? 'Create table' : 'Join table'}</span>
              {!busy && <ArrowRight size={22} strokeWidth={3} className="mx-cta-trail" />}
            </button>

            {(install.canPrompt || install.showIosHelp) && (
              <button
                type="button"
                className="mx-pill wide"
                onClick={() => (install.canPrompt ? install.install() : setIosHelp((v) => !v))}
              >
                {install.canPrompt ? <Download size={16} strokeWidth={2.6} /> : <Share size={16} strokeWidth={2.6} />}
                {install.canPrompt ? 'Install the app' : 'Install on iPhone'}
              </button>
            )}
            {iosHelp && (
              <p className="play-note">
                Tap <Share size={13} /> <b>Share</b> in Safari, then <b>Add to Home Screen</b>. It opens full screen like a
                real app.
              </p>
            )}

            <p className="play-foot">
              <History size={14} /> Your seat is saved. Reload any time to rejoin.
            </p>
          </form>
        </section>
      </main>
    </div>
  );
};
