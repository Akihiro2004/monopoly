import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildLevel } from '@monopoly/shared';

interface BuildingProps {
  level: BuildLevel;
  position: [number, number, number];
  color?: string;
  // Color-group (country) color for the plinth.
  base?: string;
  mortgaged?: boolean;
  tileIndex?: number;
}

const WALL = '#fffaf0';
const TRIM = '#2b1d10';
const GOLD = '#ffc629';

const Box: React.FC<{ args: [number, number, number]; position: [number, number, number]; color: string; metal?: number; emissive?: string }> = ({
  args,
  position,
  color,
  metal = 0,
  emissive
}) => (
  <mesh castShadow receiveShadow position={position}>
    <boxGeometry args={args} />
    <meshStandardMaterial color={color} roughness={0.55} metalness={metal} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.35 : 0} />
  </mesh>
);

// Level 0: owned land gets a little flag in the owner's color.
const Flag: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <Box args={[0.03, 0.5, 0.03]} position={[0, 0.25, 0]} color={TRIM} />
    <Box args={[0.26, 0.16, 0.02]} position={[0.14, 0.4, 0]} color={color} />
    <Box args={[0.16, 0.04, 0.16]} position={[0, 0.02, 0]} color={TRIM} />
  </group>
);

// Level 1: a small Monopoly-style house with a gable roof (built in code).
const roofGeometry = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.21, 0);
  shape.lineTo(0.21, 0);
  shape.lineTo(0, 0.2);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.44, bevelEnabled: false });
  g.translate(0, 0, -0.22);
  g.rotateY(Math.PI / 2);
  return g;
})();

const House: React.FC<{ color: string; base: string }> = ({ color, base }) => (
  <group>
    <Plinth w={0.5} d={0.44} base={base} level={1} />
    <group position={[0, PLINTH_H, 0]}>
      <Box args={[0.38, 0.24, 0.32]} position={[0, 0.12, 0]} color="#fff4dd" />
      <mesh castShadow receiveShadow geometry={roofGeometry} position={[0, 0.24, 0]}>
        <meshStandardMaterial color="#d9483b" roughness={0.6} />
      </mesh>
      {/* chimney, door, windows (front = +z, the tile's outer side) */}
      <Box args={[0.06, 0.14, 0.06]} position={[0.1, 0.36, -0.06]} color="#8a4b2a" />
      <Box args={[0.08, 0.13, 0.02]} position={[0, 0.065, 0.165]} color="#8a4b2a" />
      <Box args={[0.07, 0.06, 0.02]} position={[-0.12, 0.14, 0.165]} color="#9dd8f5" />
      <Box args={[0.07, 0.06, 0.02]} position={[0.12, 0.14, 0.165]} color="#9dd8f5" />
    </group>
    <group position={[0.21, PLINTH_H, 0.17]} scale={0.55}>
      <Flag color={color} />
    </group>
  </group>
);

// Every level picks one of several models (varied per tile, stable for
// everyone), all CC0:
//   1 House     Kenney City Kit (Suburban)       public/models/suburban
//   2 Building  Kenney City Kit (Commercial) +   public/models/commercial
//   3 Hotel     KayKit City Builder Bits         public/models/kaykit
//   4 Landmark  skyscrapers + the gold crown
// Each model is scaled into its level's height band and footprint, and the
// bands don't overlap, so the level always reads at a glance whatever the
// model: low houses < 3-floor blocks < wide hotels < tall towers.
type Lv = 1 | 2 | 3 | 4;

interface LevelSpec {
  // Max footprint (tile width x band depth) and height.
  fit: [number, number];
  height: number;
}

const SPEC: Record<Lv, LevelSpec> = {
  1: { fit: [0.42, 0.38], height: 0.32 },
  2: { fit: [0.6, 0.52], height: 0.6 },
  3: { fit: [0.94, 0.6], height: 0.9 },
  4: { fit: [0.96, 0.6], height: 1.5 }
};

