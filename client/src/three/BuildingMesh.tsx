import React from 'react';
import { BuildLevel } from '@monopoly/shared';

interface BuildingProps {
  level: BuildLevel;
  position: [number, number, number];
  color?: string;
}

export const BuildingMesh: React.FC<BuildingProps> = ({ level, position, color = '#10b981' }) => {
  if (level === 0) return null;

  const [x, y, z] = position;

  // Level 1: House (small green pitched roof box)
  if (level === 1) {
    return (
      <group position={[x, y + 0.35, z]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.3, 0.4]} />
          <meshStandardMaterial color="#10b981" roughness={0.3} />
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
