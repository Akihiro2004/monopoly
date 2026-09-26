import React from 'react';
import { GROUP_COUNTRY, COUNTRY_NAMES } from '@monopoly/shared';

// Round country flag (circle-flags, MIT) for a country code or color group.
export const Flag: React.FC<{ country?: string; group?: string; size?: number; className?: string }> = ({
  country,
  group,
  size = 18,
  className = ''
}) => {
  const code = country ?? (group ? GROUP_COUNTRY[group] : undefined);
  if (!code) return null;
  return (
    <img
      className={`flag ${className}`}
      src={`/icons/flags/${code}.svg`}
      width={size}
      height={size}
      alt={COUNTRY_NAMES[code] ?? code}
      draggable={false}
    />
  );
};
