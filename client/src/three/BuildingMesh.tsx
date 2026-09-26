import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildLevel } from '@monopoly/shared';

interface BuildingProps {
  level: BuildLevel;
  position: [number, number, number];
  color?: string;
  mortgaged?: boolean;
  tileIndex?: number;
}

const WALL = '#fffaf0';
const TRIM = '#2b1d10';
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

// Level 0: owned land gets a little flag in the owner's color.
const Flag: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <Box args={[0.03, 0.5, 0.03]} position={[0, 0.25, 0]} color={TRIM} />
    <Box args={[0.26, 0.16, 0.02]} position={[0.14, 0.4, 0]} color={color} />
    <Box args={[0.16, 0.04, 0.16]} position={[0, 0.02, 0]} color={TRIM} />
  </group>
);

// Real building models: KayKit City Builder Bits by Kay Lousberg (CC0),
// public/models/kaykit. Each level picks from a few models, varied per tile.
const MODELS: Record<1 | 2 | 3 | 4, string[]> = {
  1: ['A', 'B'],
  2: ['C', 'D'],
  3: ['E', 'F', 'G'],
  4: ['H']
};
const modelUrl = (id: string) => `/models/kaykit/building_${id}_withoutBase.gltf`;
Object.values(MODELS)
  .flat()
  .forEach((id) => useGLTF.preload(modelUrl(id)));

const FOOT_W = 1.38; // widest a building may be on a tile

const KayBuilding: React.FC<{ id: string; color: string; landmark?: boolean }> = ({ id, color, landmark }) => {
  const gltf = useGLTF(modelUrl(id));
  const { model, scale, size } = useMemo(() => {
    const model = gltf.scene.clone(true);
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = FOOT_W / Math.max(size.x, 0.01);
    model.position.set(-(box.min.x + size.x / 2), -box.min.y, -(box.min.z + size.z / 2));
    return { model, scale, size: size.multiplyScalar(scale) };
  }, [gltf]);

  return (
    <group>
      {/* owner-color lot the building stands on */}
      <Box args={[size.x + 0.1, 0.05, size.z + 0.1]} position={[0, 0.025, 0]} color={TRIM} />
      <Box args={[size.x + 0.02, 0.05, size.z + 0.02]} position={[0, 0.045, 0]} color={color} />
      <group position={[0, 0.07, 0]} scale={scale}>
        <primitive object={model} />
      </group>
      {/* rooftop flag in the owner's color */}
      <group position={[size.x / 2 - 0.16, size.y + 0.07, -size.z / 2 + 0.16]} scale={0.8}>
        <Flag color={color} />
      </group>
      {landmark && <Crown y={size.y + 0.07} color={color} />}
    </group>
  );
};

// Landmark crown: gold dome + spire + a spinning gold ring on top of the tower.
const Crown: React.FC<{ y: number; color: string }> = ({ y, color }) => {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.8;
  });
  return (
    <group position={[-0.25, y, 0]}>
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.24, 0.27, 0.16, 20]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.24, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} emissive="#ffb300" emissiveIntensity={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.54, 0]}>
        <coneGeometry args={[0.05, 0.36, 10]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh ref={ring} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.02, 8, 40]} />
        <meshStandardMaterial color={GOLD} emissive="#ffd54a" emissiveIntensity={0.9} metalness={0.5} />
      </mesh>
    </group>
  );
};

// Pops the building in with a little spring whenever the level changes.
export const BuildingMesh: React.FC<BuildingProps> = ({ level, position, color = '#94a3b8', mortgaged, tileIndex = 0 }) => {
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

  const options = level > 0 ? MODELS[level as 1 | 2 | 3 | 4] : [];
  const body =
    level === 0 ? (
      <Flag color={color} />
    ) : (
      <Suspense fallback={<Flag color={color} />}>
        <KayBuilding id={options[tileIndex % options.length]} color={color} landmark={level === 4} />
      </Suspense>
    );

  return (
    <group ref={group} position={position}>
      {body}
      {mortgaged && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 0.6]} />
          <meshBasicMaterial color="#2b1d10" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
};
