import React from 'react';
import { Text } from '@react-three/drei';
import { BOARD_TILES, TileDef } from '@monopoly/shared';
import { BOARD_COORDINATES } from './boardCoords.js';
import { useGameStore } from '../store/gameStore.js';
import { BuildingMesh } from './BuildingMesh.js';
import { CenterBoard } from './CenterBoard.js';

const GROUP_COLORS: Record<string, string> = {
  brown: '#8B4513',
  lightblue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#FF0000',
  yellow: '#FFD700',
  green: '#008000',
  darkblue: '#0000CD',
  railroad: '#4B5563',
  utility: '#9CA3AF',
  special: '#D1D5DB'
};

const FRAME_H = 0.6; // frame rail height
const FRAME_Y = -0.05; // rail center, so rails rest on the table and rise past the tiles
const RAIL = 0.4; // rail thickness
const OUTER = 21.4; // outer board size
const INNER = 20.6; // inner size, flush with the white tile-ring base

export const Board3D: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);

  return (
    <group>
      {/* Blue board frame: four rails forming a raised border (a solid slab
          would swallow the tiles sitting inside it) */}
      {(
        [
          [0, -(OUTER - RAIL) / 2, OUTER, RAIL],
          [0, (OUTER - RAIL) / 2, OUTER, RAIL],
          [-(OUTER - RAIL) / 2, 0, RAIL, INNER],
          [(OUTER - RAIL) / 2, 0, RAIL, INNER]
        ] as const
      ).map(([x, z, sx, sz], i) => (
        <mesh key={`frame-${i}`} receiveShadow castShadow position={[x, FRAME_Y, z]}>
          <boxGeometry args={[sx, FRAME_H, sz]} />
          <meshStandardMaterial color="#2563eb" roughness={0.55} />
        </mesh>
      ))}

      {/* White tile-ring base */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[20.6, 0.3, 20.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>

      {/* Center art: logo banner + card decks */}
      <CenterBoard />

      {/* 40 Tiles */}
      {BOARD_COORDINATES.map((coord) => {
        const tile: TileDef = BOARD_TILES[coord.index];
        const prop = gameState?.properties[coord.index];
        const isCorner = coord.index % 10 === 0;
        const groupColor = GROUP_COLORS[tile.group] || '#D1D5DB';

        // Color band and price sit on opposite edges of the tile.
        // Both must face the board center so all four sides read consistently.
        const bandSign = coord.index >= 10 && coord.index <= 29 ? 1 : -1;
        const bandZ = bandSign * coord.size[2] * 0.35;
        const priceZ = -bandSign * coord.size[2] * 0.32;

        // Check if tile has an owner
        let ownerColor: string | undefined;
        if (prop?.ownerId && gameState) {
          const owner = gameState.players.find((p) => p.playerId === prop.ownerId);
          ownerColor = owner?.color;
        }

        return (
          <group key={coord.index} position={coord.position} rotation={coord.rotation}>
            {/* Tile Mesh */}
            <mesh receiveShadow castShadow>
              <boxGeometry args={coord.size} />
              <meshStandardMaterial
                color={ownerColor ? '#ffffff' : '#f8fafc'}
                roughness={0.4}
              />
            </mesh>

            {/* Color Band for purchasable properties (inner edge, facing center) */}
            {!isCorner && tile.price > 0 && (
              <mesh position={[0, coord.size[1] / 2 + 0.01, bandZ]}>
                <boxGeometry args={[coord.size[0] * 0.95, 0.02, coord.size[2] * 0.25]} />
                <meshStandardMaterial color={groupColor} roughness={0.3} />
              </mesh>
            )}

            {/* Owner Flag Ring on top if owned */}
            {ownerColor && (
              <mesh position={[0, coord.size[1] / 2 + 0.02, 0]}>
                <boxGeometry args={[coord.size[0] * 0.85, 0.02, coord.size[2] * 0.85]} />
                <meshStandardMaterial color={ownerColor} transparent opacity={0.35} />
              </mesh>
            )}

            {/* Tile Label */}
            <Text
              position={[0, coord.size[1] / 2 + 0.03, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.24}
              color="#0f172a"
              maxWidth={coord.size[0] * 0.9}
              textAlign="center"
              anchorX="center"
              anchorY="middle"
            >
              {tile.name}
            </Text>

            {/* Price text on the outer edge */}
            {tile.price > 0 && (
              <Text
                position={[0, coord.size[1] / 2 + 0.03, priceZ]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.2}
                color="#475569"
                anchorX="center"
                anchorY="middle"
              >
                ${tile.price}
              </Text>
            )}

            {/* 3D Buildings (House/Building/Hotel/Landmark) */}
            {prop && prop.buildLevel > 0 && (
              <BuildingMesh
                level={prop.buildLevel}
                position={[0, coord.size[1] / 2, 0]}
              />
            )}
          </group>
        );
      })}
    </group>
  );
};
