import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { PlayerState, TokenType } from '@monopoly/shared';
import { getTileCenter } from './boardCoords.js';
import { useGameStore } from '../store/gameStore.js';
import { audioManager } from '../sound/audioManager.js';
import { playerHex } from '../ui/theme.js';

interface TokensProps {
  players: PlayerState[];
  currentPlayerIndex: number;
}

// Classic Monopoly pieces, modelled a bit chunkier and glossier. Every
// piece is ~0.75 units tall and stands on a base disc in the player color.
function useLathe(points: [number, number][], segments = 32) {
  return useMemo(() => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments), [points, segments]);
}

function useExtrude(draw: (s: THREE.Shape) => void, depth: number) {
  return useMemo(() => {
    const shape = new THREE.Shape();
    draw(shape);
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3 });
    g.translate(0, 0, -depth / 2);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth]);
}

const Glossy: React.FC<{ color: string }> = ({ color }) => <meshStandardMaterial color={color} metalness={0.35} roughness={0.28} />;
const Dark: React.FC = () => <meshStandardMaterial color="#2b1d10" roughness={0.5} />;

const HAT_PROFILE: [number, number][] = [[0, 0], [0.4, 0], [0.42, 0.03], [0.4, 0.06], [0.24, 0.07], [0.22, 0.12], [0.24, 0.55], [0.26, 0.58], [0, 0.6]];
const THIMBLE_PROFILE: [number, number][] = [[0, 0], [0.26, 0], [0.28, 0.04], [0.26, 0.08], [0.24, 0.5], [0.2, 0.6], [0.1, 0.65], [0, 0.66]];

