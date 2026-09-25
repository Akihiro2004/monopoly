import React from 'react';
import { BOARD_TILES, GameState } from '@monopoly/shared';
import { Crown, Lock, WifiOff } from 'lucide-react';
import { PlayerAvatar } from '../common/PlayerAvatar.js';
import { GROUP_HEX, money, netWorth, ownedBy, playerHex } from '../theme.js';

interface PlayersProps {
  game: GameState;
  myPlayerId: string;
}

// Desktop rail: one card per player, turn order, with a mini deed strip.
export const PlayerList: React.FC<PlayersProps> = ({ game, myPlayerId }) => {
  const leader = [...game.players].filter((p) => !p.isBankrupt).sort((a, b) => netWorth(game, b) - netWorth(game, a))[0];

  return (
    <ul className="player-list">
      {game.players.map((p, idx) => {
        const active = idx === game.currentPlayerIndex;
        const isMe = p.playerId === myPlayerId;
        const deeds = ownedBy(game, p.playerId).sort((a, b) => a.tileIndex - b.tileIndex);
        return (
          <li
            key={p.playerId}
            className={`player-card ${active ? 'active' : ''} ${p.isBankrupt ? 'bankrupt' : ''} ${isMe ? 'me' : ''}`}
            style={{ '--c': playerHex(p.color) } as React.CSSProperties}
          >
            <div className="player-card-top">
              <PlayerAvatar token={p.tokenType} color={p.color} size={38} ring={active} dim={p.isBankrupt} />
              <div className="player-card-id">
                <span className="player-name">
                  <span className="truncate">{p.name}</span>
                  {isMe && <span className="badge">You</span>}
                  {leader?.playerId === p.playerId && game.players.length > 1 && (
                    <Crown size={13} className="leader-crown" aria-label="Leader" />
                  )}
                </span>
                <span className="player-sub">
                  {p.isBankrupt ? (
                    'Bankrupt'
                  ) : active ? (
                    <span className="playing-label">Playing</span>
                  ) : (
                    `Worth ${money(netWorth(game, p))}`
                  )}
                </span>
              </div>
              <span className="player-money tnum">{money(p.money)}</span>
            </div>
            {(deeds.length > 0 || p.inJail || !p.isConnected || p.jailCards > 0) && (
              <div className="player-card-bottom">
                <span className="deed-strip">
                  {deeds.map((d) => (
                    <span
                      key={d.tileIndex}
                      className={`deed-pip ${d.isMortgaged ? 'mortgaged' : ''}`}
                      style={{ background: GROUP_HEX[BOARD_TILES[d.tileIndex].group] }}
                      title={BOARD_TILES[d.tileIndex].name}
                    />
                  ))}
                </span>
                {p.inJail && (
                  <span className="badge red">
                    <Lock size={10} /> Jail
                  </span>
                )}
                {p.jailCards > 0 && <span className="badge blue">Free x{p.jailCards}</span>}
                {!p.isConnected && (
                  <span className="badge">
                    <WifiOff size={10} /> Away
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

// Mobile: compact horizontal strip under the status bar.
export const PlayerStrip: React.FC<PlayersProps> = ({ game, myPlayerId }) => (
  <div className="player-strip">
    {game.players.map((p, idx) => {
      const active = idx === game.currentPlayerIndex;
      return (
        <div
          key={p.playerId}
          className={`strip-chip ${active ? 'active' : ''} ${p.isBankrupt ? 'bankrupt' : ''}`}
          style={{ '--c': playerHex(p.color) } as React.CSSProperties}
        >
          <PlayerAvatar token={p.tokenType} color={p.color} size={26} dim={p.isBankrupt} />
          <span className="strip-text">
            <span className="strip-name truncate">
              {p.playerId === myPlayerId ? 'You' : p.name}
            </span>
            <span className="strip-money tnum">{p.isBankrupt ? 'Out' : money(p.money)}</span>
          </span>
          {p.inJail && <Lock size={11} className="strip-jail" />}
        </div>
      );
    })}
  </div>
);
