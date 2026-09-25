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

export const Board3D: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);

  return (
    <group>
      {/* Blue board frame (raised border like a real board) */}
      <mesh receiveShadow castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[21.4, 0.3, 21.4]} />
        <meshStandardMaterial color="#2563eb" roughness={0.55} />
      </mesh>

      {/* White tile-ring base */}
      <mesh receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[20.6, 0.16, 20.6]} />
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

            {/* Color Band for purchasable properties */}
            {!isCorner && tile.price > 0 && (
              <mesh position={[0, coord.size[1] / 2 + 0.01, -coord.size[2] * 0.35]}>
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

            {/* Price text */}
            {tile.price > 0 && (
              <Text
                position={[0, coord.size[1] / 2 + 0.03, coord.size[2] * 0.3]}
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
