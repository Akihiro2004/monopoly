import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, SendHorizontal } from 'lucide-react';
import { socket } from '../../net/socket.js';
import { useGameStore } from '../../store/gameStore.js';
import { playerHex } from '../theme.js';

export const ChatView: React.FC<{ autoFocus?: boolean }> = ({ autoFocus }) => {
  const [text, setText] = useState('');
  const messages = useGameStore((s) => s.chatMessages);
  const roomState = useGameStore((s) => s.roomState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const myName = roomState?.seats.find((s) => s.playerId === myPlayerId)?.displayName;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit('chat:send', { text: text.trim() });
    setText('');
  };

  return (
    <div className="chat-view">
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <MessageSquare size={26} />
            <span>No messages yet. Say hi to the table.</span>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.senderName === myName;
          const grouped = i > 0 && messages[i - 1].senderName === m.senderName;
          return (
            <div key={m.id} className={`bubble-row ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''}`}>
              {!mine && !grouped && (
                <span className="bubble-sender" style={{ color: playerHex(m.senderColor) }}>
                  {m.senderName}
                </span>
              )}
              <span className="bubble">{m.text}</span>
            </div>
          );
        })}
      </div>
      <form className="chat-compose" onSubmit={send}>
        <input
          className="chat-input"
          type="text"
          placeholder="Message the table"
          value={text}
          maxLength={200}
          autoFocus={autoFocus}
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
        />
        <button className="chat-send" type="submit" disabled={!text.trim()} aria-label="Send">
          <SendHorizontal size={18} />
        </button>
      </form>
    </div>
  );
};
