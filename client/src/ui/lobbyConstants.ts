import { TokenType, PlayerColor } from '@monopoly/shared';
import type { LucideIcon } from 'lucide-react';
import { Car, Crown, Dog, Ship, Stamp, Footprints } from 'lucide-react';

export const TOKENS: { type: TokenType; label: string; icon: LucideIcon }[] = [
  { type: 'car', label: 'Race Car', icon: Car },
  { type: 'hat', label: 'Top Hat', icon: Crown },
  { type: 'dog', label: 'Scottie Dog', icon: Dog },
  { type: 'ship', label: 'Battleship', icon: Ship },
  { type: 'thimble', label: 'Thimble', icon: Stamp },
  { type: 'boot', label: 'Old Boot', icon: Footprints },
];

export const COLORS: { color: PlayerColor; hex: string }[] = [
  { color: 'red', hex: '#ef4444' },
  { color: 'blue', hex: '#3b82f6' },
  { color: 'green', hex: '#10b981' },
  { color: 'yellow', hex: '#f59e0b' },
  { color: 'purple', hex: '#8b5cf6' },
  { color: 'orange', hex: '#f97316' },
];
