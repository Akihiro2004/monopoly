import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerState, TokenType } from '@monopoly/shared';
import { getTileCenter } from './boardCoords.js';

interface TokensProps {
  players: PlayerState[];
  currentPlayerIndex: number;
}

// Token Shape Geometries based on TokenType
const TokenGeometry: React.FC<{ type: TokenType; color: string }> = ({ type, color }) => {
  switch (type) {
    case 'car':
      return (
        <group scale={0.62}>
          <mesh castShadow position={[0, 0.25, 0]}>
            <boxGeometry args={[0.8, 0.4, 1.4]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh castShadow position={[0, 0.55, -0.1]}>
            <boxGeometry args={[0.6, 0.35, 0.7]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.1} />
          </mesh>
        </group>
      );
    case 'hat':
      return (
        <group scale={0.58}>
          <mesh castShadow position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.7, 0.7, 0.1, 16]} />
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
          </mesh>
          <mesh castShadow position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.8, 16]} />
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      );
    case 'dog':
      return (
        <group scale={0.5}>
          <mesh castShadow position={[0, 0.35, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.9]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0, 0.7, 0.4]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        </group>
      );
    case 'ship':
      return (
        <group scale={0.5}>
          <mesh castShadow position={[0, 0.6, 0]}>
            <coneGeometry args={[0.5, 1.2, 4]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      );
    case 'thimble':
      return (
        <group scale={0.5}>
          <mesh castShadow position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.4, 0.5, 0.8, 12]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      );
    case 'boot':
    default:
      return (
        <group scale={0.5}>
          <mesh castShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[0.4, 0.8, 0.8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      );
  }
};

const AnimatedToken: React.FC<{
  player: PlayerState;
  isCurrent: boolean;
  offset: [number, number, number];
}> = ({ player, isCurrent, offset }) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const snapped = useRef(false);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Tile center is the middle of the tile box; tokens rest on the top face.
    const center = getTileCenter(player.position);
    targetPos.current.set(
      center[0] + offset[0],
      center[1] + 0.07 + offset[1],
      center[2] + offset[2]
    );

    // Snap onto the tile on the first frame so tokens never fly in from origin.
    if (!snapped.current) {
      groupRef.current.position.copy(targetPos.current);
      snapped.current = true;
      return;
    }

    // Smooth Lerp towards destination tile
    groupRef.current.position.lerp(targetPos.current, Math.min(1, delta * 8));

    // Active player hovers above their tile. This must be set from the target
    // position each frame, never added to the lerped value, or the offset
    // accumulates and sinks the token through the board.
    if (isCurrent) {
      groupRef.current.position.y = targetPos.current.y + 0.12 + Math.sin(state.clock.elapsedTime * 3) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      {/* White base ring so tokens read against white tiles */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.06, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <TokenGeometry type={player.tokenType} color={player.color} />
      {/* Active player spotlight pointer */}
      {isCurrent && (
        <mesh position={[0, 1.35, 0]}>
          <coneGeometry args={[0.18, 0.36, 8]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}
    </group>
  );
};

export const Tokens3D: React.FC<TokensProps> = ({ players, currentPlayerIndex }) => {
  // Disperse multiple tokens on same tile slightly
  const offsets: [number, number, number][] = [
    [-0.38, 0, -0.34],
    [0.38, 0, -0.34],
    [-0.38, 0, 0.34],
    [0.38, 0, 0.34],
    [0, 0, 0],
    [0, 0, 0.44]
  ];

  return (
    <group>
      {players.map((p, idx) => (
        <AnimatedToken
          key={p.playerId}
          player={p}
          isCurrent={idx === currentPlayerIndex}
          offset={offsets[idx % offsets.length]}
        />
      ))}
    </group>
  );
};
