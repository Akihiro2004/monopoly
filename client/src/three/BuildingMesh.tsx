import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildLevel } from '@monopoly/shared';

interface BuildingProps {
  level: BuildLevel;
  position: [number, number, number];
  color?: string;
  mortgaged?: boolean;
}

const WALL = '#fffaf0';
const TRIM = '#2b1d10';
const WINDOW = '#7cc8f5';
const GOLD = '#ffc629';

const Box: React.FC<{ args: [number, number, number]; position: [number, number, number]; color: string; metal?: number; emissive?: string }> = ({
  args,
  position,
  color,
  metal = 0,
  emissive
}) => (
  <mesh castShadow receiveShadow position={position}>
    <boxGeometry args={args} />
    <meshStandardMaterial color={color} roughness={0.55} metalness={metal} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.35 : 0} />
  </mesh>
);

// Gable roof as a triangular prism.
const Roof: React.FC<{ w: number; d: number; h: number; y: number; color: string }> = ({ w, d, h, y, color }) => {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 - 0.03, 0);
    shape.lineTo(0, h);
    shape.lineTo(w / 2 + 0.03, 0);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: d + 0.06, bevelEnabled: false });
    g.translate(0, 0, -(d + 0.06) / 2);
    return g;
  }, [w, d, h]);
  return (
    <mesh castShadow geometry={geo} position={[0, y, 0]}>
      <meshStandardMaterial color={color} roughness={0.45} />
    </mesh>
  );
};

const Windows: React.FC<{ cols: number; rows: number; w: number; y0: number; dy: number; z: number }> = ({ cols, rows, w, y0, dy, z }) => (
  <>
    {Array.from({ length: rows * cols }).map((_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = cols === 1 ? 0 : -w / 2 + (w / (cols - 1)) * c;
      return <Box key={i} args={[0.09, 0.09, 0.02]} position={[x, y0 + r * dy, z]} color={WINDOW} emissive="#bde6ff" />;
    })}
  </>
);

// Level 0: owned land gets a little flag in the owner's color.
const Flag: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <Box args={[0.03, 0.5, 0.03]} position={[0, 0.25, 0]} color={TRIM} />
    <Box args={[0.26, 0.16, 0.02]} position={[0.14, 0.4, 0]} color={color} />
    <Box args={[0.16, 0.04, 0.16]} position={[0, 0.02, 0]} color={TRIM} />
  </group>
);

const House: React.FC<{ color: string; x?: number; s?: number }> = ({ color, x = 0, s = 1 }) => (
  <group position={[x, 0, 0]} scale={s}>
    <Box args={[0.38, 0.26, 0.32]} position={[0, 0.13, 0]} color={WALL} />
    <Roof w={0.38} d={0.32} h={0.2} y={0.26} color={color} />
    <Box args={[0.09, 0.14, 0.02]} position={[0, 0.07, 0.17]} color={TRIM} />
    <Box args={[0.08, 0.08, 0.02]} position={[0.12, 0.17, 0.17]} color={WINDOW} emissive="#bde6ff" />
    <Box args={[0.08, 0.08, 0.02]} position={[-0.12, 0.17, 0.17]} color={WINDOW} emissive="#bde6ff" />
    <Box args={[0.06, 0.14, 0.06]} position={[0.11, 0.4, -0.06]} color="#b3542e" />
  </group>
);

const Townhouse: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <House color={color} x={-0.4} s={0.85} />
    <group position={[0.18, 0, 0]}>
      <Box args={[0.62, 0.62, 0.42]} position={[0, 0.31, 0]} color={WALL} />
      <Box args={[0.68, 0.08, 0.48]} position={[0, 0.66, 0]} color={color} />
      <Windows cols={3} rows={2} w={0.4} y0={0.2} dy={0.22} z={0.22} />
      <Box args={[0.14, 0.18, 0.02]} position={[0, 0.09, 0.22]} color={TRIM} />
    </group>
  </group>
);

