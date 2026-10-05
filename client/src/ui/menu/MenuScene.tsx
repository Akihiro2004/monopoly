import React, { memo } from 'react';

// Menu backdrop: a golden-hour world skyline, one landmark per country on
// the board (Petronas Towers, Monas, Oriental Pearl, Tokyo Tower, Big Ben,
// Eiffel Tower, Sugarloaf & Christ the Redeemer, Statue of Liberty), under a
// dusk sky with a low sun, stars and drifting clouds. Pure SVG + CSS; the
// building windows are seeded so the skyline is the same on every visit.

const W = 1600;
const BASE = 360;

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

interface Block {
  x: number;
  w: number;
  h: number;
}

// Plain buildings filling the gaps between landmarks.
function blocks(seed: number, minH: number, maxH: number, skip: [number, number][]): Block[] {
  const r = seeded(seed);
  const out: Block[] = [];
  let x = -10;
  while (x < W + 10) {
    const w = 34 + Math.round(r() * 52);
    const busy = skip.some(([a, b]) => x + w > a && x < b);
    if (!busy) out.push({ x, w, h: minH + Math.round(r() * (maxH - minH)) });
    x += w + (busy ? 6 : Math.round(r() * 4));
  }
  return out;
}

function windows(list: Block[], seed: number): { x: number; y: number; g: number }[] {
  const r = seeded(seed);
  const out: { x: number; y: number; g: number }[] = [];
  for (const b of list) {
    for (let y = BASE - b.h + 12; y < BASE - 14; y += 13) {
      for (let x = b.x + 7; x < b.x + b.w - 8; x += 11) {
        if (r() < 0.32) out.push({ x, y, g: Math.floor(r() * 3) });
      }
    }
  }
  return out;
}

// Landmark slots on the near layer (kept free of plain buildings).
const NEAR_SKIP: [number, number][] = [
  [100, 222],
  [292, 372],
  [522, 600],
  [772, 830],
  [1052, 1150],
  [1384, 1456]
];
const NEAR = blocks(7, 70, 190, NEAR_SKIP);
const NEAR_WINDOWS = windows(NEAR, 11);
const FAR = blocks(23, 90, 230, [
  [0, 330],
  [612, 672],
  [1168, 1352]
]);

const tower = (cx: number) =>
  `M${cx - 17} ${BASE}V150H${cx - 14}V120H${cx - 11}V95H${cx - 7}V75H${cx - 2}V38H${cx + 2}V75H${cx + 7}V95H${cx + 11}V120H${cx + 14}V150H${cx + 17}V${BASE}Z`;

const FarLayer = () => (
  <svg className="mx-skyline far" viewBox={`0 0 ${W} ${BASE}`} preserveAspectRatio="xMidYMax slice">
    {/* Sugarloaf Mountain */}
    <path d={`M-20 ${BASE}Q40 250 110 232Q165 226 196 292Q232 196 262 192Q302 200 340 ${BASE}Z`} />
    {/* Oriental Pearl Tower */}
    <g>
      <rect x="639" y="40" width="4" height="320" />
      <circle cx="641" cy="250" r="17" />
      <circle cx="641" cy="168" r="11" />
      <circle cx="641" cy="118" r="6" />
      <path d={`M626 ${BASE}L636 250H646L656 ${BASE}Z`} />
    </g>
    {/* Corcovado and Christ the Redeemer */}
    <path d={`M1168 ${BASE}Q1258 232 1352 ${BASE}Z`} />
    <rect x="1257" y="226" width="5" height="40" />
    <rect x="1246" y="234" width="27" height="5" rx="2" />
    {FAR.map((b, i) => (
      <rect key={i} x={b.x} y={BASE - b.h} width={b.w} height={b.h} />
    ))}
  </svg>
);

const NearLayer = () => (
  <svg className="mx-skyline near" viewBox={`0 0 ${W} ${BASE}`} preserveAspectRatio="xMidYMax slice">
    {NEAR.map((b, i) => (
      <rect key={i} x={b.x} y={BASE - b.h} width={b.w} height={b.h} />
    ))}
    {/* Petronas Towers */}
    <path d={tower(132)} />
    <path d={tower(190)} />
    <rect x="148" y="198" width="26" height="6" />
    {/* Monas */}
    <rect x="300" y="330" width="64" height="30" />
    <path d="M322 330L328 132H336L342 330Z" />
    <rect x="323" y="120" width="18" height="12" rx="2" />
    {/* Tokyo Tower */}
    <path d={`M528 ${BASE}Q552 280 557 200L559 120L561 40H563L565 120L567 200Q572 280 596 ${BASE}H582Q562 310 542 ${BASE}Z`} />
    <rect x="547" y="232" width="30" height="7" />
    <rect x="553" y="150" width="18" height="6" />
    {/* Big Ben + Parliament */}
    <rect x="786" y="120" width="30" height="240" />
    <rect x="781" y="94" width="40" height="40" />
    <rect x="788" y="70" width="26" height="24" />
    <path d="M784 70L801 24L818 70Z" />
    <rect x="800" y="6" width="2" height="20" />
    <path d={`M816 ${BASE}V262H836V250H842V262H880V250H886V262H924V250H930V262H960V${BASE}Z`} />
    {/* Eiffel Tower */}
    <path
      fillRule="evenodd"
      d={`M1060 ${BASE}Q1086 300 1094 220L1097 140L1099 58L1100 18L1101 58L1103 140L1106 220Q1114 300 1140 ${BASE}ZM1080 ${BASE}Q1100 312 1120 ${BASE}Z`}
    />
    <rect x="1078" y="268" width="44" height="7" />
    <rect x="1089" y="212" width="22" height="6" />
    <rect x="1094" y="138" width="12" height="5" />
    {/* Statue of Liberty */}
    <rect x="1392" y="282" width="56" height="78" />
    <rect x="1400" y="250" width="40" height="32" />
    <path d="M1410 250L1414 192Q1420 174 1426 192L1430 250Z" />
    <circle cx="1420" cy="172" r="7" />
    <path d="M1425 188L1431 142L1436 143L1431 189Z" />

    {/* Lit windows and landmark lights */}
    {[0, 1, 2].map((g) => (
      <g key={g} className={`mx-windows w${g}`}>
        {NEAR_WINDOWS.filter((w) => w.g === g).map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width="4" height="6" rx="1" />
        ))}
      </g>
    ))}
    <g className="mx-lights">
      <circle cx="801" cy="114" r="11" />
      <ellipse className="flame" cx="332" cy="110" rx="6" ry="10" />
      <ellipse className="flame" cx="1434" cy="134" rx="5" ry="8" />
      <circle className="beacon" cx="562" cy="38" r="3" />
      <circle className="beacon b2" cx="1100" cy="16" r="3" />
      <circle className="beacon b3" cx="190" cy="36" r="2.5" />
      <circle className="beacon" cx="132" cy="36" r="2.5" />
    </g>
  </svg>
);

export const MenuScene: React.FC = memo(() => (
  <div className="mx-scene" aria-hidden="true">
    <span className="mx-stars" />
    <span className="mx-sun" />
    <span className="mx-cloud c1" />
    <span className="mx-cloud c2" />
    <span className="mx-cloud c3" />
    <FarLayer />
    <NearLayer />
    <span className="mx-haze" />
  </div>
));
