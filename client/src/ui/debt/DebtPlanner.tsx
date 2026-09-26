import React, { useEffect, useMemo, useState } from 'react';
import { BOARD_TILES, COLOR_GROUPS, LEVEL_LABELS, PropertyState, TileGroup, liquidationValue } from '@monopoly/shared';
import {
  ChevronDown,
  Eye,
  Flag as FlagIcon,
  Handshake,
  Landmark,
  Lock,
  Plane,
  Receipt,
  RotateCcw,
  Sparkles,
  Wand2,
  Zap
} from 'lucide-react';
import { socket } from '../../net/socket.js';
import { useGameStore } from '../../store/gameStore.js';
import { audioManager } from '../../sound/audioManager.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { Flag } from '../common/Flag.js';
import { TradeComposer } from '../trade/TradeComposer.js';
import { GROUP_HEX, GROUP_LABEL, GROUP_ORDER, money } from '../theme.js';
import { Plan, PlanItem, autoPlan, initialPlan, ownedProps, planSteps, planTotal, refundFor, rentAt } from './plan.js';

// Sends each step and waits for the server to apply it before the next one.
async function runSteps(steps: ReturnType<typeof planSteps>) {
  for (const step of steps) {
    const st = useGameStore.getState();
    if (st.gameState?.phase !== 'DEBT') return;
    const before = st.gameState;
    if (step.kind === 'sell') socket.emit('game:sell', { tileIndex: step.tileIndex });
    else socket.emit('game:mortgage', { tileIndex: step.tileIndex, mortgage: true });
    await new Promise<void>((resolve) => {
      const timer = setTimeout(done, 3000);
      const unsub = useGameStore.subscribe((s) => {
        if (s.gameState !== before) done();
      });
      function done() {
        clearTimeout(timer);
        unsub();
        resolve();
      }
    });
  }
}

