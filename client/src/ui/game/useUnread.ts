import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';

// Counts chat messages from other players that arrived while the chat was
// hidden (a running counter, so the history cap never hides new messages).
export function useUnreadChat(visible: boolean): number {
  const received = useGameStore((s) => s.chatFromOthers);
  const seen = useRef(received);
  const [, force] = useState(0);

  useEffect(() => {
    if (visible && seen.current !== received) {
      seen.current = received;
      force((n) => n + 1);
    }
  }, [visible, received]);

  // A counter reset (new room) drops the baseline too.
  if (received < seen.current) seen.current = received;
  return visible ? 0 : received - seen.current;
}
