import React, { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { PerspectiveCamera as PerspectiveCameraImpl, Vector3 } from 'three';
import { useGameStore } from '../store/gameStore.js';
import { useIsMobile, useMediaQuery } from '../hooks/useIsMobile.js';
import { Board3D } from './Board3D.js';
import { Tokens3D } from './Tokens3D.js';
import { Dice3D } from './Dice3D.js';
import { WoodTable } from './WoodTable.js';
import { Room3D } from './Room3D.js';

const FOV = 45;

type ControlsLike = { target: Vector3; maxDistance: number; update: () => void };
const BOARD_HALF = 12.4; // half the table width plus a small margin

// Frames the whole board inside the part of the canvas not covered by HUD
// chrome (`insets`, in CSS px): a low, seated view on wide screens, a steeper
// top-down view on narrow/portrait screens so the board still fits edge to
// edge. The render is shifted with a view offset so the board centers in the
// unobstructed band. Re-frames only when the rounded fit changes, so the
// player's own orbiting survives small resizes.
const CameraRig: React.FC<{ top: number; bottom: number }> = ({ top, bottom }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCameraImpl;
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const { width: w, height: h } = useThree((s) => s.size);

  const pad = Math.max(0, bottom - top);
  const fullH = h + pad;
  const bandH = Math.max(120, h - top - bottom);
  const tanV = Math.tan(((FOV / 2) * Math.PI) / 180);
  const aspect = Math.min(w / bandH, 1.4);
  const t = Math.min(1, Math.max(0, (aspect - 0.6) / 0.8));
  const elevation = ((72 - t * 34) * Math.PI) / 180;
  const horizFit = BOARD_HALF / (tanV * (w / fullH));
  const vertFit = (BOARD_HALF * (Math.sin(elevation) + 0.1)) / (tanV * (bandH / fullH));
  const dist = Math.round(Math.max(22, horizFit, vertFit));
  const elevDeg = Math.round((elevation * 180) / Math.PI);

  useEffect(() => {
    const el = (elevDeg * Math.PI) / 180;
    camera.position.set(0, dist * Math.sin(el), dist * Math.cos(el));
    if (controls) {
      controls.maxDistance = Math.max(38, dist * 1.3);
      controls.target.set(0, 0.4, 0);
      controls.update();
    } else {
      camera.lookAt(0, 0.4, 0);
    }
  }, [dist, elevDeg, camera, controls]);

  useEffect(() => {
    if (pad > 0) camera.setViewOffset(w, fullH, 0, pad, w, h);
    else camera.clearViewOffset();
    return () => camera.clearViewOffset();
  }, [camera, w, h, fullH, pad]);

  return null;
};

export const MonopolyScene: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const isMobile = useIsMobile();
  const landscapePhone = useMediaQuery('(pointer: coarse) and (max-height: 540px)');
  // HUD chrome over the canvas: desktop has only the floating action dock;
  // mobile has the status bar on top and the action + tab bar at the bottom.
  const insets = !isMobile
    ? { top: 0, bottom: 90 }
    : landscapePhone
      ? { top: 52, bottom: 110 }
      : { top: 104, bottom: 140 };

  return (
    <div className="canvas-container">
      <Canvas shadows dpr={isMobile ? [1, 2] : [1, 1.75]}>
        <Suspense fallback={null}>
          {/* Rich luxury emerald background */}
          <color attach="background" args={['#071912']} />

          <PerspectiveCamera makeDefault position={[0, 15, 19]} fov={FOV} />
          <OrbitControls
            makeDefault
            maxPolarAngle={Math.PI / 2.15}
            minDistance={8}
            maxDistance={38}
            target={[0, 0.4, 0]}
            enablePan={!isMobile}
            enableDamping
            rotateSpeed={isMobile ? 0.6 : 0.8}
          />
          <CameraRig top={insets.top} bottom={insets.bottom} />

          {/* Warm room and board lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[12, 20, 14]}
            intensity={1.4}
            color="#fff3e0"
            castShadow
            shadow-mapSize-width={isMobile ? 1024 : 2048}
            shadow-mapSize-height={isMobile ? 1024 : 2048}
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
