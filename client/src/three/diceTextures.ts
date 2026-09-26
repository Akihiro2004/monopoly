import * as THREE from 'three';

// Generate canvas texture for a dice face with dots (pips)
export function createDiceFaceTexture(number: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Face background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  // Border inset
  ctx.strokeStyle = '#efe4cc';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);

  // Pip color (red for 1, dark slate for 2-6)
  ctx.fillStyle = number === 1 ? '#e7352c' : '#2b1d10';

  const drawPip = (x: number, y: number, r = 24) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const center = 128;
  const left = 72;
  const right = 184;
  const top = 72;
  const bottom = 184;

  switch (number) {
    case 1:
      drawPip(center, center, 36);
      break;
    case 2:
      drawPip(left, top);
      drawPip(right, bottom);
      break;
    case 3:
      drawPip(left, top);
      drawPip(center, center);
      drawPip(right, bottom);
      break;
    case 4:
      drawPip(left, top);
      drawPip(right, top);
      drawPip(left, bottom);
      drawPip(right, bottom);
      break;
    case 5:
      drawPip(left, top);
      drawPip(right, top);
      drawPip(center, center);
      drawPip(left, bottom);
      drawPip(right, bottom);
      break;
    case 6:
      drawPip(left, top);
      drawPip(right, top);
      drawPip(left, center);
      drawPip(right, center);
      drawPip(left, bottom);
      drawPip(right, bottom);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// In standard Three.js BoxGeometry: [+X=3, -X=4, +Y=1, -Y=6, +Z=5, -Z=2]
// Euler angles to rotate the box so the target number (1..6) faces +Y (upwards):
export const ROTATION_FOR_TOP_FACE: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  6: [Math.PI, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [-Math.PI / 2, 0, 0],
  2: [Math.PI / 2, 0, 0],
};

// A rounded cube that keeps BoxGeometry's 6 face groups and planar UVs, so a
// material array maps one pip texture per face (drei's RoundedBox is an
// extrusion with only 2 groups, which scrambles the faces).
export function createRoundedDieGeometry(size = 1, radius = 0.14, segments = 6): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(size, size, size, segments, segments, segments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const half = size / 2;
  const inner = half - radius;
  const p = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    c.set(
      THREE.MathUtils.clamp(p.x, -inner, inner),
      THREE.MathUtils.clamp(p.y, -inner, inner),
      THREE.MathUtils.clamp(p.z, -inner, inner)
    );
    p.sub(c);
    if (p.lengthSq() > 0) p.setLength(radius);
    p.add(c);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  return geo;
}
