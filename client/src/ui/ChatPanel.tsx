import React, { useState, useEffect } from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { Send, MessageSquare } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const messages = useGameStore((s) => s.chatMessages);

  // Count messages that arrived while the panel was closed.
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      setUnread((u) => u + 1);
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = () => {
    if (!isOpen) setUnread(0);
    setIsOpen(!isOpen);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    socket.emit('chat:send', { text: text.trim() });
    setText('');
  };

  return (
    <div className={`chat-panel ${isOpen ? 'open' : 'closed'}`}>
      <button
        className={`chat-toggle-btn ${!isOpen && unread > 0 ? 'has-unread' : ''}`}
        onClick={handleToggle}
      >
        <MessageSquare size={16} />
        <span>Chat</span>
        {!isOpen && unread > 0 ? (
          <span className="chat-unread-badge">{unread > 99 ? '99+' : unread}</span>
        ) : (
          <span className="chat-header-count">{messages.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="chat-body">
          <div className="chat-header">
            <span className="chat-header-title">TABLE CHAT</span>
            <span className="chat-header-count">{messages.length}</span>
          </div>
          <div className="messages-list">
            {messages.length === 0 && (
              <div className="chat-empty">No messages yet — say hello to the table.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="message-item">
                <span className="msg-sender" style={{ color: m.senderColor }}>
                  {m.senderName}:
                </span>
                <span className="msg-text">{m.text}</span>
              </div>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Type message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="chat-send-btn" onClick={handleSend} title="Send message">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