const Hotel: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <Box args={[1.2, 0.9, 0.52]} position={[0, 0.45, 0]} color={color} />
    <Box args={[1.26, 0.08, 0.58]} position={[0, 0.94, 0]} color={TRIM} />
    {/* white facade stripes + windows */}
    <Box args={[1.1, 0.8, 0.02]} position={[0, 0.46, 0.265]} color={WALL} />
    <Windows cols={5} rows={3} w={0.86} y0={0.3} dy={0.22} z={0.28} />
    <Box args={[0.22, 0.2, 0.02]} position={[0, 0.1, 0.28]} color={TRIM} />
    {/* rooftop sign */}
    <Box args={[0.7, 0.2, 0.05]} position={[0, 1.1, 0]} color={GOLD} emissive="#ffb300" />
    <Box args={[0.04, 0.12, 0.04]} position={[-0.25, 0.98, 0]} color={TRIM} />
    <Box args={[0.04, 0.12, 0.04]} position={[0.25, 0.98, 0]} color={TRIM} />
  </group>
);

// Landmark: a columned palace with a gold dome, spire and the owner's flag.
const Landmark: React.FC<{ color: string }> = ({ color }) => {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.8;
  });
  return (
    <group>
      <Box args={[1.36, 0.1, 0.66]} position={[0, 0.05, 0]} color={GOLD} metal={0.4} />
      <Box args={[1.24, 0.08, 0.58]} position={[0, 0.14, 0]} color={WALL} />
      <Box args={[1.0, 0.55, 0.4]} position={[0, 0.45, -0.05]} color={WALL} />
      {/* columns */}
      {[-0.45, -0.15, 0.15, 0.45].map((x) => (
        <mesh key={x} castShadow position={[x, 0.45, 0.22]}>
          <cylinderGeometry args={[0.045, 0.05, 0.55, 12]} />
          <meshStandardMaterial color={WALL} roughness={0.4} />
        </mesh>
      ))}
      <Box args={[1.12, 0.08, 0.6]} position={[0, 0.76, 0]} color={color} />
      <Roof w={1.0} d={0.1} h={0.18} y={0.8} color={color} />
      {/* drum + gold dome + spire */}
      <mesh castShadow position={[0, 0.92, -0.08]}>
        <cylinderGeometry args={[0.27, 0.3, 0.24, 20]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 1.04, -0.08]}>
        <sphereGeometry args={[0.27, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} emissive="#ffb300" emissiveIntensity={0.25} />
      </mesh>
      <mesh castShadow position={[0, 1.44, -0.08]}>
        <coneGeometry args={[0.05, 0.3, 10]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} />
      </mesh>
      <Box args={[0.02, 0.26, 0.02]} position={[0, 1.66, -0.08]} color={TRIM} />
      <Box args={[0.2, 0.12, 0.015]} position={[0.1, 1.73, -0.08]} color={color} />
      {/* slowly spinning sparkle ring */}
      <mesh ref={ring} position={[0, 1.16, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.018, 8, 40]} />
        <meshStandardMaterial color={GOLD} emissive="#ffd54a" emissiveIntensity={0.8} metalness={0.5} />
      </mesh>
    </group>
  );
};

// Pops the building in with a little spring whenever the level changes.
export const BuildingMesh: React.FC<BuildingProps> = ({ level, position, color = '#94a3b8', mortgaged }) => {
  const group = useRef<THREE.Group>(null);
  const t = useRef(1);

  useEffect(() => {
    t.current = 0;
  }, [level]);

  useFrame((_, dt) => {
    if (!group.current || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt * 2.2);
    const x = t.current;
    const s = 1 + Math.sin(x * Math.PI * 1.5) * (1 - x) * 0.6;
    group.current.scale.setScalar(Math.max(0.01, x < 0.25 ? x * 4 : s));
  });

  const body =
    level === 0 ? <Flag color={color} /> : level === 1 ? <House color={color} /> : level === 2 ? <Townhouse color={color} /> : level === 3 ? <Hotel color={color} /> : <Landmark color={color} />;

  return (
    <group ref={group} position={position}>
      <group scale={1.15}>{body}</group>
      {mortgaged && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 0.6]} />
          <meshBasicMaterial color="#2b1d10" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
};
