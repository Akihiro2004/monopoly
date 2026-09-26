import React from 'react';
import { BOARD_TILES, COLOR_GROUPS, GameState, PlayerState, TileGroup } from '@monopoly/shared';
import { KeyRound, Lightbulb, Lock, Plane, WifiOff } from 'lucide-react';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { GROUP_HEX, GROUP_LABEL, GROUP_ORDER, money, netWorth, ownedBy, playerHex } from '../theme.js';
import { LowCashAlert, cashTier } from './LowCashAlert.js';
import { useMoneyDelta } from './useMoneyDelta.js';

interface PlayersProps {
  game: GameState;
  myPlayerId: string;
}

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

function ranks(game: GameState): Map<string, number> {
  const sorted = [...game.players]
    .filter((p) => !p.isBankrupt)
    .sort((a, b) => netWorth(game, b) - netWorth(game, a));
  return new Map(sorted.map((p, i) => [p.playerId, i]));
}

const Deltas: React.FC<{ value: number }> = ({ value }) => {
  const deltas = useMoneyDelta(value);
  return (
    <span className="money-deltas" aria-hidden="true">
      {deltas.map((d) => (
        <span key={d.id} className={`money-delta ${d.amount > 0 ? 'up' : 'down'}`}>
          {d.amount > 0 ? '+' : '-'}
          {money(Math.abs(d.amount))}
        </span>
      ))}
    </span>
  );
};

const PlayerCard: React.FC<{ game: GameState; player: PlayerState; active: boolean; isMe: boolean; rank?: number }> = ({
  game,
  player: p,
  active,
  isMe,
  rank
}) => {
  const deeds = ownedBy(game, p.playerId);
  const tier = p.isBankrupt ? 0 : cashTier(p.money);
  return (
    <li
      className={`pcard ${active ? 'active' : ''} ${p.isBankrupt ? 'bankrupt' : ''} ${isMe ? 'me' : ''}`}
      style={{ '--c': playerHex(p.color) } as React.CSSProperties}
    >
      {active && <span className="pcard-ribbon">Playing</span>}
      <div className="pcard-top">
        <PlayerAvatar token={p.tokenType} color={p.color} size={44} dim={p.isBankrupt} online={p.isConnected} />
        <div className="pcard-body">
          <span className="pcard-name">
            <span className="truncate">{p.name}</span>
            {isMe && <span className="badge">You</span>}
          </span>
          <span className={`pcard-money money tnum cash-t${tier}`}>{p.isBankrupt ? (p.surrendered ? 'Surrendered' : 'Bankrupt') : money(p.money)}</span>
          <Deltas value={p.money} />
        </div>
        {rank !== undefined && !p.isBankrupt && <span className={`pcard-rank r${rank}`}>{ORDINAL[rank]}</span>}
      </div>
      {(deeds.length > 0 || p.inJail || !p.isConnected || p.jailCards > 0) && (
        <div className="pcard-bottom">
          <GroupChips game={game} playerId={p.playerId} />
          {p.inJail && (
            <span className="badge red">
              <Lock size={10} /> Jail
            </span>
          )}
          {p.jailCards > 0 && (
            <span className="badge blue" title="Get Out of Jail Free">
              <KeyRound size={10} />x{p.jailCards}
            </span>
          )}
          {!p.isConnected && (
            <span className="badge">
              <WifiOff size={10} />
            </span>
          )}
        </div>
      )}
      {isMe && !p.isBankrupt && <LowCashAlert amount={p.money} className="beside-card" />}
    </li>
  );
};

// One chip per country / airports / utilities owned, with the count (a gold
// ring marks a full set). Stays one short line even with 20+ deeds.
const GroupChips: React.FC<{ game: GameState; playerId: string }> = ({ game, playerId }) => {
  const counts = new Map<TileGroup, number>();
  for (const d of ownedBy(game, playerId)) {
    const g = BOARD_TILES[d.tileIndex].group;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const setSize = (g: TileGroup) => COLOR_GROUPS[g]?.length ?? (g === 'railroad' ? 4 : g === 'utility' ? 2 : 0);
  return (
    <span className="gchips">
      {GROUP_ORDER.filter((g) => counts.has(g)).map((g) => {
        const n = counts.get(g)!;
        const full = n === setSize(g);
        return (
          <span
            key={g}
            className={`gchip ${full ? 'full' : ''} ${g === 'railroad' || g === 'utility' ? 'neutral' : ''}`}
            style={{ '--g': GROUP_HEX[g] } as React.CSSProperties}
            title={`${GROUP_LABEL[g]}: ${n}/${setSize(g)}${full ? ' (full set)' : ''}`}
          >
            {g === 'railroad' && <Plane size={9} />}
            {g === 'utility' && <Lightbulb size={9} />}
            {n}
          </span>
        );
      })}
    </span>
  );
};

// Desktop: floating player cards (no panel behind them).
export const PlayerList: React.FC<PlayersProps> = ({ game, myPlayerId }) => {
  const r = ranks(game);
  const n = game.players.length;
  return (
    <ul className={`pcard-list ${n >= 5 ? 'dense' : n === 4 ? 'compact' : ''}`}>
      {game.players.map((p, idx) => (
        <PlayerCard
          key={p.playerId}
          game={game}
          player={p}
          active={idx === game.currentPlayerIndex}
          isMe={p.playerId === myPlayerId}
          rank={game.players.length > 1 ? r.get(p.playerId) : undefined}
        />
      ))}
    </ul>
  );
};

const StripChip: React.FC<{ p: PlayerState; active: boolean; isMe: boolean }> = ({ p, active, isMe }) => (
  <div
    className={`strip-chip ${active ? 'active' : ''} ${p.isBankrupt ? 'bankrupt' : ''}`}
    style={{ '--c': playerHex(p.color) } as React.CSSProperties}
  >
    <PlayerAvatar token={p.tokenType} color={p.color} size={24} dim={p.isBankrupt} />
    <span className="strip-text">
      <span className="strip-name truncate">{isMe ? 'You' : p.name}</span>
      <span className={`strip-money tnum cash-t${p.isBankrupt ? 0 : cashTier(p.money)}`}>{p.isBankrupt ? 'Out' : money(p.money)}</span>
    </span>
    {p.inJail && <Lock size={11} className="strip-jail" />}
    <Deltas value={p.money} />
  </div>
);

// Mobile: compact horizontal strip.
export const PlayerStrip: React.FC<PlayersProps> = ({ game, myPlayerId }) => (
  <div className={`player-strip n${game.players.length}`}>
    {game.players.map((p, idx) => (
      <StripChip key={p.playerId} p={p} active={idx === game.currentPlayerIndex} isMe={p.playerId === myPlayerId} />
    ))}
  </div>
);
