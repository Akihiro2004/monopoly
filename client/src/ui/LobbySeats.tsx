import React from 'react';
import { Seat } from '@monopoly/shared';
import { Crown, UserPlus, X } from 'lucide-react';
import { TOKENS } from './lobbyConstants.js';
import { PlayerAvatar } from './common/PlayerAvatar.js';

interface SeatsProps {
  seats: Seat[];
  myPlayerId: string;
  maxPlayers?: number;
  // Host only: remove a player from the lobby.
  onKick?: (playerId: string) => void;
}

export const LobbySeats: React.FC<SeatsProps> = ({ seats, myPlayerId, maxPlayers = 6, onKick }) => {
  const empty = Math.max(0, maxPlayers - seats.length);

  return (
    <ul className="seat-list">
      {seats.map((seat) => {
        const tokenObj = TOKENS.find((t) => t.type === seat.tokenType);
        const isMe = seat.playerId === myPlayerId;
        return (
          <li key={seat.seatIndex} className={`seat-row ${isMe ? 'me' : ''} ${!seat.isConnected ? 'offline' : ''}`}>
            <PlayerAvatar token={seat.tokenType} color={seat.color} size={40} online={seat.isConnected} />
            <div className="seat-info">
              <span className="seat-name">
                <span className="truncate">{seat.displayName}</span>
                {seat.isHost && <Crown size={14} className="host-crown" aria-label="Host" />}
                {isMe && <span className="badge">You</span>}
              </span>
              <span className="seat-sub">{tokenObj?.label}</span>
            </div>
            {!seat.isConnected ? (
              <span className="badge red">Offline</span>
            ) : seat.isHost ? (
              <span className="badge gold">Host</span>
            ) : seat.isReady ? (
              <span className="badge green">Ready</span>
            ) : (
              <span className="badge">Not ready</span>
            )}
            {onKick && !isMe && (
              <button
                className="icon-btn seat-kick"
                onClick={() => onKick(seat.playerId)}
                aria-label={`Remove ${seat.displayName}`}
                title={`Remove ${seat.displayName}`}
              >
                <X size={15} strokeWidth={3} />
              </button>
            )}
          </li>
        );
      })}
      {Array.from({ length: empty }).map((_, i) => (
        <li key={`empty-${i}`} className="seat-row empty">
          <span className="seat-empty-icon">
            <UserPlus size={18} />
          </span>
          <span className="seat-sub">Open seat</span>
        </li>
      ))}
      {empty > 0 && (
        <li className="seat-row empty-summary">
          <span className="seat-empty-icon">
            <UserPlus size={18} />
          </span>
          <span className="seat-sub">
            {empty} open seat{empty > 1 ? 's' : ''}. Share the code to invite friends.
          </span>
        </li>
      )}
    </ul>
  );
};
