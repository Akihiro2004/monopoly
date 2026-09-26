import React from 'react';
import { BOARD_TILES } from '@monopoly/shared';
import { GROUP_HEX } from '../theme.js';

// Grid cell (1-based row/col on an 11x11 grid) for each tile index,
// matching the real board: GO bottom-right, moving clockwise.
function cellFor(index: number): [number, number] {
  if (index <= 10) return [11, 11 - index];
  if (index <= 20) return [11 - (index - 10), 1];
  if (index <= 30) return [1, 1 + (index - 20)];
  return [1 + (index - 30), 11];
}

// Which edge of the tile faces the board center (for the color band).
function sideFor(index: number): 'top' | 'right' | 'bottom' | 'left' {
  if (index < 10) return 'top';
  if (index < 20) return 'right';
  if (index < 30) return 'bottom';
  return 'left';
}

// Decorative, purely-CSS board used as hero art on the menu screens.
export const MiniBoard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`mini-board ${className}`} aria-hidden="true">
    {BOARD_TILES.map((tile) => {
      const [row, col] = cellFor(tile.index);
      const corner = tile.index % 10 === 0;
      const banded = !corner && tile.type === 'property';
      return (
        <span
          key={tile.index}
          className={`mb-tile ${corner ? 'corner' : ''} ${banded ? `band-${sideFor(tile.index)}` : ''} t-${tile.type}`}
          style={
            {
              gridRow: row,
              gridColumn: col,
              '--band': GROUP_HEX[tile.group]
            } as React.CSSProperties
          }
        />
      );
    })}
    <div className="mb-center">
      <span className="mb-logo">TMpoly</span>
      <span className="mb-deck chance" />
      <span className="mb-deck chest" />
    </div>
  </div>
);
