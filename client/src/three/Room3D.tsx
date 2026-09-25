import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural rich parlor wallpaper texture (warm damask / geometric gold-foil motif)
export function createWallpaperTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep warm lounge base
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
  bgGrad.addColorStop(0, '#2d1810');
  bgGrad.addColorStop(0.5, '#3c2016');
  bgGrad.addColorStop(1, '#25130d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle striped flock texture
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let x = 0; x < 512; x += 16) {
    ctx.fillRect(x, 0, 8, 512);
  }

  // Elegant damask diamond lattice with warm gold accents
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.22)';
  ctx.lineWidth = 1.8;

  const step = 64;
  for (let y = 0; y <= 512; y += step) {
    for (let x = 0; x <= 512; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, y - step / 2);
      ctx.lineTo(x + step / 2, y);
      ctx.lineTo(x, y + step / 2);
      ctx.lineTo(x - step / 2, y);
      ctx.closePath();
      ctx.stroke();

      // Inner ornate fleur motif
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Decorative corner pips
      ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
      ctx.beginPath();
      ctx.arc(x + step / 2, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Procedural rich wainscoting panel texture (dark mahogany panels)
export function createWainscotingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c0e07';
  ctx.fillRect(0, 0, 512, 512);

  // Wood grain streaks
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 512;
    ctx.strokeStyle = `rgba(55, 28, 15, ${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() * 20 - 10), 512);
    ctx.stroke();
  }

  // Panel border moulding
  ctx.strokeStyle = 'rgba(10, 5, 2, 0.7)';
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, 480, 480);

  ctx.strokeStyle = 'rgba(75, 40, 22, 0.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 456, 456);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Procedural parlor rug texture under the board
export function createRugTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep burgundy velvet
  ctx.fillStyle = '#2b0d10';
  ctx.fillRect(0, 0, 512, 512);

  // Gold ornate border
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 472, 472);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 32, 448, 448);

  // Corner ornaments
  ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
  const corners = [
    [50, 50],
    [462, 50],
    [50, 462],
    [462, 462]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Room3D: React.FC = () => {
  const wallpaperTex = useMemo(() => createWallpaperTexture(), []);
  const wainscotTex = useMemo(() => createWainscotingTexture(), []);
  const rugTex = useMemo(() => createRugTexture(), []);

  const wallWidth = 72;
  const wallHeight = 24;
  const wainscotHeight = 6.5;

  return (
    <group>
      {/* Ornate Parlor Rug on the table under the board */}
      <mesh position={[0, -0.32, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial map={rugTex} roughness={0.88} />
      </mesh>

      {/* --- BACK WALL (Z = -28) --- */}
      <group position={[0, 0, -28]}>
        {/* Upper Wallpaper */}
        <mesh position={[0, wallHeight / 2 + wainscotHeight - 0.35, 0]}>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshStandardMaterial map={wallpaperTex} roughness={0.7} />
        </mesh>

        {/* Chair Rail Molding */}
        <mesh position={[0, wainscotHeight - 0.35, 0.15]}>
          <boxGeometry args={[wallWidth, 0.3, 0.3]} />
          <meshStandardMaterial color="#3b1d11" roughness={0.4} />
        </mesh>

        {/* Lower Mahogany Wainscoting */}
        <mesh position={[0, wainscotHeight / 2 - 0.35, 0]}>
          <planeGeometry args={[wallWidth, wainscotHeight]} />
          <meshStandardMaterial map={wainscotTex} roughness={0.5} />
        </mesh>

        {/* Baseboard Molding */}
        <mesh position={[0, -0.2, 0.15]}>
          <boxGeometry args={[wallWidth, 0.4, 0.3]} />
          <meshStandardMaterial color="#221008" roughness={0.5} />
        </mesh>

        {/* Warm Wall Sconces with soft amber lights */}
        {[-16, 0, 16].map((sx, i) => (
          <group key={`sconce-back-${i}`} position={[sx, 10, 0.4]}>
            {/* Sconce fixture */}
            <mesh>
              <cylinderGeometry args={[0.2, 0.3, 0.6, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <sphereGeometry args={[0.22, 12, 12]} />
              <meshStandardMaterial color="#ffedd5" emissive="#f59e0b" emissiveIntensity={0.8} />
            </mesh>
            <pointLight color="#fde047" intensity={0.5} distance={18} decay={2} position={[0, 0.6, 0.8]} />
          </group>
        ))}

        {/* Vintage Framed Art on Back Wall */}
        {[-8, 8].map((fx, i) => (
          <group key={`frame-${i}`} position={[fx, 11, 0.2]}>
            {/* Gold Frame */}
            <mesh>
              <boxGeometry args={[5.5, 4.2, 0.2]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.65} roughness={0.25} />
            </mesh>
            {/* Painting Canvas */}
            <mesh position={[0, 0, 0.12]}>
              <planeGeometry args={[4.8, 3.5]} />
              <meshStandardMaterial color={i === 0 ? '#1e293b' : '#312e81'} roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* --- LEFT WALL (X = -32) --- */}
      <group position={[-32, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Upper Wallpaper */}
        <mesh position={[0, wallHeight / 2 + wainscotHeight - 0.35, 0]}>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshStandardMaterial map={wallpaperTex} roughness={0.7} />
        </mesh>
        {/* Lower Wainscoting */}
        <mesh position={[0, wainscotHeight / 2 - 0.35, 0]}>
          <planeGeometry args={[wallWidth, wainscotHeight]} />
          <meshStandardMaterial map={wainscotTex} roughness={0.5} />
        </mesh>
        {/* Left wall sconces */}
        {[-14, 14].map((sx, i) => (
          <group key={`sconce-left-${i}`} position={[sx, 10, 0.4]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.3, 0.6, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} />
            </mesh>
            <pointLight color="#fde047" intensity={0.4} distance={18} decay={2} position={[0, 0.6, 0.8]} />
          </group>
        ))}
      </group>

      {/* --- RIGHT WALL (X = +32) --- */}
      <group position={[32, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Upper Wallpaper */}
        <mesh position={[0, wallHeight / 2 + wainscotHeight - 0.35, 0]}>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshStandardMaterial map={wallpaperTex} roughness={0.7} />
        </mesh>
        {/* Lower Wainscoting */}
        <mesh position={[0, wainscotHeight / 2 - 0.35, 0]}>
          <planeGeometry args={[wallWidth, wainscotHeight]} />
          <meshStandardMaterial map={wainscotTex} roughness={0.5} />
        </mesh>
        {/* Right wall sconces */}
        {[-14, 14].map((sx, i) => (
          <group key={`sconce-right-${i}`} position={[sx, 10, 0.4]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.3, 0.6, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} />
            </mesh>
            <pointLight color="#fde047" intensity={0.4} distance={18} decay={2} position={[0, 0.6, 0.8]} />
          </group>
        ))}
      </group>
    </group>
  );
};
