import React from 'react';
import { socket, clearSession } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { BoardId, TokenType, PlayerColor, ForceBuyMode, PROTOCOL_VERSION } from '@monopoly/shared';
import { Check, ChevronLeft, Earth, Globe2, Copy, Lock, Play, ScrollText, Share2, Shapes, Shuffle, Swords, Timer, Trophy, Users } from 'lucide-react';
import { TOKENS, COLORS } from './lobbyConstants.js';
import { LobbySeats } from './LobbySeats.js';
import { FORCE_BUY_LABEL, MobileLobby } from './lobby/MobileLobby.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { Logo } from './common/Logo.js';
import { MenuScene } from './menu/MenuScene.js';
import { MuteButton } from './game/TurnHeader.js';
import { playerHex } from './theme.js';
import { audioManager } from '../sound/audioManager.js';

export const LobbyScreen: React.FC = () => {
  const roomState = useGameStore((s) => s.roomState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const resetAll = useGameStore((s) => s.resetAll);
  const addToast = useGameStore((s) => s.addToast);

  const isMobile = useIsMobile();

  if (!roomState) return null;
  // Rooms from an older server (or saved before these settings existed) may
  // not carry them: show the defaults instead of an empty selector.
  const settings = {
    ...roomState.settings,
    forceBuyMode: roomState.settings.forceBuyMode ?? ('developed' as ForceBuyMode),
    randomEvents: roomState.settings.randomEvents ?? true,
    board: roomState.settings.board ?? ('world' as BoardId)
  };
  const mySeat = roomState.seats.find((s) => s.playerId === myPlayerId);
  const isHost = mySeat?.isHost ?? false;
  const others = roomState.seats.filter((s) => s.playerId !== myPlayerId);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const notReady = roomState.seats.filter((s) => !s.isReady && !s.isHost).length;
  const canStart = roomState.seats.length >= 2 && notReady === 0;
  const startHint =
    roomState.seats.length < 2
      ? 'Invite a friend or add a bot to start.'
      : notReady > 0
        ? `Waiting for ${notReady} player${notReady > 1 ? 's' : ''} to ready up.`
        : 'Everyone is ready. Start when you like.';

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(roomState.roomId).then(
      () => addToast('Room code copied', 'success'),
      () => addToast(`Room code: ${roomState.roomId}`, 'info')
    );
  };

  const handleShare = () => {
    navigator
      .share({
        title: 'TMpoly',
        text: `Join my TMpoly game. Room code: ${roomState.roomId}`,
        url: window.location.origin
      })
      .catch(() => {});
  };

  const handleSelectToken = (token: TokenType) => {
    if (!mySeat) return;
    socket.emit('room:selectToken', { tokenType: token, color: mySeat.color });
  };

  const handleSelectColor = (color: PlayerColor) => {
    if (!mySeat) return;
    socket.emit('room:selectToken', { tokenType: mySeat.tokenType, color });
  };

  const handleToggleReady = () => {
    if (!mySeat) return;
    socket.emit('room:ready', { ready: !mySeat.isReady });
  };

  const handleToggleSpecialVictory = () => {
    if (!isHost) return;
    socket.emit('room:toggleSpecialVictory', { enabled: !roomState.settings.specialVictory });
  };

  const handleStartGame = () => {
    if (!isHost) return;
    socket.emit('room:start');
  };

  const handleTurnTimer = (seconds: number) => {
    if (!isHost) return;
    socket.emit('room:setTurnTimer', { seconds });
  };

  const handleForceBuyMode = (mode: ForceBuyMode) => {
    if (!isHost) return;
    socket.emit('room:setForceBuyMode', { mode });
  };

  const handleToggleRandomEvents = () => {
    if (!isHost) return;
    socket.emit('room:setRandomEvents', { enabled: !settings.randomEvents });
  };

  const handleBoard = (board: BoardId) => {
    if (!isHost) return;
    socket.emit('room:setBoard', { board });
  };

  const handleKick = (playerId: string) => {
    socket.emit('room:kick', { playerId });
  };

  const handleAddBot = () => {
    if (!isHost) return;
    socket.emit('room:addBot');
  };

  const handleLeave = () => {
    socket.emit('room:leave');
    clearSession();
    resetAll();
  };

  const outdated = (roomState.protocol ?? 0) < PROTOCOL_VERSION ? <ServerOutdated /> : null;

  if (isMobile) {
    return (
      <>
      {outdated}
      <MobileLobby
        room={{ ...roomState, settings }}
        me={mySeat}
        isHost={isHost}
        canStart={canStart}
        startHint={startHint}
        actions={{
          copyCode: handleCopyCode,
          share: canShare ? handleShare : null,
          selectToken: handleSelectToken,
          selectColor: handleSelectColor,
          toggleReady: handleToggleReady,
          start: handleStartGame,
          leave: handleLeave,
          kick: handleKick,
          addBot: handleAddBot,
          setBoard: handleBoard,
          toggleSpecialVictory: handleToggleSpecialVictory,
          setTurnTimer: handleTurnTimer,
          setForceBuyMode: handleForceBuyMode,
          toggleRandomEvents: handleToggleRandomEvents
        }}
      />
      </>
    );
  }

  const seatedCount = roomState.seats.length;
  const readyCount = roomState.seats.filter((s) => s.isHost || s.isReady).length;
  const maxSeats = roomState.settings.maxPlayers || 6;

  return (
    <div className="menu-screen mx lobby-screen">
      <MenuScene />
      {outdated}

      <header className="mx-topbar">
        <button className="mx-pill btn-leave" onClick={handleLeave}>
          <ChevronLeft size={18} strokeWidth={2.8} /> Leave table
        </button>
        <Logo size="sm" />
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

      <main className="lobby-layout">
        <section className="mx-panel lobby-ticket">
          <div className="room-code-block">
            <span className="mx-label">Table code</span>
            <button className="code-display" onClick={handleCopyCode} title="Copy table code">
              <h2>{roomState.roomId}</h2>
            </button>
          </div>
          <div className="ticket-actions">
            <button className="mx-btn gold" onClick={handleCopyCode}>
              <Copy size={16} strokeWidth={2.6} /> Copy code
            </button>
            {canShare && (
              <button className="mx-btn violet" onClick={handleShare}>
                <Share2 size={16} strokeWidth={2.6} /> Share
              </button>
            )}
          </div>
          <p className="ticket-hint">Friends enter this code on the home screen to sit down at your table.</p>
          <div className="ticket-stats">
            <span>
              <b className="tnum">
                {seatedCount}
                <small>/{maxSeats}</small>
              </b>
              Seated
            </span>
            <span>
              <b className="tnum">
                {readyCount}
                <small>/{seatedCount}</small>
              </b>
              Ready
            </span>
          </div>
        </section>

        <section className="mx-panel lobby-table">
          <div className="mx-panel-head">
            <h3>
              <Users size={18} strokeWidth={2.6} /> The table
            </h3>
            <span className="mx-panel-note">
              {seatedCount} of {maxSeats} seats taken
            </span>
          </div>
          <LobbySeats
            seats={roomState.seats}
            myPlayerId={myPlayerId}
            maxPlayers={maxSeats}
            onKick={isHost ? handleKick : undefined}
            onAddBot={isHost ? handleAddBot : undefined}
            onInvite={handleCopyCode}
          />
        </section>

        <aside className="lobby-side">
          {mySeat && (
            <section className="mx-panel">
              <div className="mx-panel-head">
                <h3>
                  <Shapes size={18} strokeWidth={2.6} /> Your piece
                </h3>
                <span className="mx-panel-note">{TOKENS.find((t) => t.type === mySeat.tokenType)?.label}</span>
              </div>
              <div className="token-grid">
                {TOKENS.map((t) => {
                  const takenBy = others.find((s) => s.tokenType === t.type);
                  const active = mySeat.tokenType === t.type;
                  return (
                    <button
                      key={t.type}
                      className={`token-option ${active ? 'active' : ''}`}
                      style={{ '--c': playerHex(takenBy?.color ?? mySeat.color) } as React.CSSProperties}
                      onClick={() => handleSelectToken(t.type)}
                      disabled={!!takenBy}
                      title={takenBy ? `Taken by ${takenBy.displayName}` : t.label}
                    >
                      <t.icon size={24} strokeWidth={2.2} />
                      <span>{takenBy ? takenBy.displayName : t.label}</span>
                      {takenBy && <Lock size={11} strokeWidth={3} className="token-lock" />}
                    </button>
                  );
                })}
              </div>
              <div className="color-row" role="radiogroup" aria-label="Color">
                {COLORS.map((c) => {
                  const takenBy = others.find((s) => s.color === c.color);
                  const active = mySeat.color === c.color;
                  return (
                    <button
                      key={c.color}
                      role="radio"
                      aria-checked={active}
                      className={`color-swatch ${active ? 'active' : ''} ${takenBy ? 'taken' : ''}`}
                      style={{ '--c': c.hex } as React.CSSProperties}
                      onClick={() => handleSelectColor(c.color)}
                      disabled={!!takenBy}
                      title={takenBy ? `Taken by ${takenBy.displayName}` : c.color}
                      aria-label={takenBy ? `${c.color}, taken by ${takenBy.displayName}` : c.color}
                    >
                      {active && <Check size={16} strokeWidth={3.4} />}
                      {takenBy && <Lock size={12} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mx-panel lobby-rules">
            <div className="mx-panel-head">
              <h3>
                <ScrollText size={18} strokeWidth={2.6} /> House rules
              </h3>
              {!isHost && <span className="mx-panel-note">Set by the host</span>}
            </div>
            <div className="board-pick" role="radiogroup" aria-label="Board">
              {BOARD_CHOICES.map((b) => (
                <button
                  key={b.id}
                  role="radio"
                  aria-checked={settings.board === b.id}
                  className={`board-option ${settings.board === b.id ? 'active' : ''}`}
                  onClick={() => handleBoard(b.id)}
                  disabled={!isHost}
                  title={isHost ? undefined : 'Only the host can change this'}
                >
                  <span className="board-option-icon">
                    <b.icon size={20} strokeWidth={2.4} />
                  </span>
                  <span className="board-option-copy">
                    <b>{b.name}</b>
                    <small>{b.sub}</small>
                  </span>
                  <span className="board-option-tag">{b.players}</span>
                </button>
              ))}
            </div>
            <RuleRow icon={<Trophy size={17} />} title="Special victories" sub="3 full sets or a whole side wins instantly">
              <button
                className={`switch ${roomState.settings.specialVictory ? 'on' : ''}`}
                onClick={handleToggleSpecialVictory}
                disabled={!isHost}
                role="switch"
                aria-checked={roomState.settings.specialVictory}
                aria-label="Special victories"
              />
            </RuleRow>
            <RuleRow icon={<Shuffle size={17} />} title="Random events" sub="Bank bonuses, crashes, surprise auctions">
              <button
                className={`switch ${settings.randomEvents ? 'on' : ''}`}
                onClick={handleToggleRandomEvents}
                disabled={!isHost}
                role="switch"
                aria-checked={settings.randomEvents}
                aria-label="Random events"
              />
            </RuleRow>
            <RuleRow icon={<Timer size={17} />} title="Turn timer" sub="Then the game plays the turn for you" stacked>
              <div className="segmented small" role="radiogroup" aria-label="Turn timer">
                {[0, 60, 90, 120].map((sec) => (
                  <button
                    key={sec}
                    role="radio"
                    aria-checked={roomState.settings.turnTimeoutSec === sec}
                    className={roomState.settings.turnTimeoutSec === sec ? 'active' : ''}
                    onClick={() => handleTurnTimer(sec)}
                    disabled={!isHost}
                  >
                    {sec === 0 ? 'Off' : `${sec}s`}
                  </button>
                ))}
              </div>
            </RuleRow>
            <RuleRow icon={<Swords size={17} />} title="Force-buy" sub="Buy a rival's city at double price" stacked>
              <div className="segmented small" role="radiogroup" aria-label="Force-buy mode">
                {(['off', 'developed', 'any'] as ForceBuyMode[]).map((mode) => (
                  <button
                    key={mode}
                    role="radio"
                    aria-checked={settings.forceBuyMode === mode}
                    className={settings.forceBuyMode === mode ? 'active' : ''}
                    onClick={() => handleForceBuyMode(mode)}
                    disabled={!isHost}
                  >
                    {FORCE_BUY_LABEL[mode]}
                  </button>
                ))}
              </div>
            </RuleRow>
          </section>
        </aside>

        <footer className="mx-panel lobby-actions">
          <p className="lobby-hint">
            <span className={`hint-dot ${canStart ? 'go' : ''}`} />
            {isHost ? startHint : mySeat?.isReady ? 'You are ready. Waiting for the host to start.' : 'Pick your piece, then ready up.'}
          </p>
          {isHost ? (
            <button className="mx-cta gold btn-start" onClick={handleStartGame} disabled={!canStart}>
              <Play size={22} fill="currentColor" />
              <span>Start game</span>
            </button>
          ) : (
            <button className={`mx-cta btn-ready ${mySeat?.isReady ? 'ghost is-ready' : 'green'}`} onClick={handleToggleReady}>
              <Check size={22} strokeWidth={3.2} />
              <span>{mySeat?.isReady ? 'Ready (undo)' : 'Ready up'}</span>
            </button>
          )}
        </footer>
      </main>
    </div>
  );
};

export const BOARD_CHOICES: { id: BoardId; name: string; sub: string; players: string; icon: typeof Globe2 }[] = [
  { id: 'world', name: 'World', sub: '40 tiles · 8 countries', players: '2–4', icon: Globe2 },
  { id: 'grand', name: 'Grand World', sub: '56 tiles · 12 countries · tolls & jackpot', players: '4–6', icon: Earth }
];

const RuleRow: React.FC<{ icon: React.ReactNode; title: string; sub: string; stacked?: boolean; children: React.ReactNode }> = ({
  icon,
  title,
  sub,
  stacked,
  children
}) => (
  <div className={`rule-row ${stacked ? 'stacked' : ''}`}>
    <span className="rule-icon">{icon}</span>
    <span className="rule-copy">
      <b>{title}</b>
      <small>{sub}</small>
    </span>
    {children}
  </div>
);

// The server runs older code than this page: new lobby settings would be
// ignored, so say so plainly (the fix is rebuilding + restarting it).
const ServerOutdated: React.FC = () => (
  <div className="server-outdated" role="alert">
    <b>The game server needs an update.</b> Some features (bots, force-buy, random events) will not work until the host
    rebuilds and restarts it (<code>npm run build</code>, then restart).
  </div>
);
