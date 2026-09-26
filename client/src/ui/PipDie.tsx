import React from 'react';

// Pure-CSS dice face with dots (no emoji/glyph fonts)
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

export const PipDie: React.FC<{ value: number; size?: number }> = ({ value, size = 16 }) => {
  const pips = PIP_LAYOUTS[value] || PIP_LAYOUTS[1];
  return (
    <span
      className="pip-die"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Die showing ${value}`}
    >
      {pips.map(([col, row], i) => (
        <span key={i} style={{ gridColumn: col + 1, gridRow: row + 1 }} />
      ))}
    </span>
  );
};