const suburban = (id: string) => `/models/suburban/building-type-${id}.glb`;
const commercial = (id: string) => `/models/commercial/building-${id}.glb`;
const kaykit = (id: string) => `/models/kaykit/building_${id}_withoutBase.gltf`;

const MODELS: Record<Lv, string[]> = {
  1: ['a', 'c', 'e', 'g', 'i', 'k', 'r', 's', 't', 'u'].map(suburban),
  2: [...['a', 'b', 'd', 'h'].map(commercial), ...['A', 'B', 'C', 'D'].map(kaykit)],
  3: [...['f', 'g', 'i', 'j', 'l', 'n'].map(commercial), ...['E', 'F', 'G'].map(kaykit)],
  4: ['skyscraper-a', 'skyscraper-b', 'skyscraper-c', 'skyscraper-d', 'skyscraper-e', 'm'].map(commercial)
};

/** The model a tile shows at a level: neighbours differ, every client agrees. */
export function modelFor(level: Lv, tileIndex: number): string {
  const list = MODELS[level];
  return list[((tileIndex + 1) * 37 + level * 11) % list.length];
}

// Fetch the models in the background once the board is up, so building
// something later pops in at once (houses and buildings first).
let preloaded = false;
function preloadModels(): void {
  if (preloaded) return;
  preloaded = true;
  const queue = ([1, 2, 3, 4] as Lv[]).flatMap((lv) => MODELS[lv]);
  const idle = (fn: () => void) =>
    'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200);
  const next = () => {
    const url = queue.shift();
    if (!url) return;
    useGLTF.preload(url);
    idle(next);
  };
  idle(next);
}

const PLINTH_H = 0.07;

// Plinth in the country (color group) color, with a dark rim. `level`
// adds one gold stud per level along the front edge, readable from above.
const Plinth: React.FC<{ w: number; d: number; base: string; level?: number }> = ({ w, d, base, level = 0 }) => (
  <group>
    <Box args={[w + 0.06, 0.04, d + 0.06]} position={[0, 0.02, 0]} color={TRIM} />
    <Box args={[w, 0.05, d]} position={[0, 0.045, 0]} color={base} />
    {Array.from({ length: level }, (_, i) => (
      <Box
        key={i}
        args={[0.05, 0.03, 0.05]}
        position={[(i - (level - 1) / 2) * 0.08, 0.08, d / 2 + 0.005]}
        color={GOLD}
        metal={0.5}
        emissive="#ffb300"
      />
    ))}
  </group>
);

