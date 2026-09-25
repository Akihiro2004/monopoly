import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural wood-grain texture for the table (no external assets)
export function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base wood color
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(0, 0, 512, 512);

  // Long grain streaks
  for (let i = 0; i < 500; i++) {
    const y = Math.random() * 512;
    const shade = Math.random();
    ctx.strokeStyle =
      shade > 0.5
        ? `rgba(90, 55, 30, ${0.15 + Math.random() * 0.25})`
        : `rgba(60, 32, 15, ${0.1 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(128, y + (Math.random() * 12 - 6), 384, y + (Math.random() * 12 - 6), 512, y);
    ctx.stroke();
  }

  // A few darker plank knots
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.strokeStyle = 'rgba(45, 24, 10, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 14 + Math.random() * 18, 5 + Math.random() * 6, Math.random(), 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Large wood table plane under the board
export const WoodTable: React.FC = () => {
  const texture = useMemo(() => createWoodTexture(), []);

  return (
    <mesh receiveShadow position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial map={texture} roughness={0.75} metalness={0.05} />
    </mesh>
  );
};
