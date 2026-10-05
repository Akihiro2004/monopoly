// Bot strength check: plays many headless games and prints win rates.
//   npx tsx test/botTune.ts [games per setup, default 40]
// "naive" = buys whatever it can, builds whenever it can, never bids/trades.
import { simulate } from './botSim.js';
const N = Number(process.argv[2] ?? 40);
const setups: [string, Parameters<typeof simulate>[0]][] = [
  ['1 smart vs 1 naive (special on)', { kinds: ['smart', 'naive'] }],
  ['naive first vs smart', { kinds: ['naive', 'smart'] }],
  ['1 smart vs 3 naive', { kinds: ['smart', 'naive', 'naive', 'naive'] }],
  ['smart vs naive, special OFF', { kinds: ['smart', 'naive'], specialVictory: false, maxActions: 40000 }],
  ['4 smart, events, any-mode', { kinds: ['smart', 'smart', 'smart', 'smart'], randomEvents: true, forceBuyMode: 'any' }],
];
for (const [label, opts] of setups) {
  let smart = 0, done = 0, stalls: string[] = [], turns = 0; const vt: Record<string, number> = {};
  for (let i = 0; i < N; i++) {
    const r = simulate(opts);
    if (r.stalled) stalls.push(r.stalled); else { done++; turns += r.turns; vt[r.victoryType!] = (vt[r.victoryType!] ?? 0) + 1; }
    if (r.winnerKind === 'smart') smart++;
  }
  console.log(`${label}: smart wins ${smart}/${N}, finished ${done}, avg turns ${Math.round(turns / Math.max(1, done))}`, vt, stalls.slice(0, 3));
}
