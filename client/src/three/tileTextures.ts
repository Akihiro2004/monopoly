import * as THREE from 'three';
import { BOARD_TILES, COUNTRY_NAMES, SIDE_NAMES, TileDef } from '@monopoly/shared';

// Canvas-painted board art (classic Monopoly look): crisp text and icons on
// every tile instead of floating 3D text. Canvas top edge = the tile's inner
// edge (facing the board center), where the color band sits.

const INK = '#2b1d10';
const FACE = '#e4f1dd';
const DISPLAY = '"Lilita One", "Nunito", sans-serif';
const BODY = '"Nunito", sans-serif';

export const BAND_HEX: Record<string, string> = {
  brown: '#8a4b2a',
  lightblue: '#9dd8f5',
  pink: '#e0418f',
  orange: '#f58a1f',
  red: '#e2261f',
  yellow: '#f7d117',
  green: '#1ea44b',
  darkblue: '#1f4fbf'
};

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function centerText(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lh: number) {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
}

// ---------------------------------------------------------------- icons
function questionMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.font = `${s}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = s * 0.08;
  ctx.strokeStyle = INK;
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.rotate(-0.15);
  ctx.strokeText('?', 0, 0);
  ctx.fillText('?', 0, 0);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function chest(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.06;
  ctx.strokeStyle = INK;
  // body
  ctx.fillStyle = '#b86b2c';
  roundRect(ctx, -s / 2, -s * 0.05, s, s * 0.5, s * 0.06);
  ctx.fill();
  ctx.stroke();
  // lid
  ctx.fillStyle = '#d98a3d';
  ctx.beginPath();
  ctx.moveTo(-s / 2, -s * 0.05);
  ctx.quadraticCurveTo(0, -s * 0.5, s / 2, -s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // bands + lock
  ctx.fillStyle = '#ffc629';
  ctx.fillRect(-s * 0.08, -s * 0.3, s * 0.16, s * 0.75);
  ctx.strokeRect(-s * 0.08, -s * 0.3, s * 0.16, s * 0.75);
  ctx.beginPath();
  ctx.arc(0, s * 0.08, s * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

function airplane(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  ctx.lineWidth = s * 0.05;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#2f7de1';
  // fuselage
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.09, s * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // wings
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, -s * 0.05);
  ctx.lineTo(-s * 0.46, s * 0.12);
  ctx.lineTo(-s * 0.46, s * 0.2);
  ctx.lineTo(-s * 0.06, s * 0.1);
  ctx.moveTo(s * 0.06, -s * 0.05);
  ctx.lineTo(s * 0.46, s * 0.12);
  ctx.lineTo(s * 0.46, s * 0.2);
  ctx.lineTo(s * 0.06, s * 0.1);
  ctx.fill();
  ctx.stroke();
  // tail
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, s * 0.34);
  ctx.lineTo(-s * 0.2, s * 0.46);
  ctx.lineTo(s * 0.2, s * 0.46);
  ctx.lineTo(s * 0.04, s * 0.34);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.34, s * 0.045, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function bulb(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.07;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.arc(0, -s * 0.12, s * 0.32, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(s * 0.14, s * 0.25);
  ctx.lineTo(-s * 0.14, s * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(-s * 0.15, s * 0.25, s * 0.3, s * 0.18);
  ctx.strokeRect(-s * 0.15, s * 0.25, s * 0.3, s * 0.18);
  ctx.restore();
}

function faucet(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.07;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(-s * 0.45, -s * 0.2, s * 0.6, s * 0.18);
  ctx.strokeRect(-s * 0.45, -s * 0.2, s * 0.6, s * 0.18);
  ctx.fillRect(s * 0.05, -s * 0.2, s * 0.18, s * 0.35);
  ctx.strokeRect(s * 0.05, -s * 0.2, s * 0.18, s * 0.35);
  ctx.fillRect(-s * 0.25, -s * 0.38, s * 0.3, s * 0.1);
  // drop
  ctx.fillStyle = '#3b9cf5';
  ctx.beginPath();
  ctx.moveTo(s * 0.14, s * 0.2);
  ctx.quadraticCurveTo(s * 0.34, s * 0.45, s * 0.14, s * 0.52);
  ctx.quadraticCurveTo(-s * 0.06, s * 0.45, s * 0.14, s * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.06;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#9ee7ff';
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 0.12);
  ctx.lineTo(-s * 0.22, -s * 0.34);
  ctx.lineTo(s * 0.22, -s * 0.34);
  ctx.lineTo(s * 0.4, -s * 0.12);
  ctx.lineTo(0, s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 0.12);
  ctx.lineTo(s * 0.4, -s * 0.12);
  ctx.moveTo(-s * 0.1, -s * 0.34);
  ctx.lineTo(0, s * 0.4);
  ctx.lineTo(s * 0.1, -s * 0.34);
  ctx.stroke();
  ctx.restore();
}

function moneyBag(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.06;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#7ccf5b';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.1, s * 0.38, s * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.14, -s * 0.22);
  ctx.lineTo(-s * 0.22, -s * 0.42);
  ctx.lineTo(s * 0.22, -s * 0.42);
  ctx.lineTo(s * 0.14, -s * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `${s * 0.45}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, s * 0.13);
  ctx.restore();
}

