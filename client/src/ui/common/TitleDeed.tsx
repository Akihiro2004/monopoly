import React from 'react';
import { BOARD_TILES } from '@monopoly/shared';
import { Plane, Lightbulb } from 'lucide-react';
import { COUNTRY_NAMES } from '@monopoly/shared';
import { Flag } from './Flag.js';
import { GROUP_HEX, money, rentSchedule } from '../theme.js';

// Paper-style title deed card.
export const TitleDeed: React.FC<{ tileIndex: number; highlightLevel?: number }> = ({ tileIndex, highlightLevel }) => {
  const tile = BOARD_TILES[tileIndex];
  if (!tile) return null;
  const isProperty = tile.type === 'property';
  const rows = rentSchedule(tileIndex);

  return (
    <div className={`title-deed ${isProperty ? '' : 'plain'}`} style={{ '--g': GROUP_HEX[tile.group] } as React.CSSProperties}>
      <div className="title-deed-head">
        {tile.type === 'railroad' && <Plane size={26} />}
        {tile.type === 'utility' && <Lightbulb size={26} />}
        {tile.country && <Flag country={tile.country} size={34} className="deed-flag" />}
        <small>{tile.country ? COUNTRY_NAMES[tile.country] : 'Title deed'}</small>
        <h3>{tile.name}</h3>
      </div>
      <dl className="title-deed-rows">
        {rows.map((r, i) => (
          <div key={r.label} className={`${i === 4 ? 'landmark' : ''} ${highlightLevel === i ? 'current' : ''}`}>
            <dt>{r.label}</dt>
            <dd className="tnum">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="title-deed-foot">
        {isProperty ? (
          <>
            <span>Each upgrade {money(tile.buildCost)}</span>
            <span>Full set doubles land rent</span>
          </>
        ) : (
          <span>Price {money(tile.price)}</span>
        )}
      </div>
    </div>
  );
};
