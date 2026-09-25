import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useGameStore } from '../store/gameStore.js';
import { createDiceFaceTexture, ROTATION_FOR_TOP_FACE } from './diceTextures.js';

interface DieProps {
  position: [number, number, number];
  targetValue: number;
  rollTrigger: number;
}

const SingleDie: React.FC<DieProps> = ({ position, targetValue, rollTrigger }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const animTime = useRef(0);
  const isRolling = useRef(false);

  // Pre-generate materials for all 6 faces: [+X=3, -X=4, +Y=1, -Y=6, +Z=5, -Z=2]
  const materials = useMemo(() => {
    const faceNumbers = [3, 4, 1, 6, 5, 2];
    return faceNumbers.map((num) => {
      const tex = createDiceFaceTexture(num);
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.25,
        metalness: 0.05,
      });
    });
  }, []);

  useEffect(() => {
    if (rollTrigger > 0) {
      isRolling.current = true;
      animTime.current = 0;
    }
  }, [rollTrigger]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (isRolling.current) {
      animTime.current += delta;
      const duration = 0.9;

      if (animTime.current < duration) {
        // Tumble and spin mid-air
        meshRef.current.rotation.x += delta * 18;
        meshRef.current.rotation.y += delta * 14;
        meshRef.current.rotation.z += delta * 16;
        meshRef.current.position.y = 0.74 + Math.sin((animTime.current / duration) * Math.PI) * 1.5;
      } else {
        // Finished rolling: land with the correct pips face on top!
        isRolling.current = false;
        meshRef.current.position.y = 0.74;
        const targetRot = ROTATION_FOR_TOP_FACE[targetValue] || [0, 0, 0];
        meshRef.current.rotation.set(targetRot[0], targetRot[1], targetRot[2]);
      }
    } else {
      meshRef.current.position.y = 0.74;
      const targetRot = ROTATION_FOR_TOP_FACE[targetValue] || [0, 0, 0];
      meshRef.current.rotation.set(targetRot[0], targetRot[1], targetRot[2]);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} material={materials} castShadow receiveShadow>
        <boxGeometry args={[1.0, 1.0, 1.0]} />
      </mesh>
    </group>
  );
};

export const Dice3D: React.FC = () => {
  const diceRoll = useGameStore((s) => s.diceRoll);
  const gameState = useGameStore((s) => s.gameState);
  const [rollCount, setRollCount] = useState(0);

  useEffect(() => {
    if (diceRoll) {
      setRollCount((c) => c + 1);
    }
  }, [diceRoll]);

  const d1 = diceRoll?.d1 ?? gameState?.dice?.[0] ?? 1;
  const d2 = diceRoll?.d2 ?? gameState?.dice?.[1] ?? 1;
  const total = d1 + d2;
  const isDoubles = d1 === d2;

  return (
    // Placed on the open cream area in front of the diagonal logo banner
    <group position={[0, 0, 4.9]}>
      <SingleDie
        position={[-1.1, 0, 0]}
        targetValue={d1}
        rollTrigger={rollCount}
      />
      <SingleDie
        position={[1.1, 0, 0]}
        targetValue={d2}
        rollTrigger={rollCount}
      />

      {/* Roll result label */}
      <Text
        position={[0, 0.26, 1.7]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.55}
        color="#b45309"
        anchorX="center"
        anchorY="middle"
      >
        {isDoubles && rollCount > 0 ? `${d1} + ${d2} = ${total} (DOUBLES!)` : `${d1} + ${d2} = ${total}`}
      </Text>
    </group>
  );
};