const Car: React.FC<{ color: string }> = ({ color }) => (
  <group position={[0, 0.02, 0]}>
    <RoundedBox args={[0.46, 0.18, 0.88]} radius={0.07} position={[0, 0.17, 0]} castShadow>
      <Glossy color={color} />
    </RoundedBox>
    <RoundedBox args={[0.38, 0.16, 0.4]} radius={0.06} position={[0, 0.32, -0.08]} castShadow>
      <meshStandardMaterial color="#bfe6ff" metalness={0.2} roughness={0.1} />
    </RoundedBox>
    {[[-0.24, 0.3], [0.24, 0.3], [-0.24, -0.28], [0.24, -0.28]].map(([x, z], i) => (
      <mesh key={i} castShadow position={[x, 0.1, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
        <Dark />
      </mesh>
    ))}
    {[-0.13, 0.13].map((x) => (
      <mesh key={x} position={[x, 0.2, 0.44]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshStandardMaterial color="#fff6b0" emissive="#ffe066" emissiveIntensity={0.8} />
      </mesh>
    ))}
  </group>
);

const TopHat: React.FC<{ color: string }> = ({ color }) => {
  const geo = useLathe(HAT_PROFILE);
  return (
    <group>
      <mesh castShadow geometry={geo}>
        <Glossy color={color} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.235, 0.235, 0.08, 32]} />
        <Dark />
      </mesh>
    </group>
  );
};

const Dog: React.FC<{ color: string }> = ({ color }) => (
  <group position={[0, 0.02, 0]}>
    <RoundedBox args={[0.3, 0.26, 0.62]} radius={0.1} position={[0, 0.3, 0]} castShadow>
      <Glossy color={color} />
    </RoundedBox>
    <RoundedBox args={[0.26, 0.26, 0.28]} radius={0.09} position={[0, 0.52, 0.28]} castShadow>
      <Glossy color={color} />
    </RoundedBox>
    <RoundedBox args={[0.16, 0.12, 0.18]} radius={0.05} position={[0, 0.46, 0.46]} castShadow>
      <Glossy color={color} />
    </RoundedBox>
    <mesh position={[0, 0.49, 0.56]}>
      <sphereGeometry args={[0.04, 10, 8]} />
      <Dark />
    </mesh>
    {[-0.07, 0.07].map((x) => (
      <mesh key={x} position={[x, 0.58, 0.42]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <Dark />
      </mesh>
    ))}
    {[-0.08, 0.08].map((x) => (
      <mesh key={x} castShadow position={[x, 0.7, 0.24]}>
        <coneGeometry args={[0.05, 0.14, 8]} />
        <Glossy color={color} />
      </mesh>
    ))}
    {[[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]].map(([x, z], i) => (
      <mesh key={i} castShadow position={[x, 0.1, z]}>
        <cylinderGeometry args={[0.05, 0.055, 0.2, 10]} />
        <Glossy color={color} />
      </mesh>
    ))}
    <mesh castShadow position={[0, 0.48, -0.32]} rotation={[-0.7, 0, 0]}>
      <coneGeometry args={[0.04, 0.2, 8]} />
      <Glossy color={color} />
    </mesh>
  </group>
);

const Ship: React.FC<{ color: string }> = ({ color }) => {
  const hull = useExtrude((s) => {
    s.moveTo(-0.22, 0.45);
    s.lineTo(0.22, 0.45);
    s.lineTo(0.22, -0.3);
    s.quadraticCurveTo(0.2, -0.5, 0, -0.62);
    s.quadraticCurveTo(-0.2, -0.5, -0.22, -0.3);
    s.closePath();
  }, 0.16);
  return (
    <group position={[0, 0.02, 0]}>
      {/* hull (extruded top-view outline, stood upright) */}
      <mesh castShadow geometry={hull} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <Glossy color={color} />
      </mesh>
      <mesh position={[0, 0.06, -0.08]}>
        <boxGeometry args={[0.4, 0.1, 0.9]} />
        <Dark />
      </mesh>
      <RoundedBox args={[0.3, 0.16, 0.44]} radius={0.04} position={[0, 0.34, 0.02]} castShadow>
        <meshStandardMaterial color="#fffaf0" roughness={0.4} />
      </RoundedBox>
      {[-0.08, 0.14].map((z) => (
        <mesh key={z} castShadow position={[0, 0.52, z]}>
          <cylinderGeometry args={[0.06, 0.07, 0.22, 14]} />
          <Glossy color={color} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.62, -0.28]}>
        <cylinderGeometry args={[0.015, 0.015, 0.5, 8]} />
        <Dark />
      </mesh>
    </group>
  );
};

const Thimble: React.FC<{ color: string }> = ({ color }) => {
  const geo = useLathe(THIMBLE_PROFILE);
  return (
    <group>
      <mesh castShadow geometry={geo}>
        <Glossy color={color} />
      </mesh>
      {[0.2, 0.3, 0.4].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25 - (y - 0.2) * 0.1, 0.012, 6, 32]} />
          <Dark />
        </mesh>
      ))}
    </group>
  );
};

const Boot: React.FC<{ color: string }> = ({ color }) => {
  const geo = useExtrude((s) => {
    s.moveTo(-0.2, 0);
    s.lineTo(0.38, 0);
    s.quadraticCurveTo(0.44, 0.02, 0.4, 0.14);
    s.quadraticCurveTo(0.3, 0.24, 0.08, 0.26);
    s.lineTo(0.06, 0.62);
    s.lineTo(-0.22, 0.62);
    s.closePath();
  }, 0.24);
  return (
    <group position={[-0.06, 0.02, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh castShadow geometry={geo}>
        <Glossy color={color} />
      </mesh>
      <mesh position={[0.1, 0.02, 0]}>
        <boxGeometry args={[0.62, 0.05, 0.3]} />
        <Dark />
      </mesh>
      {[0.3, 0.4, 0.5].map((y) => (
        <mesh key={y} position={[0.08, y, 0]}>
          <boxGeometry args={[0.03, 0.03, 0.3]} />
          <Dark />
        </mesh>
      ))}
    </group>
  );
};

const TokenGeometry: React.FC<{ type: TokenType; color: string }> = ({ type, color }) => {
  switch (type) {
    case 'car':
      return <Car color={color} />;
    case 'hat':
      return <TopHat color={color} />;
    case 'dog':
      return <Dog color={color} />;
    case 'ship':
      return <Ship color={color} />;
    case 'thimble':
      return <Thimble color={color} />;
    case 'boot':
    default:
      return <Boot color={color} />;
  }
};

// Bouncing gold arrow + pulsing ring under the player whose turn it is.
const ActiveMarker: React.FC<{ color: string }> = ({ color }) => {
  const arrow = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (arrow.current) {
      arrow.current.position.y = 1.55 + Math.sin(t * 4) * 0.12;
      arrow.current.rotation.y = t * 2;
    }
    if (ring.current) {
      const s = 1 + (t % 1.2) * 0.6;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - (t % 1.2) / 1.2);
    }
  });
  return (
    <>
      <group ref={arrow}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.2, 0.34, 4]} />
          <meshStandardMaterial color="#ffc629" emissive="#ffb300" emissiveIntensity={0.5} metalness={0.4} roughness={0.3} />
        </mesh>
      </group>
      <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.55, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </>
  );
};

