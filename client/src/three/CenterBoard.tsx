import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore.js';
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
  const topArt = useMemo(() => {
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

  // When a card from this deck is drawn, the top card lifts off and vanishes
  // (the 2D card animation takes over from the same spot on screen).
  const lifted = useGameStore((s) => s.cardDraw?.deck === mark);
  const top = useRef<THREE.Group>(null);
  const t = useRef(0);
  const baseY = (cardCount - 1) * cardH;
  useFrame((_, dt) => {
    const g = top.current;
    if (!g) return;
    const target = lifted ? 1 : 0;
    if (t.current === target) return;
    t.current = lifted ? Math.min(1, t.current + Math.min(dt, 0.05) * 4) : 0;
    const k = t.current;
    // Offset from the card's resting height (not 0, which sinks it into the stack).
    g.position.y = baseY + k * 1.4;
    g.rotation.x = -k * 0.9;
    g.scale.setScalar(1 - k * 0.6);
    g.visible = k < 0.98;
  });

  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: cardCount - 1 }).map((_, i) => (
        <mesh key={i} castShadow receiveShadow position={[(i % 2) * 0.02, i * cardH, (i % 3) * 0.015]}>
          <boxGeometry args={[1.7, cardH, 2.3]} />
          <meshStandardMaterial color={i % 2 ? '#fffaf0' : '#f2e6cc'} roughness={0.7} />
        </mesh>
      ))}
      {/* the drawable top card */}
      <group ref={top} position={[0, baseY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.7, cardH, 2.3]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0.0, cardH / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.66, 2.26]} />
          <meshStandardMaterial map={topArt} roughness={0.6} />
        </mesh>
      </group>
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
