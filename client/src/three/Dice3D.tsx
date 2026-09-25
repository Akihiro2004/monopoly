import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore.js';

export const Dice3D: React.FC = () => {
  const diceRoll = useGameStore((s) => s.diceRoll);
  const mesh1 = useRef<THREE.Mesh>(null);
  const mesh2 = useRef<THREE.Mesh>(null);
  const rollingRef = useRef(false);
  const animTime = useRef(0);

  // Trigger spin animation when a new dice roll comes in
  React.useEffect(() => {
    if (diceRoll) {
      rollingRef.current = true;
      animTime.current = 0;
    }
  }, [diceRoll]);

  useFrame((_, delta) => {
    if (!rollingRef.current) return;
    animTime.current += delta;

    if (animTime.current < 0.8) {
      if (mesh1.current) {
        mesh1.current.rotation.x += delta * 15;
        mesh1.current.rotation.y += delta * 12;
        mesh1.current.position.y = 1.5 + Math.sin(animTime.current * 8) * 0.5;
      }
      if (mesh2.current) {
        mesh2.current.rotation.x -= delta * 14;
        mesh2.current.rotation.z += delta * 16;
        mesh2.current.position.y = 1.5 + Math.sin(animTime.current * 7 + 0.3) * 0.5;
      }
    } else {
      rollingRef.current = false;
      if (mesh1.current) {
        mesh1.current.position.y = 0.5;
        mesh1.current.rotation.set(0, 0, 0);
      }
      if (mesh2.current) {
        mesh2.current.position.y = 0.5;
        mesh2.current.rotation.set(0, 0, 0);
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Die 1 */}
      <mesh ref={mesh1} position={[-1.2, 0.5, 0]} castShadow>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Die 2 */}
      <mesh ref={mesh2} position={[1.2, 0.5, 0]} castShadow>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.2} metalness={0.1} />
      </mesh>
    </group>
  );
};
