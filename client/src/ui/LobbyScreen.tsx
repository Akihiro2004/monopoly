import React from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { TokenType, PlayerColor } from '@monopoly/shared';
import { Users, CheckCircle, Copy, Play, Trophy } from 'lucide-react';
import { TOKENS, COLORS } from './lobbyConstants.js';
import { LobbySeats } from './LobbySeats.js';

export const LobbyScreen: React.FC = () => {
  const roomState = useGameStore((s) => s.roomState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const addToast = useGameStore((s) => s.addToast);

  if (!roomState) return null;
  const mySeat = roomState.seats.find((s) => s.playerId === myPlayerId);
  const isHost = mySeat?.isHost ?? false;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomId);
    addToast('Room code copied!', 'success');
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

  const handleToggleSpecialVictory = (enabled: boolean) => {
    if (!isHost) return;
    socket.emit('room:toggleSpecialVictory', { enabled });
  };

  const handleStartGame = () => {
    if (!isHost) return;
    socket.emit('room:start');
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <div className="lobby-header">
          <div>
            <div className="room-badge"><Users size={16} /><span>ROOM CODE</span></div>
            <div className="code-display" onClick={handleCopyCode}>
              <h2>{roomState.roomId}</h2>
              <Copy size={20} className="copy-icon" />
            </div>
          </div>

          <div className="special-victory-toggle">
            <div className="toggle-label">
              <Trophy size={16} color="#fbbf24" />
              <span>LINE Victories (Triple & Line):</span>
            </div>
            {isHost ? (
              <button
                className={`toggle-btn ${roomState.settings.specialVictory ? 'active' : ''}`}
                onClick={() => handleToggleSpecialVictory(!roomState.settings.specialVictory)}
              >
                {roomState.settings.specialVictory ? 'ENABLED' : 'DISABLED'}
              </button>
            ) : (
              <span className="badge-status">{roomState.settings.specialVictory ? 'Enabled' : 'Disabled'}</span>
            )}
          </div>
        </div>

        <LobbySeats seats={roomState.seats} myPlayerId={myPlayerId} />

        {mySeat && (
          <div className="customization-section">
            <div className="pick-group">
              <label>CHOOSE TOKEN</label>
              <div className="token-picker">
                {TOKENS.map((t) => (
                  <button
                    key={t.type}
                    className={`token-btn ${mySeat.tokenType === t.type ? 'active' : ''}`}
                    onClick={() => handleSelectToken(t.type)}
                  >
                    <t.icon size={20} />
                  </button>
                ))}
              </div>
            </div>

            <div className="pick-group">
              <label>CHOOSE COLOR</label>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c.color}
                    className={`color-btn ${mySeat.color === c.color ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => handleSelectColor(c.color)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="lobby-actions">
          {!isHost && (
            <button className={`btn btn-ready ${mySeat?.isReady ? 'btn-active-ready' : ''}`} onClick={handleToggleReady}>
              <CheckCircle size={18} />
              <span>{mySeat?.isReady ? 'UNREADY' : 'READY'}</span>
            </button>
          )}

          {isHost && (
            <button
              className="btn btn-primary btn-start"
              onClick={handleStartGame}
              disabled={roomState.seats.length < 2 || roomState.seats.some((s) => !s.isReady && !s.isHost)}
            >
              <Play size={18} />
              <span>START GAME ({roomState.seats.length}/6)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
