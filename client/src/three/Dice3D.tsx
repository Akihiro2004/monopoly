import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore.js';
import { createDiceFaceTexture, createRoundedDieGeometry, ROTATION_FOR_TOP_FACE } from './diceTextures.js';
import { audioManager } from '../sound/audioManager.js';

const tmpEuler = new THREE.Euler();
const tmpYaw = new THREE.Quaternion();

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

  const geometry = useMemo(() => createRoundedDieGeometry(1, 0.14, 6), []);
  useEffect(() => () => {
    geometry.dispose();
    materials.forEach((m) => { m.map?.dispose(); m.dispose(); });
  }, [geometry, materials]);

  // Resting orientation: the rolled value on top, turned by a random yaw so
  // the dice don't land perfectly square every time.
  const yaw = useRef(Math.random() * 0.6 - 0.3);
  const target = useMemo(() => new THREE.Quaternion(), []);
  const from = useMemo(() => new THREE.Quaternion(), []);
  const settling = useRef(false);

  useEffect(() => {
    if (rollTrigger > 0) {
      isRolling.current = true;
      // Wall-clock based so the landing time matches the HUD readout
      // (DICE_ANIM_MS) even when the frame rate is low.
      animTime.current = performance.now();
      yaw.current = Math.random() * 1.2 - 0.6;
    }
  }, [rollTrigger]);

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const delta = Math.min(rawDelta, 0.05);
    const [rx, ry, rz] = ROTATION_FOR_TOP_FACE[targetValue] || [0, 0, 0];
    target.setFromEuler(tmpEuler.set(rx, ry, rz));
    target.premultiply(tmpYaw.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw.current));

    if (!isRolling.current) {
      mesh.position.y = 0.74;
      mesh.quaternion.copy(target);
      return;
    }
    const tumble = 0.75;
    const settle = 0.25;
    const t = (performance.now() - animTime.current) / 1000;
    if (t < tumble) {
      // Tumble and spin mid-air
      mesh.rotation.x += delta * 18;
      mesh.rotation.y += delta * 14;
      mesh.rotation.z += delta * 16;
      mesh.position.y = 0.74 + Math.sin((t / tumble) * Math.PI) * 1.5;
      settling.current = false;
    } else if (t < tumble + settle) {
      // Ease into the final face (no visible snap)
      if (!settling.current) {
        settling.current = true;
        from.copy(mesh.quaternion);
      }
      const k = (t - tumble) / settle;
      const e = 1 - Math.pow(1 - Math.min(k, 1), 3);
      mesh.quaternion.slerpQuaternions(from, target, e);
      mesh.position.y = 0.74 + Math.sin(Math.min(k, 1) * Math.PI) * 0.12;
    } else {
      isRolling.current = false;
      mesh.position.y = 0.74;
      mesh.quaternion.copy(target);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={geometry} material={materials} castShadow receiveShadow />
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
      audioManager.playDiceRoll();
    }
  }, [diceRoll]);

  const d1 = diceRoll?.d1 ?? gameState?.dice?.[0] ?? 1;
  const d2 = diceRoll?.d2 ?? gameState?.dice?.[1] ?? 1;

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

    </group>
  );
};

