import React from 'react';
import { BOARD_TILES, GameState, TradeOffer, tradeMortgageFees } from '@monopoly/shared';
import { ArrowRight, Lock } from 'lucide-react';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { Flag } from '../common/Flag.js';
import { GROUP_HEX, LEVEL_NAMES, money } from '../theme.js';

export const DeedChip: React.FC<{
  tileIndex: number;
  selected?: boolean;
  disabled?: boolean;
  title?: string;
  mortgaged?: boolean;
  level?: number;
  onClick?: () => void;
}> = ({ tileIndex, selected, disabled, title, mortgaged, level = 0, onClick }) => {
  const tile = BOARD_TILES[tileIndex];
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`deed-chip ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${mortgaged ? 'mortgaged' : ''}`}
      style={{ '--g': GROUP_HEX[tile.group] } as React.CSSProperties}
      onClick={disabled ? undefined : onClick}
      disabled={onClick ? disabled : undefined}
      title={title ?? tile.name}
    >
      <span className="deed-chip-band" />
      {tile.country && <Flag country={tile.country} size={16} />}
      <span className="deed-chip-name truncate">{tile.name}</span>
      {level > 0 && (
        <span className={`deed-chip-lv ${level === 4 ? 'landmark' : ''}`} title={`${LEVEL_NAMES[level]} included`}>
          {LEVEL_NAMES[level]}
        </span>
      )}
      {mortgaged && <span className="deed-chip-m" title="Mortgaged">M</span>}
      {disabled ? <Lock size={12} /> : <span className="deed-chip-price tnum">{money(tile.price)}</span>}
    </Tag>
  );
};

// "Side" of a trade: what one player hands over.
export const TradeSide: React.FC<{ label: string; cash: number; props: number[]; game?: GameState }> = ({ label, cash, props, game }) => (
  <div className="trade-side">
    <span className="trade-side-label">{label}</span>
    {cash === 0 && props.length === 0 ? (
      <span className="trade-nothing">Nothing</span>
    ) : (
      <div className="trade-items">
        {cash > 0 && <span className="cash-chip tnum">{money(cash)}</span>}
        {props.map((i) => (
          <DeedChip key={i} tileIndex={i} mortgaged={game?.properties[i]?.isMortgaged} level={game?.properties[i]?.buildLevel} />
        ))}
      </div>
    )}
  </div>
);

export const TradeCard: React.FC<{
  game: GameState;
  trade: TradeOffer;
  myPlayerId: string;
  actions?: React.ReactNode;
}> = ({ game, trade, myPlayerId, actions }) => {
  const from = game.players.find((p) => p.playerId === trade.fromId);
  const to = game.players.find((p) => p.playerId === trade.toId);
  if (!from || !to) return null;
  const name = (id: string, n: string) => (id === myPlayerId ? 'You' : n);
  return (
    <div className="trade-card">
      <div className="trade-card-head">
        <PlayerAvatar token={from.tokenType} color={from.color} size={30} />
        <strong className="truncate">{name(from.playerId, from.name)}</strong>
        <ArrowRight size={16} />
        <PlayerAvatar token={to.tokenType} color={to.color} size={30} />
        <strong className="truncate">{name(to.playerId, to.name)}</strong>
      </div>
      <div className="trade-card-body">
        <TradeSide label={`${name(from.playerId, from.name)} give${from.playerId === myPlayerId ? '' : 's'}`} cash={trade.giveMoney} props={trade.giveProps} game={game} />
        <TradeSide label={`${name(to.playerId, to.name)} give${to.playerId === myPlayerId ? '' : 's'}`} cash={trade.getMoney} props={trade.getProps} game={game} />
      </div>
      {tradeMortgageFees(game, trade.giveProps) + tradeMortgageFees(game, trade.getProps) > 0 && (
        <p className="trade-fee-note">
          Includes mortgaged deeds: the receiver pays 10% interest to the Bank
          {tradeMortgageFees(game, trade.giveProps) > 0 &&
            ` (${name(to.playerId, to.name)}: ${money(tradeMortgageFees(game, trade.giveProps))})`}
          {tradeMortgageFees(game, trade.getProps) > 0 &&
            ` (${name(from.playerId, from.name)}: ${money(tradeMortgageFees(game, trade.getProps))})`}
          .
        </p>
      )}
      {actions && <div className="trade-card-actions">{actions}</div>}
    </div>
  );
};
