import React from 'react';
import { TokenType } from '@monopoly/shared';
import { TOKENS } from '../lobbyConstants.js';
import { playerHex } from '../theme.js';

interface PlayerAvatarProps {
  token: TokenType;
  color: string;
  size?: number;
  ring?: boolean;
  dim?: boolean;
  online?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ token, color, size = 40, ring, dim, online }) => {
  const tokenObj = TOKENS.find((t) => t.type === token);
  const Icon = tokenObj?.icon;
  return (
    <span
      className={`avatar ${ring ? 'ring' : ''} ${dim ? 'dim' : ''}`}
      style={{ '--c': playerHex(color), width: size, height: size } as React.CSSProperties}
    >
      {Icon && <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />}
      {online !== undefined && <span className={`status-dot ${online ? 'online' : ''}`} />}
    </span>
  );
};
