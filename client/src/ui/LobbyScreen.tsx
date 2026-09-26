import React from 'react';
import { socket, clearSession } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { TokenType, PlayerColor } from '@monopoly/shared';
import { Check, ChevronLeft, Copy, Play, Share2, Trophy, Users, Palette, Shapes } from 'lucide-react';
import { TOKENS, COLORS } from './lobbyConstants.js';
import { LobbySeats } from './LobbySeats.js';
import { Logo, Sky } from './common/Sky.js';

export const LobbyScreen: React.FC = () => {
  const roomState = useGameStore((s) => s.roomState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const resetAll = useGameStore((s) => s.resetAll);
  const addToast = useGameStore((s) => s.addToast);

  if (!roomState) return null;
  const mySeat = roomState.seats.find((s) => s.playerId === myPlayerId);
  const isHost = mySeat?.isHost ?? false;
  const others = roomState.seats.filter((s) => s.playerId !== myPlayerId);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const notReady = roomState.seats.filter((s) => !s.isReady && !s.isHost).length;
  const canStart = roomState.seats.length >= 2 && notReady === 0;
  const startHint =
    roomState.seats.length < 2
      ? 'Invite at least one more player to start.'
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

  const handleLeave = () => {
    socket.emit('room:leave');
    clearSession();
    resetAll();
  };

  return (
    <div className="menu-screen lobby-screen">
      <Sky />

      <header className="lobby-appbar">
        <button className="btn btn-ghost btn-sm btn-leave" onClick={handleLeave}>
          <ChevronLeft size={18} />
          <span>Leave</span>
        </button>
        <Logo size="sm" />
        <span className="lobby-appbar-spacer" />
      </header>

      <div className="lobby-layout">
        <div className="lobby-main">
          <section className="card paper room-card">
            <div className="room-code-block">
              <span className="section-title">Room code</span>
              <button className="code-display" onClick={handleCopyCode} title="Copy room code">
                <h2>{roomState.roomId}</h2>
              </button>
              <p className="room-hint">Friends join from the home screen with this code.</p>
            </div>
            <div className="room-actions">
              <button className="btn btn-gold" onClick={handleCopyCode}>
                <Copy size={16} /> Copy
              </button>
              {canShare && (
                <button className="btn btn-blue" onClick={handleShare}>
                  <Share2 size={16} /> Share
                </button>
              )}
            </div>
          </section>

          <section className="card paper">
            <div className="card-head">
              <span className="section-title">
                <Users size={14} /> Players
              </span>
              <span className="seat-count tnum">
                {roomState.seats.length}
                <span>/{roomState.settings.maxPlayers || 6}</span>
              </span>
            </div>
            <LobbySeats seats={roomState.seats} myPlayerId={myPlayerId} maxPlayers={roomState.settings.maxPlayers || 6} />
          </section>
        </div>

        <div className="lobby-side">
          {mySeat && (
            <section className="card paper">
              <div className="card-head">
                <span className="section-title">
                  <Shapes size={14} /> Your token
                </span>
              </div>
              <div className="token-grid">
                {TOKENS.map((t) => {
                  const takenBy = others.find((s) => s.tokenType === t.type);
                  const active = mySeat.tokenType === t.type;
                  return (
                    <button
                      key={t.type}
                      className={`token-option ${active ? 'active' : ''}`}
                      onClick={() => handleSelectToken(t.type)}
                      disabled={!!takenBy}
                      title={takenBy ? `Taken by ${takenBy.displayName}` : t.label}
                    >
                      <t.icon size={24} />
                      <span>{t.label}</span>
                      {takenBy && <span className="token-taken">{takenBy.displayName}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="card-head" style={{ marginTop: 18 }}>
                <span className="section-title">
                  <Palette size={14} /> Color
                </span>
              </div>
              <div className="color-row">
                {COLORS.map((c) => {
                  const takenBy = others.find((s) => s.color === c.color);
                  const active = mySeat.color === c.color;
                  return (
                    <button
                      key={c.color}
                      className={`color-swatch ${active ? 'active' : ''}`}
                      style={{ '--c': c.hex } as React.CSSProperties}
                      onClick={() => handleSelectColor(c.color)}
                      disabled={!!takenBy}
                      aria-label={takenBy ? `${c.color}, taken by ${takenBy.displayName}` : c.color}
                    >
                      {active && <Check size={16} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="card paper">
            <div className="setting-row">
              <span className="setting-icon">
                <Trophy size={18} />
              </span>
              <div className="setting-copy">
                <strong>Special victories</strong>
                <span>Win instantly with 3 full color sets or every property on one side.</span>
              </div>
              <button
                className={`switch ${roomState.settings.specialVictory ? 'on' : ''}`}
                onClick={handleToggleSpecialVictory}
                disabled={!isHost}
                role="switch"
                aria-checked={roomState.settings.specialVictory}
                title={isHost ? 'Toggle special victories' : 'Only the host can change this'}
              />
            </div>
          </section>

          <div className="lobby-actions">
            {isHost ? (
              <button className="btn btn-primary btn-xl btn-block btn-start" onClick={handleStartGame} disabled={!canStart}>
                <Play size={20} fill="currentColor" />
                <span>Start game</span>
              </button>
            ) : (
              <button
                className={`btn btn-xl btn-block btn-ready ${mySeat?.isReady ? 'btn-secondary is-ready' : 'btn-success'}`}
                onClick={handleToggleReady}
              >
                <Check size={20} strokeWidth={3} />
                <span>{mySeat?.isReady ? "I'm ready (tap to undo)" : 'Ready up'}</span>
              </button>
            )}
            <p className="lobby-hint">{isHost ? startHint : mySeat?.isReady ? 'Waiting for the host to start.' : 'Pick your token, then ready up.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
