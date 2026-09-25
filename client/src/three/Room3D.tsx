import React, { useMemo } from 'react';
import * as THREE from 'three';

// Procedural luxury parlor wallpaper: rich emerald green with ornate gold damask & art-deco lattice
export function createWallpaperTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep rich emerald velvet base
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#064e3b');
  bgGrad.addColorStop(0.5, '#047857');
  bgGrad.addColorStop(1, '#022c22');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle vertical silk stripe texture
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let x = 0; x < 512; x += 16) {
    ctx.fillRect(x, 0, 8, 512);
  }

  // Elegant gold damask diamond lattice
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
  ctx.lineWidth = 2.5;

  const step = 64;
  for (let y = 0; y <= 512; y += step) {
    for (let x = 0; x <= 512; x += step) {
      // Outer diamond
      ctx.beginPath();
      ctx.moveTo(x, y - step / 2);
      ctx.lineTo(x + step / 2, y);
      ctx.lineTo(x, y + step / 2);
      ctx.lineTo(x - step / 2, y);
      ctx.closePath();
      ctx.stroke();

      // Inner decorative fleur motif
      ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Golden diamond center core
      ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + 4, y);
      ctx.lineTo(x, y + 4);
      ctx.lineTo(x - 4, y);
      ctx.closePath();
      ctx.fill();

      // Accent pips on corners
      ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.beginPath();
      ctx.arc(x + step / 2, y, 3, 0, Math.PI * 2);
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

// Procedural rich mahogany wainscoting panel texture
export function createWainscotingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#261208';
  ctx.fillRect(0, 0, 512, 512);

  // Wood grain streaks
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512;
    ctx.strokeStyle = `rgba(65, 32, 16, ${0.2 + Math.random() * 0.25})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() * 16 - 8), 512);
    ctx.stroke();
  }

  // Raised panel molding borders
  ctx.strokeStyle = 'rgba(12, 5, 2, 0.85)';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 476, 476);

  ctx.strokeStyle = 'rgba(92, 46, 24, 0.7)';
  ctx.lineWidth = 5;
  ctx.strokeRect(30, 30, 452, 452);

  ctx.strokeStyle = 'rgba(180, 83, 9, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, 436, 436);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Procedural parquet wood flooring texture
export function createParquetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e110a';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 64;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      const isAlt = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
      ctx.fillStyle = isAlt ? '#2d180d' : '#23130a';
      ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Procedural velvet parlor rug texture under the board
export function createRugTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3f0c13';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 14;
  ctx.strokeRect(16, 16, 480, 480);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 452, 452);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, 436, 436);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
  ctx.beginPath();
  ctx.moveTo(256, 100);
  ctx.lineTo(412, 256);
  ctx.lineTo(256, 412);
  ctx.lineTo(100, 256);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
  [
    [54, 54],
    [458, 54],
    [54, 458],
    [458, 458]
  ].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Room3D: React.FC = () => {
  const wallpaperTex = useMemo(() => createWallpaperTexture(), []);
  const wainscotTex = useMemo(() => createWainscotingTexture(), []);
  const parquetTex = useMemo(() => createParquetTexture(), []);
  const rugTex = useMemo(() => createRugTexture(), []);

  const wallWidth = 60;
  const wallHeight = 22;
  const wainscotHeight = 5.2;
  const floorY = -5.0;
  const backWallZ = -15;

  return (
    <group>
      {/* Herringbone Parquet Wood Floor */}
      <mesh position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial map={parquetTex} roughness={0.7} />
      </mesh>

      {/* Ornate Parlor Rug on the floor under the table */}
      <mesh position={[0, floorY + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial map={rugTex} roughness={0.88} />
      </mesh>

      {/* --- BACK WALL (Z = -15) --- */}
      <group position={[0, 0, backWallZ]}>
        {/* Upper Luxury Emerald & Gold Wallpaper */}
        <mesh position={[0, floorY + wainscotHeight + wallHeight / 2, 0]}>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshStandardMaterial map={wallpaperTex} roughness={0.5} />
        </mesh>

        {/* Gilded Chair Rail Molding */}
        <mesh position={[0, floorY + wainscotHeight, 0.15]}>
          <boxGeometry args={[wallWidth, 0.4, 0.3]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Lower Mahogany Wainscoting */}
        <mesh position={[0, floorY + wainscotHeight / 2, 0]}>
          <planeGeometry args={[wallWidth, wainscotHeight]} />
          <meshStandardMaterial map={wainscotTex} roughness={0.45} />
        </mesh>

        {/* Baseboard Molding */}
        <mesh position={[0, floorY + 0.2, 0.15]}>
          <boxGeometry args={[wallWidth, 0.4, 0.3]} />
          <meshStandardMaterial color="#1a0c06" roughness={0.5} />
        </mesh>

        {/* Wall Sconces casting warm golden glow */}
        {[-14, 0, 14].map((sx, i) => (
          <group key={`sconce-back-${i}`} position={[sx, 7.5, 0.4]}>
            <mesh>
              <cylinderGeometry args={[0.22, 0.32, 0.7, 10]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.26, 16, 16]} />
              <meshStandardMaterial
                color="#fffbeb"
                emissive="#f59e0b"
                emissiveIntensity={1.4}
              />
            </mesh>
            <pointLight
              color="#fbbf24"
              intensity={1.1}
              distance={24}
              decay={2}
              position={[0, 0.6, 0.8]}
            />
          </group>
        ))}

        {/* Framed Classical Artwork on Back Wall */}
        {[-7, 7].map((fx, i) => (
          <group key={`frame-${i}`} position={[fx, 8.2, 0.2]}>
            <mesh>
              <boxGeometry args={[5.2, 4.0, 0.22]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, 0.12]}>
              <planeGeometry args={[4.6, 3.4]} />
              <meshStandardMaterial
                color={i === 0 ? '#1e3a5f' : '#2d1b4e'}
                roughness={0.85}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* --- LEFT WALL (X = -20) --- */}
      <group position={[-20, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, floorY + wainscotHeight + wallHeight / 2, 0]}>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshStandardMaterial map={wallpaperTex} roughness={0.5} />
        </mesh>
        <mesh position={[0, floorY + wainscotHeight, 0.15]}>
          <boxGeometry args={[wallWidth, 0.4, 0.3]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, floorY + wainscotHeight / 2, 0]}>
          <planeGeometry args={[wallWidth, wainscotHeight]} />
          <meshStandardMaterial map={wainscotTex} roughness={0.45} />
        </mesh>
        <group position={[0, 7.5, 0.4]}>
          <mesh>
            <cylinderGeometry args={[0.22, 0.32, 0.7, 10]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.26, 16, 16]} />
            <meshStandardMaterial color="#fffbeb" emissive="#f59e0b" emissiveIntensity={1.4} />
          </mesh>
          <pointLight color="#fbbf24" intensity={0.9} distance={22} decay={2} position={[0, 0.6, 0.8]} />
        </group>
      </group>

      {/* --- RIGHT WALL (X = +20) --- */}
      <group position={[20, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, floorY + wainscotHeight + wallHeight / 2, 0]}>
          <planeGeometry args={[wallWidth, wallHeight]} />
          <meshStandardMaterial map={wallpaperTex} roughness={0.5} />
        </mesh>
        <mesh position={[0, floorY + wainscotHeight, 0.15]}>
          <boxGeometry args={[wallWidth, 0.4, 0.3]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, floorY + wainscotHeight / 2, 0]}>
          <planeGeometry args={[wallWidth, wainscotHeight]} />
          <meshStandardMaterial map={wainscotTex} roughness={0.45} />
        </mesh>
        <group position={[0, 7.5, 0.4]}>
          <mesh>
            <cylinderGeometry args={[0.22, 0.32, 0.7, 10]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.26, 16, 16]} />
            <meshStandardMaterial color="#fffbeb" emissive="#f59e0b" emissiveIntensity={1.4} />
          </mesh>
          <pointLight color="#fbbf24" intensity={0.9} distance={22} decay={2} position={[0, 0.6, 0.8]} />
        </group>
      </group>
    </group>
  );
};
