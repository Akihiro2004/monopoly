import React, { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { PerspectiveCamera as PerspectiveCameraImpl, Vector3 } from 'three';
import { useGameStore } from '../store/gameStore.js';
import { useIsMobile, useMediaQuery } from '../hooks/useIsMobile.js';
import { Board3D } from './Board3D.js';
import { Tokens3D } from './Tokens3D.js';
import { Dice3D } from './Dice3D.js';
import { Environment } from './Environment.js';
import { GoBurst } from './GoBurst.js';

const FOV = 45;

type Insets = { top: number; bottom: number; left: number; right: number };

type ControlsLike = { target: Vector3; maxDistance: number; update: () => void };
const BOARD_HALF = 11.6; // half the board incl. frame, plus a hair of margin

// Frames the whole board inside the part of the canvas not covered by HUD
// chrome (`insets`, CSS px). The render is shifted with a view offset so the
// board centers in that free band, then the camera distance is found by
// projecting the board corners (binary search) so it fits edge to edge with
// perspective taken into account. Portrait screens get a steeper, top-down
// view. Re-frames only when the rounded fit changes, so the player's own
// orbiting survives small resizes.
const CORNERS = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.Vector3(sx * BOARD_HALF, 0.3, sz * BOARD_HALF)));

function fitCamera(w: number, h: number, ins: Insets, elevation: number) {
  const pad = Math.max(0, ins.bottom - ins.top);
  const padX = ins.right - ins.left;
  const fullW = w + Math.abs(padX);
  const fullH = h + pad;
  const offX = padX > 0 ? padX : 0;
  const cam = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 500);
  cam.setViewOffset(fullW, fullH, offX, pad, w, h);
  const margin = 12;
  const band = { l: ins.left + margin, r: w - ins.right - margin, t: ins.top + margin, b: h - ins.bottom - margin };
  const v = new THREE.Vector3();

  const measure = (d: number, tz: number) => {
    cam.position.set(0, d * Math.sin(elevation), tz + d * Math.cos(elevation));
    cam.lookAt(0, 0.4, tz);
    cam.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of CORNERS) {
      v.copy(c).project(cam);
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    return { minX, maxX, minY, maxY };
  };

  let tz = 0;
  let dist = 30;
  for (let pass = 0; pass < 3; pass++) {
    let lo = 8;
    let hi = 160;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const m = measure(mid, tz);
      const fits = m.minX >= band.l && m.maxX <= band.r && m.minY >= band.t && m.maxY <= band.b;
      if (fits) hi = mid;
      else lo = mid;
    }
    dist = hi;
    // Centre vertically: move the look-at target along z by the pixel error.
    const m = measure(dist, tz);
    const err = (m.minY + m.maxY) / 2 - (band.t + band.b) / 2;
    const unitsPerPx = (2 * BOARD_HALF) / Math.max(1, m.maxY - m.minY);
    tz += err * unitsPerPx * 0.9;
  }
  return { dist, tz, fullW, fullH, offX, pad };
}

const CameraRig: React.FC<Insets> = (ins) => {
  const camera = useThree((s) => s.camera) as PerspectiveCameraImpl;
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const { width: w, height: h } = useThree((s) => s.size);

  const bandW = Math.max(160, w - ins.left - ins.right);
  const bandH = Math.max(120, h - ins.top - ins.bottom);
  const aspect = Math.min(bandW / bandH, 1.4);
  const t = Math.min(1, Math.max(0, (aspect - 0.6) / 0.8));
  const elevDeg = Math.round(72 - t * 30);

  // Rounded so tiny resizes (mobile URL bar) don't re-frame the camera.
  const key = [Math.round(w / 40), Math.round(h / 40), ins.top, ins.bottom, ins.left, ins.right, elevDeg].join(':');
  const fit = useMemo(
    () => fitCamera(w, h, ins, (elevDeg * Math.PI) / 180),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  useEffect(() => {
    const el = (elevDeg * Math.PI) / 180;
    camera.position.set(0, fit.dist * Math.sin(el), fit.tz + fit.dist * Math.cos(el));
    if (controls) {
      controls.maxDistance = Math.max(40, fit.dist * 1.4);
      controls.target.set(0, 0.4, fit.tz);
      controls.update();
    } else {
      camera.lookAt(0, 0.4, fit.tz);
    }
  }, [fit, elevDeg, camera, controls]);

  useEffect(() => {
    if (fit.pad > 0 || fit.offX > 0 || fit.fullW !== w) camera.setViewOffset(fit.fullW, fit.fullH, fit.offX, fit.pad, w, h);
    else camera.clearViewOffset();
    return () => camera.clearViewOffset();
  }, [camera, w, h, fit]);

  return null;
};

export const MonopolyScene: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const isMobile = useIsMobile();
  const panelCollapsed = useGameStore((s) => s.panelCollapsed);
  const wideDesktop = useMediaQuery('(min-width: 1281px)');
  // HUD chrome floating over the canvas, in CSS px. Desktop: player cards on
  // the left, the collapsible panel on the right, turn banner + roll button.
  // Mobile: status bar on top, action + tab bar at the bottom.
  // Symmetric left/right so the board (and the ROLL button under it) sit on
  // the screen's center line.
  const side = isMobile ? 0 : Math.max(260, panelCollapsed ? 96 : (wideDesktop ? 390 : 340) + 30);
  const insets: Insets = isMobile
    ? { top: 110, bottom: 150, left: 0, right: 0 }
    : { top: 80, bottom: 150, left: side, right: side };

  return (
    <div className="canvas-container">
      <Canvas shadows dpr={isMobile ? [1, 2] : [1, 1.75]}>
        <Suspense fallback={null}>
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
          <CameraRig {...insets} />

          {/* Sunny daylight: sky/grass bounce light + one warm sun */}
          <hemisphereLight args={['#dff3ff', '#7cbf52', 1.1]} />
          <ambientLight intensity={0.25} />
          <directionalLight
            position={[16, 28, 12]}
            intensity={2.2}
            color="#fff1d6"
            castShadow
            shadow-mapSize-width={isMobile ? 1024 : 2048}
            shadow-mapSize-height={isMobile ? 1024 : 2048}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
            shadow-camera-near={1}
            shadow-camera-far={70}
            shadow-camera-left={-16}
            shadow-camera-right={16}
            shadow-camera-top={16}
            shadow-camera-bottom={-16}
          />

          <Environment />

          {/* Monopoly Board Mesh with procedural tiles */}
          <Board3D />

          {/* Players 3D Tokens */}
          {gameState && (
            <Tokens3D
              players={gameState.players}
              currentPlayerIndex={gameState.currentPlayerIndex}
            />
          )}

          <GoBurst />

          {/* Animated Dice in center of board */}
          <Dice3D />
        </Suspense>
      </Canvas>
    </div>
  );
};
