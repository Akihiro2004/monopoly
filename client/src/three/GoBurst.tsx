import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore.js';
import { getTileCenter } from './boardCoords.js';

const COINS = 28;
const DURATION = 2.2;

// Gold coins fountain out of the GO tile, plus an expanding gold ring,
// whenever a token passes or lands on GO.
export const GoBurst: React.FC = () => {
  const celebration = useGameStore((s) => s.goCelebration);
  const coins = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const t = useRef(DURATION);
  const center = useMemo(() => new THREE.Vector3(...getTileCenter(0)), []);

  const seeds = useMemo(
    () =>
      Array.from({ length: COINS }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: 1.4 + Math.random() * 2,
        up: 5 + Math.random() * 3,
        spin: 4 + Math.random() * 8,
        delay: Math.random() * 0.25
      })),
    [celebration?.id] // new random fountain each time
  );

  useEffect(() => {
    if (celebration) t.current = 0;
  }, [celebration]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    const mesh = coins.current;
    if (!mesh || !ring.current) return;
    if (t.current >= DURATION) {
      mesh.visible = false;
      ring.current.visible = false;
      return;
    }
    t.current += dt;
    mesh.visible = true;
    ring.current.visible = true;
    seeds.forEach((s, i) => {
      const tt = Math.max(0, t.current - s.delay);
      const y = Math.max(0, s.up * tt - 6 * tt * tt);
      const r = s.speed * tt;
      dummy.position.set(center.x + Math.cos(s.angle) * r, center.y + 0.2 + y, center.z + Math.sin(s.angle) * r);
      dummy.rotation.set(tt * s.spin, tt * s.spin * 0.6, 0);
      const fade = Math.min(1, (DURATION - t.current) * 2.5);
      dummy.scale.setScalar(tt > 0 ? fade : 0.001);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    const k = Math.min(1, t.current / 0.9);
    ring.current.scale.setScalar(0.3 + k * 3);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
  });

  return (
    <group>
      <instancedMesh ref={coins} args={[undefined, undefined, COINS]} castShadow frustumCulled={false} visible={false}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 20]} />
        <meshStandardMaterial color="#ffc629" metalness={0.8} roughness={0.25} emissive="#ffb300" emissiveIntensity={0.35} />
      </instancedMesh>
      <mesh ref={ring} position={[center.x, center.y + 0.12, center.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 1.05, 48]} />
        <meshBasicMaterial color="#ffc629" transparent opacity={0.85} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
