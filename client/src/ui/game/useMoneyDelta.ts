import { useEffect, useRef, useState } from 'react';

export interface MoneyDelta {
  id: number;
  amount: number;
}

// Floating "+$200" / "-$50" bubbles whenever a balance changes.
export function useMoneyDelta(value: number): MoneyDelta[] {
  const prev = useRef(value);
  const seq = useRef(0);
  const [deltas, setDeltas] = useState<MoneyDelta[]>([]);

  useEffect(() => {
    const diff = value - prev.current;
    prev.current = value;
    if (diff === 0) return;
    const id = ++seq.current;
    setDeltas((d) => [...d.slice(-2), { id, amount: diff }]);
    const t = setTimeout(() => setDeltas((d) => d.filter((x) => x.id !== id)), 1800);
    return () => clearTimeout(t);
  }, [value]);

  return deltas;
}
