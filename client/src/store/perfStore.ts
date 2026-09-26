import { create } from 'zustand';

// Graphics quality tiers. "auto" starts from a device guess and steps down
// on its own when the frame rate drops (PerformanceMonitor in the scene).
export type Tier = 'low' | 'mid' | 'high';
export type GraphicsPref = 'auto' | 'low' | 'high';

export interface TierSettings {
  dpr: [number, number];
  shadows: boolean;
  shadowMap: number;
  antialias: boolean;
  // Frames per second while nothing is happening (0 = sleep until needed).
  idleFps: number;
  townRings: number;
  clouds: boolean;
  anisotropy: number;
}

export const TIERS: Record<Tier, TierSettings> = {
  low: { dpr: [1, 1.25], shadows: false, shadowMap: 512, antialias: false, idleFps: 0, townRings: 7, clouds: false, anisotropy: 2 },
  mid: { dpr: [1, 1.5], shadows: true, shadowMap: 1024, antialias: true, idleFps: 15, townRings: 9, clouds: true, anisotropy: 4 },
  high: { dpr: [1, 2], shadows: true, shadowMap: 2048, antialias: true, idleFps: 30, townRings: 10, clouds: true, anisotropy: 8 }
};

const ORDER: Tier[] = ['low', 'mid', 'high'];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode)
  }
}

// Rough device class from what the browser exposes.
function guessTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (memory <= 3 || cores <= 3) return 'low';
  if (touch) return memory <= 4 || cores <= 4 ? 'low' : 'mid';
  if (cores <= 4 || memory <= 4) return 'mid';
  return 'high';
}

function initialAuto(): Tier {
  const saved = read('gfx.auto') as Tier | null;
  const guess = guessTier();
  // A previous session may have found this device slower than the guess.
  if (saved && ORDER.includes(saved)) return ORDER.indexOf(saved) < ORDER.indexOf(guess) ? saved : guess;
  return guess;
}

interface PerfStore {
  pref: GraphicsPref;
  autoTier: Tier;
  // Render at full rate until this timestamp (ms).
  activeUntil: number;
  setPref: (p: GraphicsPref) => void;
  degrade: () => void;
  bump: (ms?: number) => void;
}

export const usePerfStore = create<PerfStore>((set, get) => ({
  pref: ((read('gfx.pref') as GraphicsPref | null) ?? 'auto') as GraphicsPref,
  autoTier: initialAuto(),
  activeUntil: 0,
  setPref: (pref) => {
    write('gfx.pref', pref);
    set({ pref });
  },
  degrade: () => {
    const i = ORDER.indexOf(get().autoTier);
    if (i <= 0) return;
    const autoTier = ORDER[i - 1];
    write('gfx.auto', autoTier);
    set({ autoTier });
  },
  bump: (ms = 2500) => {
    const until = performance.now() + ms;
    if (until > get().activeUntil) set({ activeUntil: until });
  }
}));

export function currentTier(s: Pick<PerfStore, 'pref' | 'autoTier'>): Tier {
  return s.pref === 'auto' ? s.autoTier : s.pref === 'low' ? 'low' : 'high';
}

export function useTier(): Tier {
  return usePerfStore((s) => currentTier(s));
}
