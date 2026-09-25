import React, { useState } from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { Send, MessageSquare } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messages = useGameStore((s) => s.chatMessages);

  const handleSend = () => {
    if (!text.trim()) return;
    socket.emit('chat:send', { text: text.trim() });
    setText('');
  };

  return (
    <div className={`chat-panel ${isOpen ? 'open' : 'closed'}`}>
      <button className="chat-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        <MessageSquare size={18} />
        <span>Chat ({messages.length})</span>
      </button>

      {isOpen && (
        <div className="chat-body">
          <div className="messages-list">
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
            <button onClick={handleSend}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
