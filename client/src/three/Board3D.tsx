import React from 'react';
import { Text } from '@react-three/drei';
import { BOARD_TILES, TileDef } from '@monopoly/shared';
import { BOARD_COORDINATES } from './boardCoords.js';
import { useGameStore } from '../store/gameStore.js';
import { BuildingMesh } from './BuildingMesh.js';

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
      {/* Center Table Plane */}
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[20.5, 0.2, 20.5]} />
        <meshStandardMaterial color="#064e3b" roughness={0.8} />
      </mesh>

      {/* Center Board Art/Logo */}
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[14.8, 0.1, 14.8]} />
        <meshStandardMaterial color="#0f766e" roughness={0.6} />
      </mesh>

      <Text
        position={[0, 0.16, 0]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 4]}
        fontSize={1.4}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        MONOPOLY 3D
      </Text>

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