const LevelPicker: React.FC<{ prop: PropertyState; item: PlanItem; onChange: (item: PlanItem) => void }> = ({ prop, item, onChange }) => {
  const tile = BOARD_TILES[prop.tileIndex];
  if (tile.buildCost <= 0) return null;
  return (
    <div className="level-picker" role="radiogroup" aria-label="Sell down to">
      {LEVEL_LABELS.map((label, lvl) => {
        const built = lvl <= prop.buildLevel;
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={item.level === lvl}
            className={`lvl ${item.level === lvl ? 'target' : ''} ${built ? 'built' : 'empty'} ${lvl > item.level && built ? 'selling' : ''}`}
            disabled={!built}
            onClick={() => onChange({ level: lvl, mortgage: lvl === 0 ? item.mortgage : false })}
            title={built ? `Keep ${label}` : `${label} not built`}
          >
            <span className="lvl-dot" />
            <span className="lvl-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

const PropertyCard: React.FC<{
  prop: PropertyState;
  item: PlanItem;
  open: boolean;
  onToggle: () => void;
  onChange: (item: PlanItem) => void;
}> = ({ prop, item, open, onToggle, onChange }) => {
  const tile = BOARD_TILES[prop.tileIndex];
  const refund = refundFor(prop, item);
  const perLevel = Math.floor(tile.buildCost / 2);
  const mortgageValue = Math.floor(tile.price / 2);
  const nowRent = rentAt(prop, prop.buildLevel, prop.isMortgaged);
  const planRent = rentAt(prop, item.level, prop.isMortgaged || item.mortgage);
  const changed = refund > 0;
  const canMortgage = !prop.isMortgaged && item.level === 0;

  return (
    <li className={`plan-card ${changed ? 'changed' : ''} ${prop.isMortgaged ? 'mortgaged' : ''} ${open ? 'open' : ''}`} style={{ '--g': GROUP_HEX[tile.group] } as React.CSSProperties}>
      <button type="button" className="plan-card-head" onClick={onToggle} aria-expanded={open}>
        <span className="plan-band" />
        {tile.country ? <Flag country={tile.country} size={26} /> : <span className="plan-kind">{tile.type === 'railroad' ? <Plane size={15} /> : <Zap size={15} />}</span>}
        <span className="plan-title">
          <strong className="truncate">{tile.name}</strong>
          <small>
            {prop.isMortgaged ? 'Mortgaged' : tile.buildCost > 0 ? LEVEL_LABELS[prop.buildLevel] : tile.type === 'railroad' ? 'Airport' : 'Utility'}
            {changed && item.level !== prop.buildLevel && <> → {LEVEL_LABELS[item.level]}</>}
            {item.mortgage && ' → Mortgage'}
          </small>
        </span>
        {prop.forceBought && <Lock size={14} className="plan-lock" aria-label="Force-bought" />}
        <span className={`plan-refund tnum ${changed ? 'on' : ''}`}>{changed ? `+${money(refund)}` : money(0)}</span>
        <ChevronDown size={18} className="plan-chev" />
      </button>

      <div className="plan-controls">
        {prop.isMortgaged ? (
          <p className="plan-note">Already mortgaged. Nothing more to raise here.</p>
        ) : (
          <>
            <LevelPicker prop={prop} item={item} onChange={onChange} />
            <label className={`mortgage-toggle ${canMortgage ? '' : 'disabled'}`}>
              <button
                type="button"
                className={`switch ${item.mortgage ? 'on' : ''}`}
                role="switch"
                aria-checked={item.mortgage}
                disabled={!canMortgage}
                onClick={() => onChange({ ...item, mortgage: !item.mortgage })}
              />
              <span>
                Mortgage <strong className="tnum">+{money(mortgageValue)}</strong>
                {!canMortgage && <small> (sell buildings first)</small>}
              </span>
            </label>
          </>
        )}
      </div>

      {open && (
        <div className="plan-details">
          {tile.buildCost > 0 ? (
            <table className="plan-rents">
              <tbody>
                {LEVEL_LABELS.map((label, lvl) => (
                  <tr key={label} className={`${lvl === prop.buildLevel ? 'now' : ''} ${lvl === item.level && item.level !== prop.buildLevel ? 'plan' : ''}`}>
                    <td>{label}</td>
                    <td className="tnum">{money(tile.rentByLevel[lvl])}</td>
                    <td>{lvl === prop.buildLevel ? <span className="badge">Now</span> : lvl === item.level && item.level !== prop.buildLevel ? <span className="badge blue">Plan</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="plan-note">Rent depends on how many {tile.type === 'railroad' ? 'airports' : 'utilities'} you own.</p>
          )}
          <dl className="plan-facts">
            <div>
              <dt>Rent now → plan</dt>
              <dd className="tnum">
                {money(nowRent)} → {money(planRent)}
              </dd>
            </div>
            {tile.buildCost > 0 && (
              <div>
                <dt>Sell back per level</dt>
                <dd className="tnum">{money(perLevel)}</dd>
              </div>
            )}
            <div>
              <dt>Mortgage value</dt>
              <dd className="tnum">{money(mortgageValue)}</dd>
            </div>
            <div>
              <dt>Bought for</dt>
              <dd className="tnum">{money(tile.price)}</dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  );
};

// Full-screen planner for a player who owes more than they have: see every
// property, choose exactly what to sell or mortgage, then execute the plan.
export const DebtPlanner: React.FC = () => {
  const game = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const minimized = useGameStore((s) => s.debtMinimized);
  const setMinimized = useGameStore((s) => s.setDebtMinimized);
  const isMobile = useIsMobile();
  const [plan, setPlan] = useState<Plan>({});
  const [openCard, setOpenCard] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'buildings' | 'land'>('all');
  const [running, setRunning] = useState(false);
  const [confirmBankrupt, setConfirmBankrupt] = useState(false);
  const [trading, setTrading] = useState(false);

  const debtor = game ? game.players[game.currentPlayerIndex] : undefined;
  const active = !!game && game.phase === 'DEBT' && !!game.debt && debtor?.playerId === myPlayerId;
  const debtKey = active ? `${game!.turnNumber}:${game!.debt!.amount}:${game!.debt!.reason}` : null;
  const props = useMemo(() => (active && game ? ownedProps(game, myPlayerId) : []), [active, game, myPlayerId]);

  // A fresh debt opens the planner with an empty plan.
  useEffect(() => {
    if (!debtKey) return;
    setMinimized(false);
    setConfirmBankrupt(false);
    setOpenCard(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtKey]);

  // Keep the plan in sync with the real properties (after each executed step).
  useEffect(() => {
    setPlan((old) => {
      const next: Plan = {};
      for (const p of props) {
        const prev = old[p.tileIndex];
        next[p.tileIndex] = prev
          ? { level: Math.min(prev.level, p.buildLevel), mortgage: prev.mortgage && !p.isMortgaged }
          : { level: p.buildLevel, mortgage: false };
      }
      return next;
    });
  }, [props]);

  if (!active || !game || !debtor || !game.debt) return null;
  const debt = game.debt;
  const creditor = debt.creditorId ? game.players.find((p) => p.playerId === debt.creditorId) : null;
  const planned = planTotal(props, plan);
  const projected = debtor.money + planned;
  const shortfall = Math.max(0, debt.amount - debtor.money);
  const covered = projected >= debt.amount;
  const maxRaise = liquidationValue(game, myPlayerId);
  const canEverCover = debtor.money + maxRaise >= debt.amount;
  const steps = planSteps(props, plan);
  const bankruptRaised = debtor.money + maxRaise;
  const creditorGets = creditor ? Math.min(debt.amount, bankruptRaised) : 0;

  const cashPct = Math.min(100, (debtor.money / debt.amount) * 100);
  const planPct = Math.min(100 - cashPct, (planned / debt.amount) * 100);

  const setItem = (idx: number, item: PlanItem) => setPlan((p) => ({ ...p, [idx]: item }));

  const visible = props.filter((p) =>
    filter === 'all' ? true : filter === 'buildings' ? p.buildLevel > 0 : p.buildLevel === 0
  );
  const grouped = new Map<TileGroup, PropertyState[]>();
  for (const p of visible) {
    const g = BOARD_TILES[p.tileIndex].group;
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(p);
  }

  const execute = async () => {
    if (!steps.length) return;
    audioManager.playClick();
    setRunning(true);
    await runSteps(steps);
    setRunning(false);
  };

  const bankrupt = () => {
    if (!confirmBankrupt) return setConfirmBankrupt(true);
    audioManager.playClick();
    socket.emit('game:declareBankruptcy');
  };

  if (minimized) {
    return (
      <button className="debt-pill" onClick={() => setMinimized(false)}>
        <Receipt size={18} />
        <span>
          You owe <strong className="tnum">{money(debt.amount)}</strong> · short {money(shortfall)}
        </span>
        <span className="debt-pill-cta">Open planner</span>
      </button>
    );
  }

  const dueAndMeter = (
    <>
      <div className="planner-due">
        <span className="debt-icon">
          <Receipt size={22} />
        </span>
        <div>
          <small>Payment due · {debt.reason}</small>
          <strong className="tnum">{money(debt.amount)}</strong>
          <span>to {creditor ? creditor.name : 'the Bank'}</span>
        </div>
      </div>

      <div className="planner-meter" aria-label="Cash plus plan versus debt">
        <div className="meter-track">
          <span className="meter-cash" style={{ width: `${cashPct}%` }} />
          <span className="meter-plan" style={{ left: `${cashPct}%`, width: `${planPct}%` }} />
        </div>
        <div className="meter-legend">
          <span>
            <i className="dot cash" /> Cash <b className="tnum">{money(debtor.money)}</b>
          </span>
          <span>
            <i className="dot plan" /> Plan <b className="tnum">+{money(planned)}</b>
          </span>
        </div>
        <div className={`meter-verdict ${covered ? 'ok' : 'short'}`}>
          {covered ? (
            <>
              <Sparkles size={16} /> Covered! {money(projected - debt.amount)} left after paying
            </>
          ) : (
            <>Still short {money(debt.amount - projected)}</>
          )}
        </div>
      </div>

    </>
  );

  const warn = !canEverCover && (
    <p className="planner-warn">Even selling everything raises only {money(bankruptRaised)}. A trade could still save you.</p>
  );

  const tools = (
      <div className="planner-tools">
        <button className="btn btn-blue btn-sm" onClick={() => setPlan(autoPlan(props, shortfall))} disabled={running}>
          <Wand2 size={15} /> Auto-plan
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setPlan(initialPlan(props))} disabled={running || planned === 0}>
          <RotateCcw size={15} /> Reset
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setTrading(true)} disabled={running}>
          <Handshake size={15} /> Offer a trade
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setMinimized(true)}>
          <Eye size={15} /> Peek at board
        </button>
      </div>
  );

  const runButton = (
      <button className="btn btn-success btn-lg btn-block btn-run-plan" onClick={execute} disabled={running || steps.length === 0}>
        <Landmark size={18} />
        {running ? 'Selling…' : covered ? `Sell & pay ${money(debt.amount)}` : steps.length ? `Raise ${money(planned)}` : 'Pick what to sell'}
      </button>
  );

  const bankruptBox = (
      <div className="planner-bankrupt">
        <p>
          Bankruptcy sells everything to the Bank for {money(bankruptRaised)}
          {creditor ? `; ${creditor.name} gets ${money(creditorGets)}` : ''}. You are out of the game.
        </p>
        <button className={`btn btn-sm btn-block ${confirmBankrupt ? 'btn-danger' : 'btn-danger-soft'}`} onClick={bankrupt} disabled={running}>
          <FlagIcon size={15} /> {confirmBankrupt ? 'Tap again to go bankrupt' : 'Declare bankruptcy'}
        </button>
      </div>
  );

  const list = (
    <div className="planner-list">
      <div className="planner-list-head">
        <h3 className="display">Your properties</h3>
        <div className="segmented small">
          {(['all', 'buildings', 'land'] as const).map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'buildings' ? 'Built' : 'Land'}
            </button>
          ))}
        </div>
      </div>
      {props.length === 0 ? (
        <p className="plan-note">You own no properties. Only a trade or bankruptcy is left.</p>
      ) : (
        GROUP_ORDER.filter((g) => grouped.has(g)).map((g) => {
          const setSize = COLOR_GROUPS[g]?.length;
          const owned = props.filter((p) => BOARD_TILES[p.tileIndex].group === g).length;
          return (
            <section key={g} className="plan-group">
              <header>
                {setSize ? <Flag group={g} size={18} /> : <Plane size={15} />}
                <span>{GROUP_LABEL[g]}</span>
                {setSize && owned === setSize && <span className="badge gold">Full set</span>}
              </header>
              <ul>
                {grouped.get(g)!.map((p) => (
                  <PropertyCard
                    key={p.tileIndex}
                    prop={p}
                    item={plan[p.tileIndex] ?? { level: p.buildLevel, mortgage: false }}
                    open={openCard === p.tileIndex}
                    onToggle={() => setOpenCard((o) => (o === p.tileIndex ? null : p.tileIndex))}
                    onChange={(item) => setItem(p.tileIndex, item)}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );

  return (
    <div className={`modal-backdrop planner-backdrop ${isMobile ? 'sheet-mode' : ''}`} role="presentation">
      <div className="dialog planner" role="dialog" aria-modal="true" aria-label="Debt planner">
        {isMobile && <div className="sheet-handle" />}
        {isMobile ? (
          <>
            <div className="planner-scroll">
              <div className="planner-summary">
                {dueAndMeter}
                {warn}
                {tools}
              </div>
              {list}
              {bankruptBox}
            </div>
            <footer className="planner-footer">{runButton}</footer>
          </>
        ) : (
          <div className="planner-cols">
            {list}
            <aside className="planner-side">
              <div className="planner-summary">
                {dueAndMeter}
                {warn}
                {tools}
                {runButton}
                {bankruptBox}
              </div>
            </aside>
          </div>
        )}
      </div>
      {trading && <TradeComposer onClose={() => setTrading(false)} partnerId={creditor?.playerId} />}
    </div>
  );
};
