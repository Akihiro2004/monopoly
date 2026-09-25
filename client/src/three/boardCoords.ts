import { Vector3 } from 'three';

export interface TileCoordinate {
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
}

// Board is 20 units x 20 units on the X-Z plane
// 40 tiles total: 10 per side
// Corners are at indices 0 (GO), 10 (Jail), 20 (Free Parking), 30 (Go to Jail)
export function calculateTileCoordinates(): TileCoordinate[] {
  const coords: TileCoordinate[] = [];
  const boardSize = 20;
  const half = boardSize / 2;
  const cornerSize = 2.4;
  const standardWidth = (boardSize - 2 * cornerSize) / 9; // ~1.688
  const tileHeight = 0.14;
  const surfaceY = 0.1; // top of the blue frame / white ring
  const tileY = surfaceY + tileHeight / 2;
  const tileDepth = cornerSize;

  // Bottom side: 0 to 9 (moving right to left: X goes from +half to -half at Z = +half)
  // 0 is Bottom-Right corner (GO)
  coords.push({
    index: 0,
    position: [half - cornerSize / 2, tileY, half - cornerSize / 2],
    rotation: [0, 0, 0],
    size: [cornerSize, tileHeight, cornerSize]
  });

  for (let i = 1; i <= 9; i++) {
    const x = half - cornerSize - (i - 0.5) * standardWidth;
    coords.push({
      index: i,
      position: [x, tileY, half - tileDepth / 2],
      rotation: [0, 0, 0],
      size: [standardWidth * 0.95, tileHeight, tileDepth]
    });
  }

  // Left side: 10 to 19 (moving bottom to top: Z goes from +half to -half at X = -half)
  // 10 is Bottom-Left corner (Jail)
  coords.push({
    index: 10,
    position: [-half + cornerSize / 2, tileY, half - cornerSize / 2],
    rotation: [0, -Math.PI / 2, 0],
    size: [cornerSize, tileHeight, cornerSize]
  });

  for (let i = 1; i <= 9; i++) {
    const z = half - cornerSize - (i - 0.5) * standardWidth;
    coords.push({
      index: 10 + i,
      position: [-half + tileDepth / 2, tileY, z],
      rotation: [0, -Math.PI / 2, 0],
      size: [standardWidth * 0.95, tileHeight, tileDepth]
    });
  }

  // Top side: 20 to 29 (moving left to right: X goes from -half to +half at Z = -half)
  // 20 is Top-Left corner (Free Parking)
  coords.push({
    index: 20,
    position: [-half + cornerSize / 2, tileY, -half + cornerSize / 2],
    rotation: [0, Math.PI, 0],
    size: [cornerSize, tileHeight, cornerSize]
  });

  for (let i = 1; i <= 9; i++) {
    const x = -half + cornerSize + (i - 0.5) * standardWidth;
    coords.push({
      index: 20 + i,
      position: [x, tileY, -half + tileDepth / 2],
      rotation: [0, Math.PI, 0],
      size: [standardWidth * 0.95, tileHeight, tileDepth]
    });
  }

  // Right side: 30 to 39 (moving top to bottom: Z goes from -half to +half at X = +half)
  // 30 is Top-Right corner (Go to Jail)
  coords.push({
    index: 30,
    position: [half - cornerSize / 2, tileY, -half + cornerSize / 2],
    rotation: [0, Math.PI / 2, 0],
    size: [cornerSize, tileHeight, cornerSize]
  });

  for (let i = 1; i <= 9; i++) {
    const z = -half + cornerSize + (i - 0.5) * standardWidth;
    coords.push({
      index: 30 + i,
      position: [half - tileDepth / 2, tileY, z],
      rotation: [0, Math.PI / 2, 0],
      size: [standardWidth * 0.95, tileHeight, tileDepth]
    });
  }

  return coords;
}

export const BOARD_COORDINATES = calculateTileCoordinates();

export function getTileCenter(index: number): [number, number, number] {
  const coord = BOARD_COORDINATES[index % 40];
  return coord ? coord.position : [0, 0, 0];
}