// ---------------------------------------------------------------- tiles
function paintEdge(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = FACE;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
}

function standardTile(tile: TileDef, flags: Record<string, HTMLImageElement>): HTMLCanvasElement {
  const W = 256;
  const H = 384;
  const [c, ctx] = canvas(W, H);
  paintEdge(ctx, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;

  let nameTop = 36;
  if (tile.type === 'property') {
    ctx.fillStyle = BAND_HEX[tile.group] ?? '#999';
    ctx.fillRect(6, 6, W - 12, 92);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(6, 6, W - 12, 18);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 98);
    ctx.lineTo(W, 98);
    ctx.stroke();
    nameTop = 120;
    // Country flag medallion on the band
    const flag = tile.country ? flags[tile.country] : undefined;
    if (flag) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, 52, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.clip();
      ctx.drawImage(flag, W / 2 - 33, 52 - 33, 66, 66);
      ctx.restore();
    }
  }

  const name =
    tile.type === 'chest' ? 'COMMUNITY CHEST' : tile.type === 'chance' ? 'CHANCE' : tile.name.toUpperCase();
  ctx.fillStyle = INK;
  ctx.font = `900 ${tile.type === 'property' ? 32 : 30}px ${BODY}`;
  const lines = wrap(ctx, name, W - 40);
  centerText(ctx, lines, W / 2, nameTop, 34);

  const iconY = tile.type === 'property' ? 0 : 230;
  switch (tile.type) {
    case 'chance':
      questionMark(ctx, W / 2, iconY, 170, tile.index === 7 ? '#e7352c' : tile.index === 22 ? '#2f7de1' : '#f58a1f');
      break;
    case 'chest':
      chest(ctx, W / 2, iconY, 130);
      break;
    case 'railroad':
      airplane(ctx, W / 2, iconY, 170);
      break;
    case 'utility':
      if (tile.index === 12) bulb(ctx, W / 2, iconY - 10, 150);
      else faucet(ctx, W / 2, iconY, 150);
      break;
    case 'tax':
      if (tile.index === 4) moneyBag(ctx, W / 2, iconY, 120);
      else diamond(ctx, W / 2, iconY, 130);
      break;
  }

  if (tile.type === 'property' && tile.country) {
    ctx.font = `800 24px ${BODY}`;
    ctx.fillStyle = '#6b5a45';
    ctx.fillText(COUNTRY_NAMES[tile.country].toUpperCase(), W / 2, nameTop + lines.length * 34 + 10);
    ctx.fillStyle = INK;
  }

  ctx.font = `800 30px ${BODY}`;
  ctx.textBaseline = 'alphabetic';
  if (tile.price > 0) {
    ctx.fillText(`$${tile.price}`, W / 2, H - 40);
  } else if (tile.type === 'tax') {
    ctx.fillText(`PAY $${tile.rentByLevel[0]}`, W / 2, H - 40);
  }
  return c;
}