// Height of the model's real roof at (x, z) (model space): a ray cast down
// onto the meshes, so rooftop props sit on the roof instead of floating at
// the bounding-box top.
const ray = new THREE.Raycaster();
function roofAt(model: THREE.Object3D, x: number, z: number, fallback: number): number {
  ray.set(new THREE.Vector3(x, fallback + 10, z), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObject(model, true)[0];
  return hit ? hit.point.y : fallback;
}

const ModelBuilding: React.FC<{ url: string; level: Lv; color: string; base: string }> = ({ url, level, color, base }) => {
  const gltf = useGLTF(url);
  const { model, scale, size, flag, crown } = useMemo(() => {
    const model = gltf.scene.clone(true);
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const { fit, height } = SPEC[level];
    const scale = Math.min(
      fit[0] / Math.max(size.x, 0.01),
      fit[1] / Math.max(size.z, 0.01),
      height / Math.max(size.y, 0.01)
    );
    model.position.set(-(box.min.x + size.x / 2), -box.min.y, -(box.min.z + size.z / 2));
    model.updateMatrixWorld(true);
    const scaled = size.clone().multiplyScalar(scale);
    // Flag near the back-right roof corner; crown centred on the roof.
    const fx = scaled.x / 2 - Math.min(0.1, scaled.x * 0.25);
    const fz = -scaled.z / 2 + Math.min(0.1, scaled.z * 0.25);
    const cx = level === 4 && scaled.x < 0.5 ? 0 : -scaled.x * 0.2;
    const flag = new THREE.Vector3(fx, roofAt(model, fx / scale, fz / scale, size.y) * scale + PLINTH_H, fz);
    const crown = new THREE.Vector3(cx, roofAt(model, cx / scale, 0, size.y) * scale + PLINTH_H, 0);
    return { model, scale, size: scaled, flag, crown };
  }, [gltf, level]);

  return (
    <group>
      <Plinth w={Math.max(size.x + 0.06, 0.34)} d={size.z + 0.06} base={base} level={level} />
      <group position={[0, PLINTH_H, 0]} scale={scale}>
        <primitive object={model} />
      </group>
      {/* rooftop flag in the owner's color, standing on the roof */}
      <group position={flag.toArray()} scale={level === 1 ? 0.5 : 0.6}>
        <Flag color={color} />
      </group>
      {level === 4 && <Crown position={crown.toArray()} color={color} small={size.x < 0.5} />}
    </group>
  );
};

// Shown for a moment while a model downloads: a plain block of the level's
// height, so even the placeholder reads as the right level.
const Placeholder: React.FC<{ level: Lv; base: string }> = ({ level, base }) => {
  const { fit, height } = SPEC[level];
  const w = Math.min(fit[0], 0.5);
  const d = Math.min(fit[1], 0.42);
  return (
    <group>
      <Plinth w={w + 0.06} d={d + 0.06} base={base} level={level} />
      <Box args={[w, height, d]} position={[0, PLINTH_H + height / 2, 0]} color={WALL} />
    </group>
  );
};

// Landmark crown: gold dome + spire + a spinning gold ring on top of the tower.
const Crown: React.FC<{ position: [number, number, number]; color: string; small?: boolean }> = ({ position, color, small }) => {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += Math.min(dt, 0.1) * 0.8;
  });
  return (
    <group position={position} scale={small ? 0.5 : 0.7}>
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.24, 0.27, 0.16, 20]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.24, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} emissive="#ffb300" emissiveIntensity={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.54, 0]}>
        <coneGeometry args={[0.05, 0.36, 10]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh ref={ring} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.02, 8, 40]} />
        <meshStandardMaterial color={GOLD} emissive="#ffd54a" emissiveIntensity={0.9} metalness={0.5} />
      </mesh>
    </group>
  );
};

// Pops the building in with a little spring whenever the level changes.
export const BuildingMesh: React.FC<BuildingProps> = ({ level, position, color = '#94a3b8', base = '#cfe3c6', mortgaged, tileIndex = 0 }) => {
  const group = useRef<THREE.Group>(null);
  const t = useRef(1);

  useEffect(() => {
    t.current = 0;
  }, [level]);

  useFrame((_, dt) => {
    if (!group.current || t.current >= 1) return;
    t.current = Math.min(1, t.current + Math.min(dt, 0.05) * 2.2);
    const x = t.current;
    const s = 1 + Math.sin(x * Math.PI * 1.5) * (1 - x) * 0.6;
    group.current.scale.setScalar(Math.max(0.01, x < 0.25 ? x * 4 : s));
  });

  useEffect(preloadModels, []);

  let body: React.ReactNode;
  if (level === 0) {
    // Unbuilt: a small owner flag beside the country flag medallion.
    body = (
      <group position={[0.42, 0, 0]} scale={0.8}>
        <Flag color={color} />
      </group>
    );
  } else {
    const lv = level as Lv;
    body = (
      <Suspense fallback={lv === 1 ? <House color={color} base={base} /> : <Placeholder level={lv} base={base} />}>
        <ModelBuilding url={modelFor(lv, tileIndex)} level={lv} color={color} base={base} />
      </Suspense>
    );
  }

  return (
    <group ref={group} position={position}>
      {body}
      {mortgaged && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 0.6]} />
          <meshBasicMaterial color="#2b1d10" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
};
