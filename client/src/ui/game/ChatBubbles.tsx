import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@monopoly/shared';
import { useGameStore } from '../../store/gameStore.js';
import { playerHex } from '../theme.js';

const SHOW_MS = 3000;

// Cute speech bubbles next to the chat button while the chat is closed: the
// last 2-3 messages from other players, one after another, 3 s each.
export const ChatBubbles: React.FC<{
  hidden: boolean; // chat is open (or bubbles make no sense right now)
  placement: 'left' | 'below' | 'above';
  onOpen: () => void;
}> = ({ hidden, placement, onOpen }) => {
  const preview = useGameStore((s) => s.chatPreview);
  const [queue, setQueue] = useState<{ id: string; msg: ChatMessage }[]>([]);
  const lastId = useRef<string | null>(preview[preview.length - 1]?.id ?? null);

  // Queue messages that arrive while the chat is closed (max 3).
  useEffect(() => {
    const idx = preview.findIndex((p) => p.id === lastId.current);
    const fresh = preview.slice(idx + 1);
    if (!fresh.length) return;
    lastId.current = fresh[fresh.length - 1].id;
    if (hidden) return;
    setQueue((q) => [...q, ...fresh].slice(-3));
  }, [preview, hidden]);

  useEffect(() => {
    if (hidden) setQueue([]);
  }, [hidden]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  if (hidden || !current) return null;
  const { msg } = current;
  return (
    <div
      key={current.id}
      role="button"
      tabIndex={0}
      className={`chat-bubble ${placement}`}
      style={{ '--c': playerHex(msg.senderColor) } as React.CSSProperties}
      onClick={(e) => {
        e.stopPropagation();
        setQueue([]);
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setQueue([]);
          onOpen();
        }
      }}
      aria-label={`New message from ${msg.senderName}: ${msg.text}`}
    >
      <b className="truncate">{msg.senderName}</b>
      <span className="chat-bubble-text">{msg.text}</span>
      {queue.length > 1 && <small className="chat-bubble-more">+{queue.length - 1}</small>}
    </div>
  );
};
