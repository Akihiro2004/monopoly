import { TokenType, PlayerColor } from '@monopoly/shared';

export const TOKENS: { type: TokenType; label: string; icon: string }[] = [
  { type: 'car', label: 'Race Car', icon: '🏎️' },
  { type: 'hat', label: 'Top Hat', icon: '🎩' },
  { type: 'dog', label: 'Scottie Dog', icon: '🐕' },
  { type: 'ship', label: 'Battleship', icon: '🚢' },
  { type: 'thimble', label: 'Thimble', icon: '🧵' },
  { type: 'boot', label: 'Old Boot', icon: '🥾' },
];

export const COLORS: { color: PlayerColor; hex: string }[] = [
  { color: 'red', hex: '#ef4444' },
  { color: 'blue', hex: '#3b82f6' },
  { color: 'green', hex: '#10b981' },
  { color: 'yellow', hex: '#f59e0b' },
  { color: 'purple', hex: '#8b5cf6' },
  { color: 'orange', hex: '#f97316' },
];
