import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor, PerspectiveCamera } from '@react-three/drei';
import type { PerspectiveCamera as PerspectiveCameraImpl, Vector3 } from 'three';
import { useGameStore } from '../store/gameStore.js';
import { TIERS, usePerfStore, useTier } from '../store/perfStore.js';
import { useIsMobile, useMediaQuery } from '../hooks/useIsMobile.js';
import { Board3D } from './Board3D.js';
import { Tokens3D } from './Tokens3D.js';
import { Dice3D } from './Dice3D.js';
import { Environment } from './Environment.js';
import { GoBurst } from './GoBurst.js';
import { DECK_POS, setDeckProjector } from './deckAnchor.js';

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
  const invalidate = useThree((s) => s.invalidate);

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

  // Glide to a new framing (panel opened / closed, planner docked) instead of
  // jumping; the very first framing and window resizes apply instantly.
  type Off = [number, number, number, number];
  const applied = useRef<{ w: number; h: number; off: Off } | null>(null);
  const anim = useRef<{
    start: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    fromOff: Off;
    toOff: Off;
  } | null>(null);

  const setOffset = (off: Off) => {
    if (off[0] !== w || off[1] !== h || off[2] !== 0 || off[3] !== 0) camera.setViewOffset(off[0], off[1], off[2], off[3], w, h);
    else camera.clearViewOffset();
  };

  useEffect(() => {
    const el = (elevDeg * Math.PI) / 180;
    const toPos = new THREE.Vector3(0, fit.dist * Math.sin(el), fit.tz + fit.dist * Math.cos(el));
    const toTarget = new THREE.Vector3(0, 0.4, fit.tz);
    const toOff: Off = [fit.fullW, fit.fullH, fit.offX, fit.pad];
    if (controls) controls.maxDistance = Math.max(40, fit.dist * 1.4);
    const prev = applied.current;
    applied.current = { w, h, off: toOff };

    if (!prev || prev.w !== w || prev.h !== h) {
      anim.current = null;
      camera.position.copy(toPos);
      if (controls) {
        controls.target.copy(toTarget);
        controls.update();
      } else {
        camera.lookAt(toTarget);
      }
      setOffset(toOff);
      invalidate();
      return;
    }
    anim.current = {
      start: performance.now(),
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls ? controls.target.clone() : toTarget.clone(),
      toTarget,
      fromOff: prev.off,
      toOff
    };
    usePerfStore.getState().bump(800);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, elevDeg, camera, controls, invalidate, w, h]);

  useEffect(() => () => camera.clearViewOffset(), [camera]);
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __cam: unknown }).__cam = { camera, controls, fit };
  }, [camera, controls, fit]);

  useFrame(() => {
    const a = anim.current;
    if (!a) return;
    const raw = Math.min(1, (performance.now() - a.start) / 550);
    const k = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2; // ease in-out
    camera.position.lerpVectors(a.fromPos, a.toPos, k);
    if (controls) {
      controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
      controls.update();
    } else {
      camera.lookAt(a.toTarget);
    }
    const off = a.fromOff.map((v, i) => v + (a.toOff[i] - v) * k) as Off;
    setOffset(raw >= 1 ? a.toOff : off);
    // Keep frames coming until the glide lands, however slow the device is.
    if (raw >= 1) anim.current = null;
    else invalidate();
  });

  return null;
};

// Renders on demand: full frame rate while something moves (token walk,
// dice, coins, camera drag, a fresh game update), a gentle idle rate on
// strong devices, and nothing at all on weak ones when the board is still.
const FrameDriver: React.FC<{ idleFps: number }> = ({ idleFps }) => {
  const invalidate = useThree((s) => s.invalidate);
  const bump = usePerfStore((s) => s.bump);

  // Anything that changes the scene wakes the loop up for a moment.
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (
          s.gameState !== prev.gameState ||
          s.diceRoll !== prev.diceRoll ||
          s.goCelebration !== prev.goCelebration ||
          s.cardDraw !== prev.cardDraw ||
          s.focusTile !== prev.focusTile ||
          s.isWalking !== prev.isWalking
        ) {
          bump(s.goCelebration !== prev.goCelebration ? 3000 : 2500);
          invalidate();
        }
      }),
    [bump, invalidate]
  );

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const busy = useGameStore.getState().isWalking || now < usePerfStore.getState().activeUntil;
      if (busy) {
        invalidate();
        last = now;
      } else if (idleFps > 0 && now - last >= 1000 / idleFps) {
        invalidate();
        last = now;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [idleFps, invalidate]);

  return null;
};

