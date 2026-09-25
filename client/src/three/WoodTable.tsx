import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural rich polished mahogany wood texture for the table
export function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep warm mahogany base
  ctx.fillStyle = '#4a2511';
  ctx.fillRect(0, 0, 512, 512);

  // Long fine grain streaks
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * 512;
    const shade = Math.random();
    ctx.strokeStyle =
      shade > 0.5
        ? `rgba(100, 50, 25, ${0.18 + Math.random() * 0.25})`
        : `rgba(45, 20, 10, ${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(128, y + (Math.random() * 10 - 5), 384, y + (Math.random() * 10 - 5), 512, y);
    ctx.stroke();
  }

  // Subtle wood knots
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.strokeStyle = 'rgba(35, 15, 6, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 12 + Math.random() * 14, 4 + Math.random() * 5, Math.random(), 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 3D luxury game table: sized specifically to fit the Monopoly board comfortably
// with exposed rug and room wallpaper around it
export const WoodTable: React.FC = () => {
  const texture = useMemo(() => createWoodTexture(), []);

  return (
    <group position={[0, -0.32, 0]}>
      {/* Tabletop Slab */}
      <mesh receiveShadow castShadow position={[0, 0, 0]}>
        <boxGeometry args={[23.6, 0.3, 23.6]} />
        <meshStandardMaterial map={texture} roughness={0.4} metalness={0.08} />
      </mesh>

      {/* Decorative Beveled Table Edge Moulding */}
      <mesh receiveShadow position={[0, -0.16, 0]}>
        <boxGeometry args={[24.0, 0.12, 24.0]} />
        <meshStandardMaterial color="#2d1408" roughness={0.35} metalness={0.1} />
      </mesh>

      {/* 4 Turned Wooden Table Legs extending down to floor */}
      {[
        [-10.4, -10.4],
        [10.4, -10.4],
        [-10.4, 10.4],
        [10.4, 10.4]
      ].map(([lx, lz], i) => (
        <mesh key={`leg-${i}`} position={[lx, -2.5, lz]} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.4, 4.8, 12]} />
          <meshStandardMaterial map={texture} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};
