import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';

// Counts chat messages from others that arrived while the chat was hidden.
export function useUnreadChat(visible: boolean): number {
  const messages = useGameStore((s) => s.chatMessages);
  const [unread, setUnread] = useState(0);
  const seen = useRef(messages.length);

  useEffect(() => {
    if (visible) {
      seen.current = messages.length;
      setUnread(0);
    } else if (messages.length > seen.current) {
      setUnread((u) => u + (messages.length - seen.current));
      seen.current = messages.length;
    }
  }, [messages.length, visible]);

  return unread;
}
