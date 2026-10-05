import { BoardDef } from '@monopoly/shared';

export interface TileCoordinate {
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
}

export interface BoardLayout {
  coords: TileCoordinate[];
  // Edge length of the tile ring in board units (20 for the World board).
  size: number;
  // Uniform scale that fits the ring into the 20-unit table, so bigger
  // boards keep their tile proportions (and labels stay readable).
  scale: number;
}

const CORNER = 2.4;
// Width of a regular tile (World board: 9 between corners on 20 units).
const TILE_W = (20 - 2 * CORNER) / 9;
const TILE_H = 0.14;
const SURFACE_Y = 0.1; // top of the blue frame / white ring
const TILE_Y = SURFACE_Y + TILE_H / 2;

const cache = new Map<string, BoardLayout>();

/**
 * Tile placement for a board with `perSide` tiles per side (corner first).
 * Side 0 runs right-to-left along the bottom from GO, then up the left, across
 * the top and down the right, like a real board.
 */
export function boardLayout(board: BoardDef): BoardLayout {
  const hit = cache.get(board.id);
  if (hit) return hit;
  const n = board.perSide;
  const size = 2 * CORNER + (n - 1) * TILE_W;
  const half = size / 2;
  const c = CORNER / 2;
  const corners: [number, number][] = [
    [half - c, half - c],
    [-half + c, half - c],
    [-half + c, -half + c],
    [half - c, -half + c]
  ];
  const rotations = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
  // Where regular tile k (1-based) of each side sits.
  const along = (side: number, k: number): [number, number] => {
    const d = half - CORNER - (k - 0.5) * TILE_W;
    const depth = half - CORNER / 2;
    switch (side) {
      case 0:
        return [d, depth];
      case 1:
        return [-depth, d];
      case 2:
        return [-d, -depth];
      default:
        return [depth, -d];
    }
  };
  const coords: TileCoordinate[] = [];
  for (let side = 0; side < 4; side++) {
    const rot: [number, number, number] = [0, rotations[side], 0];
    const [cx, cz] = corners[side];
    coords.push({ index: side * n, position: [cx, TILE_Y, cz], rotation: rot, size: [CORNER, TILE_H, CORNER] });
    for (let k = 1; k < n; k++) {
      const [x, z] = along(side, k);
      coords.push({ index: side * n + k, position: [x, TILE_Y, z], rotation: rot, size: [TILE_W * 0.95, TILE_H, CORNER] });
    }
  }
  const layout = { coords, size, scale: 20 / size };
  cache.set(board.id, layout);
  return layout;
}

/**
 * Transform for everything that lives on the tile ring (tiles, tokens,
 * buildings): the fitting scale, lifted so the tile tops stay level with
 * the centre board, which keeps its own size.
 */
export function boardGroupTransform(layout: BoardLayout): { scale: number; position: [number, number, number] } {
  const top = SURFACE_Y + TILE_H;
  return { scale: layout.scale, position: [0, top * (1 - layout.scale), 0] };
}

/**
 * How much the centre board (art, card decks) grows so it fills the inner
 * ring of a bigger board (1 on the World board). Applies to x and z only.
 */
export function centerScale(layout: BoardLayout): number {
  return ((layout.size - 2 * CORNER) * layout.scale) / (20 - 2 * CORNER);
}

/** Centre of a tile in board units (inside the scaled board group). */
export function getTileCenter(board: BoardDef, index: number): [number, number, number] {
  const coord = boardLayout(board).coords[((index % board.size) + board.size) % board.size];
  return coord ? coord.position : [0, 0, 0];
}
