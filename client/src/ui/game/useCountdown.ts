import { useEffect, useState } from 'react';

// Whole seconds left until `expiresAt` (ms timestamp), ticking 5x a second.
export function useCountdown(expiresAt: number | undefined): number {
  const calc = () => (expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    if (!expiresAt) return;
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return left;
}
