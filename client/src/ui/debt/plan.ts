import { BOARD_TILES, COLOR_GROUPS, GameState, PropertyState, TileGroup } from '@monopoly/shared';

// A plan says, per property, which level to sell down to and whether to
// mortgage it (only possible once it is back to land).
export interface PlanItem {
  level: number;
  mortgage: boolean;
}
export type Plan = Record<number, PlanItem>;

// Color sets where another player still has buildings (they block mortgages
// in that set, like the player's own buildings do).
export function othersBuiltGroups(game: GameState, playerId: string): Set<TileGroup> {
  const out = new Set<TileGroup>();
  for (const p of Object.values(game.properties)) {
    if (p.ownerId && p.ownerId !== playerId && p.buildLevel > 0) out.add(BOARD_TILES[p.tileIndex].group);
  }
  return out;
}

// Classic rule: land can only be mortgaged once the whole color set has no
// buildings, i.e. after the plan's sales every deed of the set is bare land.
export function mortgageAllowed(p: PropertyState, plan: Plan, props: PropertyState[], blocked: Set<TileGroup>): boolean {
  const group = BOARD_TILES[p.tileIndex].group;
  if (blocked.has(group)) return false;
  const set = COLOR_GROUPS[group] ?? [p.tileIndex];
  return props.every((q) => !set.includes(q.tileIndex) || (plan[q.tileIndex]?.level ?? q.buildLevel) === 0);
}

// Drops mortgage choices the rest of the plan no longer allows.
export function normalizePlan(props: PropertyState[], plan: Plan, blocked: Set<TileGroup>): Plan {
  const next: Plan = { ...plan };
  for (const p of props) {
    const item = next[p.tileIndex];
    if (item?.mortgage && (item.level !== 0 || !mortgageAllowed(p, next, props, blocked))) {
      next[p.tileIndex] = { ...item, mortgage: false };
    }
  }
  return next;
}

export function initialPlan(props: PropertyState[]): Plan {
  return Object.fromEntries(props.map((p) => [p.tileIndex, { level: p.buildLevel, mortgage: false }]));
}

export function refundFor(p: PropertyState, item: PlanItem): number {
  const tile = BOARD_TILES[p.tileIndex];
  const levels = Math.max(0, p.buildLevel - item.level) * Math.floor(tile.buildCost / 2);
  const mortgage = item.mortgage && item.level === 0 && !p.isMortgaged ? Math.floor(tile.price / 2) : 0;
  return levels + mortgage;
}

export function planTotal(props: PropertyState[], plan: Plan): number {
  return props.reduce((s, p) => s + (plan[p.tileIndex] ? refundFor(p, plan[p.tileIndex]) : 0), 0);
}

// Base rent at a level (ignores full-set doubling / railroad counts: it is a
// relative "what you give up" measure for planning).
export function rentAt(p: PropertyState, level: number, mortgaged: boolean): number {
  if (mortgaged) return 0;
  const tile = BOARD_TILES[p.tileIndex];
  return tile.rentByLevel[level] ?? tile.rentByLevel[0];
}

/**
 * Greedy plan that covers `needed` while giving up as little rent as
 * possible per dollar raised: each step either sells the top building level
 * of a property or (once it is land) mortgages it.
 */
export function autoPlan(props: PropertyState[], needed: number, blocked: Set<TileGroup> = new Set()): Plan {
  const plan = initialPlan(props);
  let raised = 0;
  const liquid = props.filter((p) => !p.isMortgaged);
  while (raised < needed) {
    let best: { idx: number; gain: number; mortgage: boolean; score: number } | null = null;
    for (const p of liquid) {
      const item = plan[p.tileIndex];
      const tile = BOARD_TILES[p.tileIndex];
      if (item.level > 0 && tile.buildCost > 0) {
        const gain = Math.floor(tile.buildCost / 2);
        const loss = rentAt(p, item.level, false) - rentAt(p, item.level - 1, false);
        const score = loss / gain;
        if (!best || score < best.score) best = { idx: p.tileIndex, gain, mortgage: false, score };
      } else if (item.level === 0 && !item.mortgage && mortgageAllowed(p, plan, props, blocked)) {
        const gain = Math.floor(tile.price / 2);
        const score = rentAt(p, 0, false) / gain + 0.05; // prefer selling buildings on ties
        if (!best || score < best.score) best = { idx: p.tileIndex, gain, mortgage: true, score };
      }
    }
    if (!best) break;
    const item = plan[best.idx];
    if (best.mortgage) item.mortgage = true;
    else item.level -= 1;
    raised += best.gain;
  }
  return plan;
}

export interface PlanStep {
  kind: 'sell' | 'mortgage';
  tileIndex: number;
}

// Sell buildings first (a property must be land before it can be mortgaged).
export function planSteps(props: PropertyState[], plan: Plan): PlanStep[] {
  const steps: PlanStep[] = [];
  for (const p of props) {
    const item = plan[p.tileIndex];
    if (!item) continue;
    for (let l = p.buildLevel; l > item.level; l--) steps.push({ kind: 'sell', tileIndex: p.tileIndex });
  }
  for (const p of props) {
    const item = plan[p.tileIndex];
    if (item?.mortgage && item.level === 0 && !p.isMortgaged) steps.push({ kind: 'mortgage', tileIndex: p.tileIndex });
  }
  return steps;
}

export function ownedProps(game: GameState, playerId: string): PropertyState[] {
  return Object.values(game.properties)
    .filter((p) => p.ownerId === playerId)
    .sort((a, b) => a.tileIndex - b.tileIndex);
}
