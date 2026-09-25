import React, { useMemo } from 'react';
import * as THREE from 'three';

// A stack of cards with a colored top card and a painted "?"/chest mark.
const CardDeck: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  mark: 'chance' | 'chest';
}> = ({ position, rotation = [0, 0, 0], color, mark }) => {
  const cardCount = 9;
  const cardH = 0.04;
  const top = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 340;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 340);
    ctx.strokeStyle = '#2b1d10';
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, 228, 312);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = mark === 'chance' ? '220px "Lilita One", sans-serif' : '64px "Lilita One", sans-serif';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#2b1d10';
    ctx.fillStyle = '#fff';
    const text = mark === 'chance' ? '?' : 'CHEST';
    ctx.strokeText(text, 128, 175);
    ctx.fillText(text, 128, 175);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [color, mark]);

  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: cardCount }).map((_, i) => (
        <mesh key={i} castShadow receiveShadow position={[(i % 2) * 0.02, i * cardH, (i % 3) * 0.015]}>
          <boxGeometry args={[1.7, cardH, 2.3]} />
          <meshStandardMaterial color={i === cardCount - 1 ? color : i % 2 ? '#fffaf0' : '#f2e6cc'} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0.02, cardCount * cardH - cardH / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.66, 2.26]} />
        <meshStandardMaterial map={top} roughness={0.6} />
      </mesh>
    </group>
  );
};

// Center of the board: painted art (logo + card spots) and the two decks.
export const CenterBoard: React.FC<{ texture: THREE.Texture | null }> = ({ texture }) => {
  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: '#cfe3c6', roughness: 0.85 });
    const top = new THREE.MeshStandardMaterial({ color: texture ? '#ffffff' : '#e4f1dd', map: texture, roughness: 0.8 });
    return [side, side, top, side, side, side];
  }, [texture]);

  return (
    <group>
      <mesh receiveShadow position={[0, 0.15, 0]} material={materials}>
        <boxGeometry args={[14.7, 0.18, 14.7]} />
      </mesh>

      <CardDeck position={[-3.6, 0.26, -3.4]} rotation={[0, 0.25, 0]} color="#f58a1f" mark="chance" />
      <CardDeck position={[3.6, 0.26, 3.2]} rotation={[0, 0.25, 0]} color="#2f7de1" mark="chest" />
    </group>
  );
};
