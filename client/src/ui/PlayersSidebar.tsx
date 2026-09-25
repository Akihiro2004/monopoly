import React from 'react';
import { PlayerState } from '@monopoly/shared';

interface PlayersSidebarProps {
  players: PlayerState[];
  currentPlayerIndex: number;
  myPlayerId: string;
}

export const PlayersSidebar: React.FC<PlayersSidebarProps> = ({
  players,
  currentPlayerIndex,
  myPlayerId,
}) => {
  return (
    <div className="players-hud">
      {players.map((p, idx) => {
        const isTurn = idx === currentPlayerIndex;
        const isMe = p.playerId === myPlayerId;

        return (
          <div
            key={p.playerId}
            className={`player-badge ${isTurn ? 'active-turn' : ''} ${p.isBankrupt ? 'bankrupt' : ''}`}
            style={{ borderLeftColor: p.color }}
          >
            <div className="p-header">
              <span className="p-name">
                {p.name} {isMe && '(You)'}
              </span>
              <span className="p-money">${p.money}</span>
            </div>
            <div className="p-details">
              {p.inJail && <span className="jail-badge">IN JAIL</span>}
              {p.isBankrupt && <span className="bankrupt-badge">BANKRUPT</span>}
              <span className="pos-badge">Tile #{p.position}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
