import React from 'react';
import { Seat } from '@monopoly/shared';
import { Bot, Crown, Link2, UserPlus, WifiOff, X } from 'lucide-react';
import { TOKENS } from './lobbyConstants.js';
import { PlayerAvatar } from './common/PlayerAvatar.js';
import { playerHex } from './theme.js';

interface SeatsProps {
  seats: Seat[];
  myPlayerId: string;
  maxPlayers?: number;
  // Host only: remove a player from the lobby.
  onKick?: (playerId: string) => void;
  // Host only: fill an open seat with a computer player.
  onAddBot?: () => void;
  // Copy the table code to invite someone.
  onInvite?: () => void;
}

/** The table: one card per chair, open chairs invite a friend or a bot. */
export const LobbySeats: React.FC<SeatsProps> = ({ seats, myPlayerId, maxPlayers = 6, onKick, onAddBot, onInvite }) => (
  <ul className="seat-grid">
    {Array.from({ length: maxPlayers }, (_, i) => {
      const seat = seats[i];
      if (!seat) {
        const first = i === seats.length;
        return (
          <li key={`open-${i}`} className={`seat-card open ${first ? 'next' : ''}`}>
            <span className="seat-open-icon">
              <UserPlus size={22} strokeWidth={2.4} />
            </span>
            <b className="seat-open-title">Open seat</b>
            {first && (onInvite || onAddBot) ? (
              <span className="seat-open-actions">
                {onInvite && (
                  <button type="button" className="mx-chip" onClick={onInvite} title="Copy the table code">
                    <Link2 size={14} strokeWidth={2.6} /> Invite
                  </button>
                )}
                {onAddBot && (
                  <button type="button" className="mx-chip violet seat-add-bot" onClick={onAddBot} title="Fill this seat with a computer player">
                    <Bot size={14} strokeWidth={2.6} /> Add bot
                  </button>
                )}
              </span>
            ) : (
              <small className="seat-open-sub">Waiting for a player</small>
            )}
          </li>
        );
      }
      const token = TOKENS.find((t) => t.type === seat.tokenType);
      const isMe = seat.playerId === myPlayerId;
      const status = !seat.isConnected
        ? { cls: 'off', text: 'Offline' }
        : seat.isHost
          ? { cls: 'host', text: 'Host' }
          : seat.isReady
            ? { cls: 'ready', text: 'Ready' }
            : { cls: 'wait', text: 'Not ready' };
      return (
        <li
          key={seat.playerId}
          className={`seat-card ${isMe ? 'me' : ''} ${seat.isConnected ? '' : 'offline'}`}
          style={{ '--c': playerHex(seat.color) } as React.CSSProperties}
        >
          {isMe && <span className="seat-you">You</span>}
          {onKick && !isMe && (
            <button type="button" className="seat-kick" onClick={() => onKick(seat.playerId)} aria-label={`Remove ${seat.displayName}`} title={`Remove ${seat.displayName}`}>
              <X size={14} strokeWidth={3} />
            </button>
          )}
          <span className="seat-pedestal">
            <PlayerAvatar token={seat.tokenType} color={seat.color} size={64} />
            {seat.isHost && (
              <span className="seat-crown" aria-label="Host">
                <Crown size={14} strokeWidth={2.8} />
              </span>
            )}
          </span>
          <b className="seat-name">
            <span className="truncate">{seat.displayName}</span>
            {seat.isBot && (
              <span className="bot-mark" title="Computer player" aria-label="Computer player">
                <Bot size={15} strokeWidth={2.4} />
              </span>
            )}
          </b>
          <small className="seat-token">{seat.isBot ? `Bot · ${token?.label}` : token?.label}</small>
          <span className={`seat-status ${status.cls}`}>
            {status.cls === 'off' && <WifiOff size={12} strokeWidth={2.8} />}
            {status.text}
          </span>
        </li>
      );
    })}
  </ul>
);
