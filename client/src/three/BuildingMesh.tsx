import React from 'react';
import { BuildLevel } from '@monopoly/shared';

interface BuildingProps {
  level: BuildLevel;
  position: [number, number, number];
  color?: string;
}

export const BuildingMesh: React.FC<BuildingProps> = ({ level, position, color = '#10b981' }) => {
  const [x, y, z] = position;

  // Level 0: Purchased Land Marker (mini house with owner's colored roof at tile edge)
  if (level === 0) {
    return (
      <group position={[x, y + 0.1, z]}>
        {/* House body */}
        <mesh castShadow position={[0, 0.08, 0]}>
          <boxGeometry args={[0.3, 0.16, 0.24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Pitched Roof in owner's player color */}
        <mesh castShadow position={[0, 0.22, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.22, 0.14, 4]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
        </mesh>
      </group>
    );
  }

  // Level 1: House (compact green cottage with owner color base)
  if (level === 1) {
    return (
      <group position={[x, y + 0.14, z]}>
        <mesh castShadow position={[0, 0.1, 0]}>
          <boxGeometry args={[0.36, 0.2, 0.3]} />
          <meshStandardMaterial color="#10b981" roughness={0.3} />
        </mesh>
        <mesh castShadow position={[0, 0.26, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.26, 0.16, 4]} />
          <meshStandardMaterial color="#059669" roughness={0.3} />
        </mesh>
      </group>
    );
  }

  // Level 2: Building (medium 2-story building)
  if (level === 2) {
    return (
      <group position={[x, y + 0.5, z]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.6, 0.5]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.2} />
        </mesh>
      </group>
    );
  }

  // Level 3: Hotel (large red skyscraper/hotel)
  if (level === 3) {
    return (
      <group position={[x, y + 0.7, z]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 1.0, 0.6]} />
          <meshStandardMaterial color="#ef4444" roughness={0.2} metalness={0.3} />
        </mesh>
      </group>
    );
  }

  // Level 4: LANDMARK (Golden glowing tower / monument!)
  if (level === 4) {
    return (
      <group position={[x, y + 0.9, z]}>
        {/* Base pillar */}
        <mesh castShadow>
          <cylinderGeometry args={[0.3, 0.45, 1.3, 8]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.15} />
        </mesh>
        {/* Crown spire */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <coneGeometry args={[0.35, 0.6, 8]} />
          <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>
      </group>
    );
  }

  return null;
};
