import React from 'react';
import { Text } from '@react-three/drei';

// One deck of cards (stack of thin boxes with a labeled top card)
const CardDeck: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  label: string;
  labelColor: string;
}> = ({ position, rotation = [0, 0, 0], color, label, labelColor }) => {
  const cardCount = 8;
  const cardH = 0.045;

  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: cardCount }).map((_, i) => (
        <mesh key={i} castShadow receiveShadow position={[0, i * cardH, 0]}>
          <boxGeometry args={[1.7, cardH, 2.3]} />
          <meshStandardMaterial
            color={i === cardCount - 1 ? color : '#f1f5f9'}
            roughness={0.6}
          />
        </mesh>
      ))}
      {/* Label on top card */}
      <Text
        position={[0, cardCount * cardH + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.55}
        color={labelColor}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      {/* Slight side shadow line to read as a paper stack */}
      <mesh position={[0, (cardCount * cardH) / 2, -1.16]}>
        <boxGeometry args={[1.68, cardCount * cardH, 0.02]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>
    </group>
  );
};

// Center of the board: diagonal red MONOPOLY-style banner + card decks
export const CenterBoard: React.FC = () => {
  return (
    <group>
      {/* Cream playing surface (flush with tile ring) */}
      <mesh receiveShadow position={[0, 0.29, 0]}>
        <boxGeometry args={[14.6, 0.06, 14.6]} />
        <meshStandardMaterial color="#eef2e9" roughness={0.85} />
      </mesh>

      {/* Diagonal red logo banner */}
      <group position={[0, 0.37, 0]} rotation={[0, Math.PI / 5, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[11.5, 0.1, 2.1]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
        <Text
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          MONOPOLY 3D
        </Text>
      </group>

      {/* Chance deck (yellow, upper-left area) */}
      <CardDeck
        position={[-3.6, 0.32, -3.4]}
        rotation={[0, 0.25, 0]}
        color="#facc15"
        label="?"
        labelColor="#1e3a8a"
      />

      {/* Community Chest deck (blue, lower-right area) */}
      <CardDeck
        position={[3.6, 0.32, 3.2]}
        rotation={[0, 0.25, 0]}
        color="#3b82f6"
        label="CHEST"
        labelColor="#ffffff"
      />
    </group>
  );
};