type PathItem = { kind: 'step' | 'glide'; tile: number; passGo?: boolean } | { kind: 'pause'; seconds: number };

const STEP_DURATION = 0.17; // seconds per tile hop
const DICE_WAIT = 0.95; // let the dice tumble before walking
const LANDING_PAUSE = 1.5; // on Chance / Go To Jail before the follow-up move

function walkSteps(from: number, to: number): PathItem[] {
  const diff = (to - from + 40) % 40;
  if (diff >= 1 && diff <= 12) {
    return Array.from({ length: diff }, (_, i) => ({ kind: 'step' as const, tile: (from + i + 1) % 40 }));
  }
  return from === to ? [] : [{ kind: 'glide', tile: to }];
}

const AnimatedToken: React.FC<{
  player: PlayerState;
  isCurrent: boolean;
  offset: [number, number, number];
}> = ({ player, isCurrent, offset }) => {
  const groupRef = useRef<THREE.Group>(null);
  const facingRef = useRef<THREE.Group>(null);
  const scratch = useRef(new THREE.Vector3());
  const snapped = useRef(false);
  const visualTile = useRef(player.position);
  const pathQueue = useRef<PathItem[]>([]);
  const stepTimer = useRef(0);
  const stepDuration = useRef(STEP_DURATION);
  const stepFromPos = useRef(new THREE.Vector3());
  const stepToPos = useRef(new THREE.Vector3());
  const waitTimer = useRef(0);
  const pausing = useRef(false);
  const isStepping = useRef(false);
  const drivesWalkFlag = useRef(false);
  const lastSeq = useRef(useGameStore.getState().gameState?.lastMove?.seq ?? 0);

  // When the position changes, build the path: dice walk to the landing tile,
  // then (for cards / Go To Jail) a pause and a glide to the final tile.
  useEffect(() => {
    if (!snapped.current) return;
    const from = visualTile.current;
    const to = player.position;
    if (from === to && pathQueue.current.length === 0) return;

    const move = useGameStore.getState().gameState?.lastMove;
    const fresh = move && move.playerId === player.playerId && move.to === to && move.seq !== lastSeq.current;
    let path: PathItem[];
    if (fresh) {
      lastSeq.current = move.seq;
      path = walkSteps(from, move.landed).map((st) => (st.kind === 'step' && st.tile === 0 ? { ...st, passGo: true } : st));
      if (move.landed !== move.to) {
        // Card moves that wrap around the board (or land on GO) pay the salary.
        const passGo = !!move.passedGo;
        path.push({ kind: 'pause', seconds: LANDING_PAUSE }, { kind: 'glide', tile: move.to, passGo });
      }
      waitTimer.current = DICE_WAIT;
    } else {
      path = walkSteps(from, to);
      waitTimer.current = 0.2;
    }

    pathQueue.current = path;
    isStepping.current = false;
    stepTimer.current = 0;
    if (isCurrent && path.length > 0) {
      drivesWalkFlag.current = true;
      useGameStore.getState().setIsWalking(true);
    }
  }, [player.position, player.playerId, isCurrent]);

  const finishWalk = () => {
    if (drivesWalkFlag.current) {
      drivesWalkFlag.current = false;
      const st = useGameStore.getState();
      st.setWalkPaused(false);
      st.setIsWalking(false);
    }
  };

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    // Reuses one vector: no allocations in the frame loop.
    const place = (tile: number) => {
      const c = getTileCenter(tile);
      return scratch.current.set(c[0] + offset[0], c[1] + 0.07 + offset[1], c[2] + offset[2]);
    };

    if (!snapped.current) {
      groupRef.current.position.copy(place(player.position));
      visualTile.current = player.position;
      snapped.current = true;
      return;
    }

    // Waiting for the dice tumble, or pausing on the landing tile
    if (waitTimer.current > 0) {
      waitTimer.current -= Math.min(delta, 0.1);
      const p = place(visualTile.current);
      const hover = isCurrent ? 0.08 + Math.sin(state.clock.elapsedTime * 5) * 0.04 : 0;
      groupRef.current.position.set(p.x, p.y + hover, p.z);
      if (waitTimer.current <= 0 && pausing.current) {
        pausing.current = false;
        if (drivesWalkFlag.current) useGameStore.getState().setWalkPaused(false);
      }
      return;
    }

    if (pathQueue.current.length > 0) {
      const next = pathQueue.current[0];
      if (next.kind === 'pause') {
        pathQueue.current.shift();
        waitTimer.current = next.seconds;
        pausing.current = true;
        if (drivesWalkFlag.current) useGameStore.getState().setWalkPaused(true);
        return;
      }

      if (!isStepping.current) {
        stepFromPos.current.copy(place(visualTile.current));
        stepToPos.current.copy(place(next.tile));
        stepDuration.current = next.kind === 'glide' ? 0.75 : STEP_DURATION;
        // Face the direction of travel (token models look down +z).
        if (facingRef.current) {
          const dx = stepToPos.current.x - stepFromPos.current.x;
          const dz = stepToPos.current.z - stepFromPos.current.z;
          if (Math.abs(dx) + Math.abs(dz) > 0.01) facingRef.current.rotation.y = Math.atan2(dx, dz);
        }
        stepTimer.current = 0;
        isStepping.current = true;
      }

      stepTimer.current += Math.min(delta, 0.05);
      const progress = Math.min(1, stepTimer.current / stepDuration.current);
      const eased = next.kind === 'glide' ? 0.5 - Math.cos(progress * Math.PI) / 2 : progress;
      const arc = Math.sin(progress * Math.PI) * (next.kind === 'glide' ? 2.2 : 0.35);
      groupRef.current.position.lerpVectors(stepFromPos.current, stepToPos.current, eased);
      groupRef.current.position.y += arc;

      if (progress >= 1) {
        pathQueue.current.shift();
        visualTile.current = next.tile;
        isStepping.current = false;
        audioManager.playStep();
        if (next.passGo) {
          useGameStore.getState().celebrateGo(player.playerId);
        }
        if (pathQueue.current.length === 0) finishWalk();
      }
      return;
    }

    // Idle on the final tile (also absorbs any late position correction)
    const target = place(player.position);
    const k = Math.min(1, delta * 10);
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, target.x, k);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, target.z, k);
    groupRef.current.position.y = isCurrent
      ? target.y + 0.12 + Math.sin(state.clock.elapsedTime * 3) * 0.06
      : THREE.MathUtils.lerp(groupRef.current.position.y, target.y, k);
    visualTile.current = player.position;
  });

  return (
    <group ref={groupRef}>
      {/* Base disc in the player color with a dark rim */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.44, 0.48, 0.07, 28]} />
        <meshStandardMaterial color="#2b1d10" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.02, 28]} />
        <meshStandardMaterial color={playerHex(player.color)} roughness={0.4} />
      </mesh>
      <group ref={facingRef} position={[0, 0.07, 0]} scale={1.3}>
        <TokenGeometry type={player.tokenType} color={playerHex(player.color)} />
      </group>
      {isCurrent && <ActiveMarker color={playerHex(player.color)} />}
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