function cornerTile(tile: TileDef): HTMLCanvasElement {
  const S = 384;
  const [c, ctx] = canvas(S, S);
  paintEdge(ctx, S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;

  if (tile.type === 'go') {
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.font = `900 34px ${BODY}`;
    ctx.fillText('COLLECT $200', 0, -104);
    ctx.fillText('SALARY AS YOU PASS', 0, -68);
    ctx.font = `150px ${DISPLAY}`;
    ctx.lineWidth = 10;
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#e7352c';
    ctx.strokeText('GO', 0, 30);
    ctx.fillText('GO', 0, 30);
    ctx.restore();
    // arrow along the outer edge
    ctx.fillStyle = '#e7352c';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(300, 330);
    ctx.lineTo(120, 330);
    ctx.lineTo(120, 300);
    ctx.lineTo(50, 345);
    ctx.lineTo(120, 390 - 0);
    ctx.lineTo(120, 360);
    ctx.lineTo(300, 360);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (tile.type === 'jail') {
    // cell in the inner corner, "just visiting" along the outer edges
    ctx.fillStyle = '#f58a1f';
    ctx.fillRect(6, 6, 250, 250);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 250, 250);
    ctx.fillStyle = '#fff4c7';
    ctx.fillRect(50, 50, 164, 164);
    ctx.strokeRect(50, 50, 164, 164);
    ctx.fillStyle = INK;
    for (let i = 0; i < 5; i++) ctx.fillRect(70 + i * 30, 50, 10, 164);
    ctx.save();
    ctx.translate(131, 131);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = INK;
    ctx.font = `46px ${DISPLAY}`;
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 8;
    ctx.strokeText('IN JAIL', 0, 0);
    ctx.fillText('IN JAIL', 0, 0);
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.font = `900 38px ${BODY}`;
    ctx.fillText('JUST', S / 2 - 10, 318);
    ctx.save();
    ctx.translate(318, S / 2 - 10);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('VISITING', 0, 0);
    ctx.restore();
  } else if (tile.type === 'parking') {
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.font = `48px ${DISPLAY}`;
    ctx.fillText('FREE', 0, -110);
    ctx.fillText('PARKING', 0, 118);
    // car
    ctx.lineWidth = 8;
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#e7352c';
    roundRect(ctx, -110, -20, 220, 70, 20);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-60, -20);
    ctx.lineTo(-30, -70);
    ctx.lineTo(40, -70);
    ctx.lineTo(70, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9ee7ff';
    ctx.fillRect(-35, -60, 30, 36);
    ctx.fillRect(5, -60, 35, 36);
    ctx.fillStyle = INK;
    for (const wx of [-60, 60]) {
      ctx.beginPath();
      ctx.arc(wx, 52, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    // Go To Jail
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.font = `52px ${DISPLAY}`;
    ctx.fillText('GO TO', 0, -110);
    ctx.fillText('JAIL', 0, 120);
    // police badge
    ctx.fillStyle = '#2f7de1';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 80 : 40;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + 5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffc629';
    ctx.beginPath();
    ctx.arc(0, 5, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  return c;
}

function centerArt(): HTMLCanvasElement {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = FACE;
  ctx.fillRect(0, 0, S, S);
  // Subtle diagonal pattern
  ctx.strokeStyle = 'rgba(43,29,16,0.05)';
  ctx.lineWidth = 16;
  for (let i = -S; i < S * 2; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + S, S);
    ctx.stroke();
  }

  // Card spots (the 3D decks sit on these)
  const spot = (x: number, y: number, color: string, label: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.25);
    ctx.setLineDash([22, 14]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    roundRect(ctx, -95, -128, 190, 256, 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = `44px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 180);
    ctx.restore();
  };
  spot(S / 2 - 3.6 * 70, S / 2 - 3.4 * 70, '#f58a1f', 'CHANCE');
  spot(S / 2 + 3.6 * 70, S / 2 + 3.2 * 70, '#2f7de1', 'CHEST');

  // Region names along each edge (canvas bottom = GO side of the board)
  ctx.save();
  ctx.font = `46px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(43,29,16,0.55)';
  const edge: [number, number, number][] = [
    [S / 2, S - 44, 0],
    [44, S / 2, Math.PI / 2],
    [S / 2, 44, Math.PI],
    [S - 44, S / 2, -Math.PI / 2]
  ];
  edge.forEach(([x, y, r], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r);
    ctx.fillText(SIDE_NAMES[i].toUpperCase(), 0, 0);
    ctx.restore();
  });
  ctx.restore();

  // Diagonal red TMpoly plate
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(-Math.PI / 5);
  ctx.fillStyle = INK;
  roundRect(ctx, -390, -92, 780, 184, 22);
  ctx.fill();
  ctx.fillStyle = '#e7352c';
  roundRect(ctx, -378, -80, 756, 160, 16);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 8;
  roundRect(ctx, -362, -64, 724, 128, 10);
  ctx.stroke();
  ctx.font = `150px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 16;
  ctx.strokeStyle = INK;
  ctx.strokeText('TMpoly', 0, 8);
  ctx.fillStyle = '#fff';
  ctx.fillText('TMpoly', 0, 8);
  ctx.restore();
  return c;
}

export interface BoardTextures {
  tiles: THREE.CanvasTexture[];
  center: THREE.CanvasTexture;
}

let cache: Promise<BoardTextures> | null = null;

function loadFlags(): Promise<Record<string, HTMLImageElement>> {
  const codes = Object.keys(COUNTRY_NAMES);
  return Promise.all(
    codes.map(
      (c) =>
        new Promise<[string, HTMLImageElement | null]>((resolve) => {
          const img = new Image();
          img.onload = () => resolve([c, img]);
          img.onerror = () => resolve([c, null]);
          img.src = `/icons/flags/${c}.svg`;
        })
    )
  ).then((pairs) => Object.fromEntries(pairs.filter((p): p is [string, HTMLImageElement] => p[1] !== null)));
}

// Waits for the web fonts so the canvas text uses Lilita One / Nunito.
export function loadBoardTextures(): Promise<BoardTextures> {
  if (!cache) {
    cache = Promise.all([
      document.fonts.load(`64px ${DISPLAY}`),
      document.fonts.load(`900 32px ${BODY}`),
      document.fonts.load(`800 30px ${BODY}`)
    ])
      .catch(() => undefined)
      .then(loadFlags)
      .then((flags) => ({
        tiles: BOARD_TILES.map((t) => toTexture(t.index % 10 === 0 ? cornerTile(t) : standardTile(t, flags))),
        center: toTexture(centerArt())
      }));
  }
  return cache;
}
