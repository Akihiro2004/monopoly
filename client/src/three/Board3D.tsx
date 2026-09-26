import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { BOARD_TILES, BuildLevel } from '@monopoly/shared';
import { BOARD_COORDINATES } from './boardCoords.js';
import { useGameStore } from '../store/gameStore.js';
import { BuildingMesh } from './BuildingMesh.js';
import { CenterBoard } from './CenterBoard.js';
import { BoardTextures, loadBoardTextures } from './tileTextures.js';
import { playerHex } from '../ui/theme.js';

const FRAME_H = 0.55;
const FRAME_Y = -0.02;
const RAIL = 0.45;
const OUTER = 21.5;
const INNER = 20.6;

const EDGE = new THREE.MeshStandardMaterial({ color: '#cfe3c6', roughness: 0.8 });
const BLANK = new THREE.MeshStandardMaterial({ color: '#e4f1dd', roughness: 0.75 });

// One tile; memoized so a game update only re-renders tiles that changed.
const Tile = React.memo(function Tile({
  index,
  materials,
  ownerHex,
  level,
  mortgaged
}: {
  index: number;
  materials: THREE.Material[];
  ownerHex?: string;
  level: BuildLevel;
  mortgaged: boolean;
}) {
  const coord = BOARD_COORDINATES[index];
  const [w, h, d] = coord.size;
  return (
    <group position={coord.position} rotation={coord.rotation}>
      <mesh receiveShadow material={materials}>
        <boxGeometry args={[w * 0.985, h, d * 0.985]} />
      </mesh>

      {/* Ownership plate on the outer edge, in the owner's color */}
      {ownerHex && (
        <group position={[0, h / 2 + 0.02, d * 0.455]}>
          <mesh castShadow>
            <boxGeometry args={[w * 0.9, 0.05, d * 0.07]} />
            <meshStandardMaterial color="#2b1d10" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[w * 0.84, 0.03, d * 0.045]} />
            <meshStandardMaterial color={ownerHex} roughness={0.35} metalness={0.1} />
          </mesh>
        </group>
      )}

      {/* Buildings stand on the color band (inner edge) */}
      {ownerHex && (
        <BuildingMesh level={level} mortgaged={mortgaged} tileIndex={index} position={[0, h / 2, -d * 0.36]} color={ownerHex} />
      )}
    </group>
  );
});

export const Board3D: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const [textures, setTextures] = useState<BoardTextures | null>(null);

  useEffect(() => {
    let alive = true;
    loadBoardTextures().then((t) => alive && setTextures(t));
    return () => {
      alive = false;
    };
  }, []);

  // One material set per tile: painted top, plain sides (box face order:
  // +x, -x, +y, -y, +z, -z).
  const tileMaterials = useMemo(
    () =>
      BOARD_TILES.map((t) => {
        const top = textures
          ? new THREE.MeshStandardMaterial({ map: textures.tiles[t.index], roughness: 0.7 })
          : BLANK;
        return [EDGE, EDGE, top, EDGE, EDGE, EDGE];
      }),
    [textures]
  );

  return (
    <group>
      {/* Chunky dark frame around the board */}
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
          <meshStandardMaterial color="#3a2415" roughness={0.55} />
        </mesh>
      ))}

      {/* Base slab under the tiles */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[INNER, 0.3, INNER]} />
        <meshStandardMaterial color="#2b1d10" roughness={0.8} />
      </mesh>

      <CenterBoard texture={textures?.center ?? null} />

      {BOARD_COORDINATES.map((coord) => {
        const prop = gameState?.properties[coord.index];
        const owner = prop?.ownerId ? gameState?.players.find((p) => p.playerId === prop.ownerId) : undefined;
        return (
          <Tile
            key={coord.index}
            index={coord.index}
            materials={tileMaterials[coord.index]}
            ownerHex={owner ? playerHex(owner.color) : undefined}
            level={prop?.buildLevel ?? 0}
            mortgaged={prop?.isMortgaged ?? false}
          />
        );
      })}
    </group>
  );
};
