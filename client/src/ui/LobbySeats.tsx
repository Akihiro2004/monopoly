import React from 'react';
import { Seat } from '@monopoly/shared';
import { Crown } from 'lucide-react';
import { TOKENS, COLORS } from './lobbyConstants.js';

interface SeatsProps {
  seats: Seat[];
  myPlayerId: string;
}

export const LobbySeats: React.FC<SeatsProps> = ({ seats, myPlayerId }) => {
  return (
    <div className="seats-section">
      <h3>
        PLAYERS ({seats.length}/6)
        <span className="player-count-dots">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={i < seats.length ? 'filled' : ''} />
          ))}
        </span>
      </h3>
      <div className="seats-grid">
        {seats.map((seat) => {
          const tokenObj = TOKENS.find((t) => t.type === seat.tokenType);
          const colorObj = COLORS.find((c) => c.color === seat.color);
          const isMe = seat.playerId === myPlayerId;

          return (
            <div
              key={seat.seatIndex}
              className={`seat-card ${isMe ? 'my-seat' : ''} ${seat.isReady ? 'ready' : ''} ${!seat.isConnected ? 'offline' : ''}`}
              style={{ borderLeftColor: colorObj?.hex || '#666' }}
            >
              <div className="seat-token" style={{ backgroundColor: `${colorObj?.hex || '#666'}33` }}>
                {tokenObj ? <tokenObj.icon size={18} color={colorObj?.hex || '#cbd5e1'} /> : null}
              </div>
              <div className="seat-info">
                <div className="seat-name">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{seat.displayName}</span>
                  {isMe && <span className="you-pill">YOU</span>}
                  {seat.isHost && <Crown size={14} color="#f59e0b" />}
                </div>
                <div className="seat-token-name">{tokenObj?.label}</div>
              </div>
              <div className="seat-status">
                {!seat.isConnected ? (
                  <span className="status-pill offline-pill">OFFLINE</span>
                ) : seat.isHost ? (
                  <span className="status-pill host">HOST</span>
                ) : seat.isReady ? (
                  <span className="status-pill ready">READY</span>
                ) : (
                  <span className="status-pill waiting">WAITING</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
