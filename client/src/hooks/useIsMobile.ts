import { useCallback, useSyncExternalStore } from 'react';

// Phones (portrait or landscape) and narrow windows get the touch-first
// mobile layout; everything else gets the docked desktop layout.
const MOBILE_QUERY = '(max-width: 820px), (pointer: coarse) and (max-height: 540px)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
