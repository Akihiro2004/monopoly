import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Sunny little town around the board, built from Kenney's CC0 "City Builder"
// kit (public/models/city, see LICENSE there). Every model is drawn as one
// InstancedMesh so the whole diorama costs ~15 draw calls.

const MODELS = [
  'building-small-a',
  'building-small-b',
  'building-small-c',
  'building-small-d',
  'building-garage',
  'grass',
  'grass-trees',
  'grass-trees-tall',
  'pavement',
  'pavement-fountain',
  'road-straight',
  'road-straight-lightposts',
  'road-corner'
] as const;
type ModelName = (typeof MODELS)[number];

const url = (m: ModelName) => `/models/city/${m}.glb`;
MODELS.forEach((m) => useGLTF.preload(url(m)));

const CELL = 3.2; // world units per kit tile
const GROUND_Y = -1.3;
const ROAD_RING = 5; // ring index (in cells) of the road around the plaza

interface Placement {
  model: ModelName;
  x: number;
  z: number;
  rot: number;
}

// Deterministic pseudo-random so every player sees the same town.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function layout(OUTER_RING: number): Placement[] {
  const rand = rng(20260925);
  const out: Placement[] = [];
  for (let i = -OUTER_RING; i <= OUTER_RING; i++) {
    for (let j = -OUTER_RING; j <= OUTER_RING; j++) {
      const ring = Math.max(Math.abs(i), Math.abs(j));
      const x = i * CELL;
      const z = j * CELL;
      if (ring < ROAD_RING) {
        out.push({ model: 'pavement', x, z, rot: 0 });
        continue;
      }
      if (ring === ROAD_RING) {
        const corner = Math.abs(i) === ROAD_RING && Math.abs(j) === ROAD_RING;
        if (corner) {
          // Rotate the corner piece so it joins the two straight sides.
          const rot = i > 0 && j > 0 ? 0 : i < 0 && j > 0 ? -Math.PI / 2 : i < 0 && j < 0 ? Math.PI : Math.PI / 2;
          out.push({ model: 'road-corner', x, z, rot });
        } else {
          const alongX = Math.abs(j) === ROAD_RING; // top/bottom sides run along x
          const lamp = (i + j) % 2 === 0;
          out.push({
            model: lamp ? 'road-straight-lightposts' : 'road-straight',
            x,
            z,
            rot: (alongX ? Math.PI / 2 : 0) + (j < 0 || i < 0 ? Math.PI : 0)
          });
        }
        continue;
      }
      // City blocks: denser buildings near the road, parks further out.
      const r = rand();
      const facing = Math.abs(i) >= Math.abs(j) ? (i > 0 ? -Math.PI / 2 : Math.PI / 2) : j > 0 ? Math.PI : 0;
      let model: ModelName;
      if (ring === ROAD_RING + 1) {
        model =
          r < 0.18 ? 'building-small-a' : r < 0.36 ? 'building-small-b' : r < 0.52 ? 'building-small-c' : r < 0.66 ? 'building-small-d' : r < 0.74 ? 'building-garage' : r < 0.8 ? 'pavement-fountain' : 'grass-trees';
      } else if (ring <= ROAD_RING + 2) {
        model = r < 0.35 ? 'grass-trees-tall' : r < 0.6 ? 'grass-trees' : r < 0.75 ? 'building-small-c' : r < 0.85 ? 'building-small-b' : 'grass';
      } else {
        model = r < 0.45 ? 'grass-trees-tall' : r < 0.75 ? 'grass-trees' : 'grass';
      }
      out.push({ model, x, z, rot: facing });
    }
  }
  return out;
}

const Instances: React.FC<{ model: ModelName; items: Placement[] }> = ({ model, items }) => {
  const gltf = useGLTF(url(model));
  const ref = useRef<THREE.InstancedMesh>(null);

  const { geometry, material, scale, lift } = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    gltf.scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
    });
    const m = mesh as unknown as THREE.Mesh;
    const geometry = m.geometry.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
    return { geometry, material: m.material as THREE.Material, scale: CELL / width, lift: -box.min.y };
  }, [gltf]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    items.forEach((p, i) => {
      dummy.position.set(p.x, GROUND_Y + lift * scale, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items, scale, lift]);

  return <instancedMesh ref={ref} args={[geometry, material, items.length]} frustumCulled={false} />;
};

const Town: React.FC<{ rings: number }> = ({ rings }) => {
  const groups = useMemo(() => {
    const map = new Map<ModelName, Placement[]>();
    for (const p of layout(rings)) {
      if (!map.has(p.model)) map.set(p.model, []);
      map.get(p.model)!.push(p);
    }
    return [...map.entries()];
  }, [rings]);
  return (
    <group>
      {groups.map(([model, items]) => (
        <Instances key={`${model}:${items.length}`} model={model} items={items} />
      ))}
    </group>
  );
};

// Puffy low-poly clouds drifting around the scene: every puff is one
// instance of a single mesh (1 draw call for the whole sky).
const Clouds: React.FC = () => {
  const ref = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const puffs = useMemo(() => {
    const rand = rng(77);
    const out: { p: THREE.Vector3; r: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
      const d = 48 + rand() * 30;
      const base = new THREE.Vector3(Math.cos(a) * d, 20 + rand() * 12, Math.sin(a) * d);
      const n = 4 + Math.floor(rand() * 3);
      for (let j = 0; j < n; j++) {
        out.push({
          p: base.clone().add(new THREE.Vector3((rand() - 0.5) * 9, rand() * 2, (rand() - 0.5) * 4)),
          r: 2.2 + rand() * 2.2
        });
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    puffs.forEach((pf, i) => {
      dummy.position.copy(pf.p);
      dummy.scale.setScalar(pf.r);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [puffs]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += Math.min(dt, 0.1) * 0.006;
  });

  return (
    <group ref={ref}>
      <instancedMesh ref={mesh} args={[undefined, undefined, puffs.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading emissive="#ffffff" emissiveIntensity={0.25} />
      </instancedMesh>
    </group>
  );
};

function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#3fa7ea');
  g.addColorStop(0.55, '#8fd3fb');
  g.addColorStop(1, '#d9f1ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const Environment: React.FC<{ rings: number; clouds: boolean }> = ({ rings, clouds }) => {
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const bg = skyTexture();
    scene.background = bg;
    scene.fog = new THREE.Fog('#cdeeff', 70, 150);
    return () => {
      scene.background = null;
      scene.fog = null;
      bg.dispose();
    };
  }, [scene]);

  return (
    <group>
      {/* Endless grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.02, 0]} receiveShadow>
        <circleGeometry args={[220, 48]} />
        <meshStandardMaterial color="#86cf5f" roughness={1} />
      </mesh>

      {/* Plaza plinth the board sits on */}
      <mesh position={[0, (GROUND_Y - 0.3) / 2 - 0.02, 0]} receiveShadow castShadow>
        <boxGeometry args={[24.2, GROUND_Y * -1 - 0.3 + 0.04, 24.2]} />
        <meshStandardMaterial color="#d9a441" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.33, 0]} receiveShadow>
        <boxGeometry args={[23.6, 0.08, 23.6]} />
        <meshStandardMaterial color="#f7ecd2" roughness={0.85} />
      </mesh>

      <React.Suspense fallback={null}>
        <Town rings={rings} />
      </React.Suspense>
      {clouds && <Clouds />}
    </group>
  );
};
