import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useGameStore } from '../store/gameStore.js';
import { Board3D } from './Board3D.js';
import { Tokens3D } from './Tokens3D.js';
import { Dice3D } from './Dice3D.js';
import { WoodTable } from './WoodTable.js';
import { Room3D } from './Room3D.js';

export const MonopolyScene: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);

  return (
    <div className="canvas-container">
      <Canvas shadows>
        <Suspense fallback={null}>
          {/* Rich luxury emerald background */}
          <color attach="background" args={['#071912']} />

          {/* Low, tilted front view like a player sitting at the table */}
          <PerspectiveCamera makeDefault position={[0, 15, 19]} fov={45} />
          <OrbitControls
            maxPolarAngle={Math.PI / 2.15}
            minDistance={10}
            maxDistance={38}
            target={[0, 0.4, 0]}
            enableDamping
          />

          {/* Warm room and board lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[12, 20, 14]}
            intensity={1.4}
            color="#fff3e0"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={60}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          <pointLight position={[0, 9, 0]} intensity={0.6} color="#ffe9c4" />
          <pointLight position={[0, 12, -7]} intensity={1.2} color="#fed7aa" distance={30} />

          {/* 3D Warm Cozy Game Lounge Room Enclosure (wallpaper, wainscoting, sconces, rug) */}
          <Room3D />

          {/* Wood table surface */}
          <WoodTable />

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
        </Suspense>
      </Canvas>
    </div>
  );
};
