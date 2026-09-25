import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useGameStore } from '../store/gameStore.js';
import { Board3D } from './Board3D.js';
import { Tokens3D } from './Tokens3D.js';
import { Dice3D } from './Dice3D.js';

export const MonopolyScene: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);

  return (
    <div className="canvas-container">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 22, 18]} fov={50} />
        <OrbitControls
          maxPolarAngle={Math.PI / 2.1}
          minDistance={10}
          maxDistance={35}
          target={[0, 0, 0]}
        />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[15, 25, 15]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#fffbeb" />

        {/* Monopoly Board Mesh with procedural tiles */}
        <Board3D />

        {/* Players 3D Tokens */}
        {gameState && (
          <Tokens3D
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
          />
        )}

        {/* Animated Dice in center of board */}
        <Dice3D />
      </Canvas>
    </div>
  );
};
