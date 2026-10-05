import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BoardDef, BuildLevel } from '@monopoly/shared';
import { TileCoordinate, boardGroupTransform, boardLayout, centerScale } from './boardCoords.js';
import { useBoard } from '../board.js';
import { useGameStore } from '../store/gameStore.js';
import { BuildingMesh } from './BuildingMesh.js';
import { CenterBoard } from './CenterBoard.js';
import { BAND_HEX, BoardTextures, loadBoardTextures } from './tileTextures.js';
import { playerHex } from '../ui/theme.js';

const FRAME_H = 0.55;
const FRAME_Y = -0.02;
const RAIL = 0.45;
// Frame around the tile ring (board units): slab +0.6, outer rail +1.5.
const SLAB_PAD = 0.6;
const FRAME_PAD = 1.5;

const EDGE = new THREE.MeshStandardMaterial({ color: '#cfe3c6', roughness: 0.8 });
const BLANK = new THREE.MeshStandardMaterial({ color: '#e4f1dd', roughness: 0.75 });

// One tile; memoized so a game update only re-renders tiles that changed.
const Tile = React.memo(function Tile({
  index,
  coord,
  band,
  materials,
  ownerHex,
  level,
  mortgaged
}: {
  index: number;
  coord: TileCoordinate;
  band: string;
  materials: THREE.Material[];
  ownerHex?: string;
  level: BuildLevel;
  mortgaged: boolean;
}) {
  const [w, h, d] = coord.size;
  return (
    <group
      position={coord.position}
      rotation={coord.rotation}
      onClick={(e) => {
        // Ignore the end of an orbit drag.
        if (e.delta > 8) return;
        e.stopPropagation();
        useGameStore.getState().setInfoTile(index);
      }}
    >
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
        <BuildingMesh
          level={level}
          mortgaged={mortgaged}
          tileIndex={index}
          position={[0, h / 2, -d * 0.36]}
          color={ownerHex}
          base={band}
        />
      )}
    </group>
  );
});

// Gold frame around the tile the player is looking at (tile info / planner).
const FocusMarker: React.FC<{ board: BoardDef }> = ({ board }) => {
  const tile = useGameStore((s) => s.focusTile);
  const ring = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.position.y = 0.1 + Math.sin(clock.elapsedTime * 4) * 0.03;
  });
  if (tile === null) return null;
  const coord = boardLayout(board).coords[tile];
  if (!coord) return null;
  const [w, h, d] = coord.size;
  const t = 0.09;
  const bars: [number, number, number, number][] = [
    [0, -d / 2, w + t, t],
    [0, d / 2, w + t, t],
    [-w / 2, 0, t, d + t],
    [w / 2, 0, t, d + t]
  ];
  return (
    <group position={coord.position} rotation={coord.rotation}>
      <group ref={ring} position={[0, h / 2 + 0.1, 0]}>
        {bars.map(([x, z, sx, sz], i) => (
          <mesh key={i} position={[x, 0, z]}>
            <boxGeometry args={[sx, 0.06, sz]} />
            <meshStandardMaterial color="#ffc629" emissive="#ffb300" emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const Board3D: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const board = useBoard();
  const layout = boardLayout(board);
  const [textures, setTextures] = useState<BoardTextures | null>(null);

  useEffect(() => {
    let alive = true;
    setTextures(null);
    loadBoardTextures(board).then((t) => alive && setTextures(t));
    return () => {
      alive = false;
    };
  }, [board]);

  // One material set per tile: painted top, plain sides (box face order:
  // +x, -x, +y, -y, +z, -z).
  const tileMaterials = useMemo(
    () =>
      board.tiles.map((t) => {
        const map = textures?.tiles[t.index];
        const top = map ? new THREE.MeshStandardMaterial({ map, roughness: 0.7 }) : BLANK;
        return [EDGE, EDGE, top, EDGE, EDGE, EDGE];
      }),
    [textures, board]
  );

  const inner = layout.size + SLAB_PAD;
  const outer = layout.size + FRAME_PAD;

  return (
    <group>
      {/* Bigger boards are laid out at full size, then scaled to the table */}
      <group {...boardGroupTransform(layout)}>
      {/* Chunky dark frame around the board */}
      {(
        [
          [0, -(outer - RAIL) / 2, outer, RAIL],
          [0, (outer - RAIL) / 2, outer, RAIL],
          [-(outer - RAIL) / 2, 0, RAIL, inner],
          [(outer - RAIL) / 2, 0, RAIL, inner]
        ] as const
      ).map(([x, z, sx, sz], i) => (
        <mesh key={`frame-${i}`} receiveShadow castShadow position={[x, FRAME_Y, z]}>
          <boxGeometry args={[sx, FRAME_H, sz]} />
          <meshStandardMaterial color="#3a2415" roughness={0.55} />
        </mesh>
      ))}

      {/* Base slab under the tiles */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[inner, 0.3, inner]} />
        <meshStandardMaterial color="#2b1d10" roughness={0.8} />
      </mesh>

      <FocusMarker board={board} />

      {layout.coords.map((coord) => {
        const prop = gameState?.properties[coord.index];
        const owner = prop?.ownerId ? gameState?.players.find((p) => p.playerId === prop.ownerId) : undefined;
        return (
          <Tile
            key={coord.index}
            index={coord.index}
            coord={coord}
            band={BAND_HEX[board.tiles[coord.index].group]}
            materials={tileMaterials[coord.index]}
            ownerHex={owner ? playerHex(owner.color) : undefined}
            level={prop?.buildLevel ?? 0}
            mortgaged={prop?.isMortgaged ?? false}
          />
        );
      })}
      </group>

      <group scale={[centerScale(layout), 1, centerScale(layout)]}>
        <CenterBoard texture={textures?.center ?? null} />
      </group>
    </group>
  );
};
