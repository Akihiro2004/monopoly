import React from 'react';

export const Logo: React.FC<{ size?: 'lg' | 'sm' }> = ({ size = 'lg' }) => (
  <div className={`logo logo-${size}`}>
    <span className="logo-plate">TMpoly</span>
  </div>
);