// Lets the card animation start from the real on-screen deck position.
const DeckAnchor: React.FC = () => {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const v = new THREE.Vector3();
    setDeckProjector((deck) => {
      v.set(...DECK_POS[deck]).project(camera);
      if (v.z > 1) return null;
      const rect = gl.domElement.getBoundingClientRect();
      return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
    });
    return () => setDeckProjector(null);
  }, [camera, gl]);
  return null;
};

// Keeps the loop awake while the player drags / pinches the camera.
function wakeOnInput(el: HTMLElement) {
  const wake = () => usePerfStore.getState().bump(1500);
  el.addEventListener('pointerdown', wake);
  el.addEventListener('pointermove', (e) => e.buttons && wake());
  el.addEventListener('wheel', wake, { passive: true });
}

export const MonopolyScene: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const isMobile = useIsMobile();
  const panelCollapsed = useGameStore((s) => s.panelCollapsed);
  const wideDesktop = useMediaQuery('(min-width: 1281px)');
  const tier = useTier();
  const q = TIERS[tier];
  const pref = usePerfStore((s) => s.pref);
  const degrade = usePerfStore((s) => s.degrade);
  // Bumped to rebuild the WebGL canvas after the browser drops the context
  // (common on phones when memory runs low or the app is backgrounded).
  const [glKey, setGlKey] = useState(0);
  const [lost, setLost] = useState(false);

  // Symmetric left/right so the board (and the ROLL button under it) sit on
  // the screen's center line.
  const side = isMobile ? 0 : Math.max(260, panelCollapsed ? 96 : (wideDesktop ? 390 : 340) + 30);
  const insets: Insets = isMobile
    ? { top: 110, bottom: 150, left: 0, right: 0 }
    : { top: 80, bottom: 150, left: side, right: side };

  return (
    <div className="canvas-container">
      {lost && <div className="gl-lost">Reloading the board…</div>}
      <Canvas
        key={`${glKey}:${q.antialias}`}
        frameloop="demand"
        shadows={q.shadows}
        dpr={q.dpr}
        gl={{ antialias: q.antialias, powerPreference: tier === 'high' ? 'high-performance' : 'default', stencil: false }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          wakeOnInput(canvas);
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            // The renderer also drops the context on purpose when this canvas
            // is replaced (quality change): only a canvas still on the page
            // that lost its context is a real crash worth rebuilding.
            setTimeout(() => {
              if (!canvas.isConnected) return;
              setLost(true);
              setTimeout(() => {
                setLost(false);
                setGlKey((k) => k + 1);
              }, 1200);
            }, 0);
          });
        }}
      >
        <FrameDriver idleFps={q.idleFps} />
        <DeckAnchor />
        {pref === 'auto' && (
          <PerformanceMonitor flipflops={2} onDecline={() => degrade()} />
        )}
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
          <hemisphereLight args={['#dff3ff', '#7cbf52', q.shadows ? 1.1 : 1.35]} />
          <ambientLight intensity={0.25} />
          <directionalLight
            position={[16, 28, 12]}
            intensity={2.2}
            color="#fff1d6"
            castShadow={q.shadows}
            shadow-mapSize-width={q.shadowMap}
            shadow-mapSize-height={q.shadowMap}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
            shadow-camera-near={1}
            shadow-camera-far={70}
            shadow-camera-left={-16}
            shadow-camera-right={16}
            shadow-camera-top={16}
            shadow-camera-bottom={-16}
          />

          <Environment rings={q.townRings} clouds={q.clouds} />

          <Board3D />

          {gameState && (
            <Tokens3D
              players={gameState.players}
              currentPlayerIndex={gameState.currentPlayerIndex}
            />
          )}

          <GoBurst />

          <Dice3D />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default MonopolyScene;
