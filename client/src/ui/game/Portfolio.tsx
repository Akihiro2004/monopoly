import React from 'react';
import { BOARD_TILES, COLOR_GROUPS, PropertyState, TileGroup } from '@monopoly/shared';
import { ArrowUpCircle, Banknote, Castle, Landmark, Lock, MapPin, Undo2 } from 'lucide-react';
import { socket } from '../../net/socket.js';
import { audioManager } from '../../sound/audioManager.js';
import { useTurn } from './useTurn.js';
import { GROUP_HEX, GROUP_LABEL, GROUP_ORDER, LEVEL_NAMES, completeSets, money, rentLabel, netWorth, ownedBy } from '../theme.js';

const LevelSteps: React.FC<{ level: number }> = ({ level }) => (
  <span className={`level-steps ${level === 4 ? 'landmark' : ''}`} aria-label={`Level ${level} of 4`}>
    {[1, 2, 3, 4].map((i) => (
      <span key={i} className={i <= level ? 'on' : ''} />
    ))}
  </span>
);

interface PortfolioProps {
  // Hide the summary header (used inside the debt modal).
  hideSummary?: boolean;
  // Only list properties that can raise cash (debt modal).
  liquidOnly?: boolean;
}

export const Portfolio: React.FC<PortfolioProps> = ({ hideSummary, liquidOnly }) => {
  const turn = useTurn();
  if (!turn || !turn.me) return null;
  const { game, me, canManage, upgrade } = turn;

  let props = ownedBy(game, me.playerId);
  if (liquidOnly) props = props.filter((p) => !p.isMortgaged);

  const emit = (fn: () => void) => {
    audioManager.playClick();
    fn();
  };
  const build = (tileIndex: number) => emit(() => socket.emit('game:build', { tileIndex }));
  const sell = (tileIndex: number) => emit(() => socket.emit('game:sell', { tileIndex }));
  const mortgage = (tileIndex: number, value: boolean) =>
    emit(() => socket.emit('game:mortgage', { tileIndex, mortgage: value }));

  const grouped = new Map<TileGroup, PropertyState[]>();
  for (const p of props) {
    const g = BOARD_TILES[p.tileIndex].group;
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(p);
  }

  return (
    <div className="portfolio">
      {!hideSummary && (
        <div className="portfolio-summary">
          <div className="stat">
            <span>Cash</span>
            <strong className="tnum">{money(me.money)}</strong>
          </div>
          <div className="stat">
            <span>Net worth</span>
            <strong className="tnum">{money(netWorth(game, me))}</strong>
          </div>
          <div className="stat">
            <span>Sets</span>
            <strong className="tnum">{completeSets(game, me.playerId)}</strong>
          </div>
        </div>
      )}

      {props.length === 0 && (
        <div className="empty-state">
          <MapPin size={26} />
          <span>{liquidOnly ? 'Nothing left to sell or mortgage.' : 'No properties yet. Land on an unowned tile to buy it.'}</span>
        </div>
      )}

      {GROUP_ORDER.filter((g) => grouped.has(g)).map((group) => {
        const list = grouped.get(group)!.sort((a, b) => a.tileIndex - b.tileIndex);
        const setSize = COLOR_GROUPS[group]?.length;
        const ownedInGroup = ownedBy(game, me.playerId).filter((p) => BOARD_TILES[p.tileIndex].group === group).length;
        return (
          <section key={group} className="deed-group" style={{ '--g': GROUP_HEX[group] } as React.CSSProperties}>
            <header className="deed-group-head">
              <span className="group-dot" />
              <span>{GROUP_LABEL[group]}</span>
              {setSize ? (
                ownedInGroup === setSize ? (
                  <span className="badge gold">Full set</span>
                ) : (
                  <span className="group-count tnum">
                    {ownedInGroup}/{setSize}
                  </span>
                )
              ) : null}
            </header>
            <ul>
              {list.map((p) => {
                const tile = BOARD_TILES[p.tileIndex];
                const buildable = tile.buildCost > 0;
                const standingHere = upgrade?.prop.tileIndex === p.tileIndex;
                const canSell = canManage && buildable && p.buildLevel > 0 && !p.isMortgaged;
                const canMortgage = canManage && p.buildLevel === 0 && !p.isMortgaged;
                const unmortgageCost = Math.floor((tile.price / 2) * 1.1);
                const canUnmortgage = canManage && p.isMortgaged && !liquidOnly;
                return (
                  <li key={p.tileIndex} className={`deed-row ${p.isMortgaged ? 'mortgaged' : ''} ${standingHere ? 'here' : ''}`}>
                    <div className="deed-main">
                      <span className="deed-name">
                        <span className="truncate">{tile.name}</span>
                        {p.forceBought && <Lock size={12} className="deed-lock" aria-label="Landmark locked (force-bought)" />}
                      </span>
                      <span className="deed-meta">
                        {p.isMortgaged ? (
                          <span className="badge red">Mortgaged</span>
                        ) : buildable ? (
                          <>
                            <LevelSteps level={p.buildLevel} />
                            <span>{LEVEL_NAMES[p.buildLevel]}</span>
                          </>
                        ) : (
                          <span>{tile.type === 'railroad' ? 'Railroad' : 'Utility'}</span>
                        )}
                        {!p.isMortgaged && <span className="deed-rent tnum">Rent {rentLabel(game, p)}</span>}
                      </span>
                    </div>
                    <div className="deed-actions">
                      {standingHere && upgrade && !liquidOnly && (
                        <button
                          className={`mini-btn ${upgrade.nextLevel === 4 ? 'gold' : 'blue'}`}
                          onClick={() => build(p.tileIndex)}
                          disabled={!upgrade.affordable}
                          title={`Upgrade to ${LEVEL_NAMES[upgrade.nextLevel]} for ${money(upgrade.cost)}`}
                        >
                          {upgrade.nextLevel === 4 ? <Castle size={14} /> : <ArrowUpCircle size={14} />}
                          <span className="tnum">{money(upgrade.cost)}</span>
                        </button>
                      )}
                      {canSell && (
                        <button className="mini-btn" onClick={() => sell(p.tileIndex)} title={`Sell one level for ${money(Math.floor(tile.buildCost / 2))}`}>
                          <Banknote size={14} />
                          <span className="tnum">+{money(Math.floor(tile.buildCost / 2))}</span>
                        </button>
                      )}
                      {canMortgage && (
                        <button className="mini-btn" onClick={() => mortgage(p.tileIndex, true)} title={`Mortgage for ${money(Math.floor(tile.price / 2))}`}>
                          <Landmark size={14} />
                          <span className="tnum">+{money(Math.floor(tile.price / 2))}</span>
                        </button>
                      )}
                      {canUnmortgage && (
                        <button
                          className="mini-btn"
                          onClick={() => mortgage(p.tileIndex, false)}
                          disabled={me.money < unmortgageCost}
                          title={`Pay off mortgage for ${money(unmortgageCost)}`}
                        >
                          <Undo2 size={14} />
                          <span className="tnum">{money(unmortgageCost)}</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
