import React from 'react';
import { BuildLevel } from '@monopoly/shared';

interface BuildingProps {
  level: BuildLevel;
  position: [number, number, number];
  color?: string;
}

// Buildings accumulate with each upgrade: lower stages stay visible and the
// new stage is added next to them. Every stage carries the owner's color.
const Cottage: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  roofColor: string;
}> = ({ x = 0, y = 0, scale = 1, roofColor }) => (
  <group position={[x, y, 0]} scale={scale}>
    {/* Walls */}
    <mesh castShadow position={[0, 0.1, 0]}>
      <boxGeometry args={[0.34, 0.2, 0.28]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.35} />
    </mesh>
    {/* Pitched roof in the owner's color */}
    <mesh castShadow position={[0, 0.26, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.25, 0.15, 4]} />
      <meshStandardMaterial color={roofColor} roughness={0.3} metalness={0.2} />
    </mesh>
  </group>
);

const HotelBlock: React.FC<{ x?: number; y?: number; scale?: number; color: string }> = ({
  x = 0,
  y = 0,
  scale = 1,
  color
}) => (
  <group position={[x, y, -0.05]} scale={scale}>
    <mesh castShadow position={[0, 0.3, 0]}>
      <boxGeometry args={[0.42, 0.6, 0.4]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.25} />
    </mesh>
    {/* Roof cap */}
    <mesh castShadow position={[0, 0.63, 0]}>
      <boxGeometry args={[0.48, 0.08, 0.46]} />
      <meshStandardMaterial color="#0f172a" roughness={0.4} />
    </mesh>
  </group>
);

export const BuildingMesh: React.FC<BuildingProps> = ({ level, position, color = '#94a3b8' }) => {
  const [x, y, z] = position;

  // Level 0: Purchased Land Marker (mini cottage with owner's colored roof)
  if (level === 0) {
    return (
      <group position={[x, y + 0.1, z]}>
        <Cottage scale={0.8} roofColor={color} />
      </group>
    );
  }

  // Level 1: House (one cottage)
  if (level === 1) {
    return (
      <group position={[x, y + 0.12, z]}>
        <Cottage roofColor={color} />
      </group>
    );
  }

  // Level 2: Building (two cottages side by side)
  if (level === 2) {
    return (
      <group position={[x, y + 0.12, z]}>
        <Cottage x={-0.3} scale={0.9} roofColor={color} />
        <Cottage x={0.3} scale={0.9} roofColor={color} />
      </group>
    );
  }

  // Level 3: Hotel (keeps the two cottages, adds the hotel block behind)
  if (level === 3) {
    return (
      <group position={[x, y + 0.12, z]}>
        <Cottage x={-0.48} scale={0.72} roofColor={color} />
        <Cottage x={0.48} scale={0.72} roofColor={color} />
        <HotelBlock y={0.02} scale={0.95} color={color} />
      </group>
    );
  }

  // Level 4: LANDMARK (golden glowing tower, cottages stay at its feet)
  if (level === 4) {
    return (
      <group position={[x, y + 0.12, z]}>
        <Cottage x={-0.58} scale={0.62} roofColor={color} />
        <Cottage x={0.58} scale={0.62} roofColor={color} />
        <group position={[0, 0, -0.05]}>
          {/* Base pillar */}
          <mesh castShadow position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.28, 0.42, 1.3, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.15} />
          </mesh>
          {/* Crown spire */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[0.33, 0.55, 8]} />
            <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={0.6} />
          </mesh>
        </group>
      </group>
    );
  }

  return null;
};
