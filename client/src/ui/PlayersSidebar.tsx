import React from 'react';
import { PlayerState } from '@monopoly/shared';
import { TOKENS } from './lobbyConstants.js';

interface PlayersSidebarProps {
  players: PlayerState[];
  currentPlayerIndex: number;
  myPlayerId: string;
}

// One corner banner: solid player-color plate with token + money (screenshot style)
const PlayerBanner: React.FC<{
  player: PlayerState;
  active: boolean;
  side: 'left' | 'right';
  myPlayerId: string;
}> = ({ player, active, side, myPlayerId }) => {
  const tokenObj = TOKENS.find((t) => t.type === player.tokenType);
  const isMe = player.playerId === myPlayerId;

  return (
    <div
      className={`player-banner banner-${side} ${active ? 'active' : ''} ${player.isBankrupt ? 'bankrupt' : ''}`}
      style={{ backgroundColor: player.color }}
    >
      <div className="banner-token">
        {tokenObj ? <tokenObj.icon size={30} color="#ffffff" /> : null}
      </div>
      <div className="banner-info">
        <span className="banner-name">
          {player.name}
          {isMe ? ' (You)' : ''}
          {active ? ' - PLAYING' : ''}
        </span>
        <span className="banner-money">${player.money}</span>
      </div>
      {player.inJail && <span className="banner-flag">JAIL</span>}
    </div>
  );
};

export const PlayersSidebar: React.FC<PlayersSidebarProps> = ({
  players,
  currentPlayerIndex,
  myPlayerId,
}) => {
  // Split players into left/right corner columns (like the screenshot corners)
  const half = Math.ceil(players.length / 2);
  const leftCol = players.slice(0, half);
  const rightCol = players.slice(half);

  return (
    <>
      <div className="players-col players-col-left">
        {leftCol.map((p) => {
          const idx = players.indexOf(p);
          return (
            <PlayerBanner
              key={p.playerId}
              player={p}
              active={idx === currentPlayerIndex}
              side="left"
              myPlayerId={myPlayerId}
            />
          );
        })}
      </div>
      <div className="players-col players-col-right">
        {rightCol.map((p) => {
          const idx = players.indexOf(p);
          return (
            <PlayerBanner
              key={p.playerId}
              player={p}
              active={idx === currentPlayerIndex}
              side="right"
              myPlayerId={myPlayerId}
            />
          );
        })}
      </div>
    </>
  );
};

