import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerState, TokenType } from '@monopoly/shared';
import { getTileCenter } from './boardCoords.js';
import { useGameStore } from '../store/gameStore.js';
import { audioManager } from '../sound/audioManager.js';
import { playerHex } from '../ui/theme.js';

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
  const snapped = useRef(false);
  const visualTile = useRef(player.position);
  const pathQueue = useRef<number[]>([]);
  const stepTimer = useRef(0);
  const stepFromPos = useRef(new THREE.Vector3());
  const stepToPos = useRef(new THREE.Vector3());
  const rollWaitTimer = useRef(0);
  const isStepping = useRef(false);

  // When player.position changes, queue path and wait for dice roll tumble
  useEffect(() => {
    if (!snapped.current) return;
    const from = visualTile.current;
    const to = player.position;
    if (from === to) return;

    const diff = (to - from + 40) % 40;
    // If it's a regular dice walk (1 to 12 steps)
    if (diff >= 1 && diff <= 12) {
      const steps: number[] = [];
      for (let i = 1; i <= diff; i++) {
        steps.push((from + i) % 40);
      }
      pathQueue.current = steps;
      rollWaitTimer.current = 0.95; // wait for dice roll animation in Dice3D to complete
      isStepping.current = false;
      stepTimer.current = 0;
      if (isCurrent) {
        useGameStore.getState().setIsWalking(true);
      }
    } else {
      // Teleport (e.g. Go to Jail or Card warp)
      pathQueue.current = [to];
      rollWaitTimer.current = 0.2;
      isStepping.current = false;
      stepTimer.current = 0;
    }
  }, [player.position, isCurrent]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // First frame initialization: snap immediately to starting tile
    if (!snapped.current) {
      const center = getTileCenter(player.position);
      groupRef.current.position.set(
        center[0] + offset[0],
        center[1] + 0.07 + offset[1],
        center[2] + offset[2]
      );
      visualTile.current = player.position;
      snapped.current = true;
      return;
    }

    // Wait for dice roll animation
    if (rollWaitTimer.current > 0) {
      rollWaitTimer.current -= delta;
      const center = getTileCenter(visualTile.current);
      const hoverY = isCurrent ? 0.08 + Math.sin(state.clock.elapsedTime * 5) * 0.04 : 0;
      groupRef.current.position.set(
        center[0] + offset[0],
        center[1] + 0.07 + offset[1] + hoverY,
        center[2] + offset[2]
      );
      return;
    }

    // Walking path execution
    if (pathQueue.current.length > 0) {
      const STEP_DURATION = 0.17; // seconds per tile hop
      if (!isStepping.current) {
        const nextTile = pathQueue.current[0];
        const fromCenter = getTileCenter(visualTile.current);
        const toCenter = getTileCenter(nextTile);
        stepFromPos.current.set(fromCenter[0] + offset[0], fromCenter[1] + 0.07 + offset[1], fromCenter[2] + offset[2]);
        stepToPos.current.set(toCenter[0] + offset[0], toCenter[1] + 0.07 + offset[1], toCenter[2] + offset[2]);
        stepTimer.current = 0;
        isStepping.current = true;
      }

      stepTimer.current += delta;
      const progress = Math.min(1, stepTimer.current / STEP_DURATION);

      // Interpolate horizontal position, parabolic arc for vertical hop
      const curX = THREE.MathUtils.lerp(stepFromPos.current.x, stepToPos.current.x, progress);
      const curZ = THREE.MathUtils.lerp(stepFromPos.current.z, stepToPos.current.z, progress);
      const arcY = Math.sin(progress * Math.PI) * 0.35;
      const curY = THREE.MathUtils.lerp(stepFromPos.current.y, stepToPos.current.y, progress) + arcY;

      groupRef.current.position.set(curX, curY, curZ);

      if (progress >= 1) {
        const completedTile = pathQueue.current.shift()!;
        visualTile.current = completedTile;
        isStepping.current = false;
        audioManager.playStep();

        if (pathQueue.current.length === 0) {
          // Finished entire path!
          if (isCurrent) {
            useGameStore.getState().setIsWalking(false);
          }
        }
      }
      return;
    }

    // Idle on final destination tile
    const center = getTileCenter(player.position);
    const targetX = center[0] + offset[0];
    const targetY = center[1] + 0.07 + offset[1];
    const targetZ = center[2] + offset[2];

    if (isCurrent) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, Math.min(1, delta * 10));
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, Math.min(1, delta * 10));
      groupRef.current.position.y = targetY + 0.12 + Math.sin(state.clock.elapsedTime * 3) * 0.06;
    } else {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, Math.min(1, delta * 10));
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, Math.min(1, delta * 10));
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, Math.min(1, delta * 10));
    }
  });

  return (
    <group ref={groupRef}>
      {/* White base ring so tokens read against white tiles */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.06, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <TokenGeometry type={player.tokenType} color={playerHex(player.color)} />
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
  // Group players by current tile position to center solo players and disperse multiple tokens
  const playersByTile = useMemo(() => {
    const map = new Map<number, PlayerState[]>();
    for (const p of players) {
      if (!map.has(p.position)) map.set(p.position, []);
      map.get(p.position)!.push(p);
    }
    return map;
  }, [players]);

  const getOffset = (p: PlayerState): [number, number, number] => {
    const sharing = playersByTile.get(p.position) || [];
    if (sharing.length <= 1) {
      return [0, 0, 0]; // Exactly centered on the tile!
    }
    const idxOnTile = sharing.findIndex((s) => s.playerId === p.playerId);
    if (sharing.length === 2) {
      return idxOnTile === 0 ? [-0.28, 0, 0] : [0.28, 0, 0];
    }
    if (sharing.length === 3) {
      const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
      const a = angles[idxOnTile] ?? 0;
      return [Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32];
    }
    const angle = (idxOnTile / sharing.length) * Math.PI * 2;
    return [Math.cos(angle) * 0.34, 0, Math.sin(angle) * 0.34];
  };

  return (
    <group>
      {players.map((p, idx) => (
        <AnimatedToken
          key={p.playerId}
          player={p}
          isCurrent={idx === currentPlayerIndex}
          offset={getOffset(p)}
        />
      ))}
    </group>
  );
};
