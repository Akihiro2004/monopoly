import React from 'react';

// Sunny sky with drifting clouds and rolling hills: the menu backdrop.
export const Sky: React.FC = () => (
  <div className="sky" aria-hidden="true">
    <span className="sun" />
    <span className="cloud c1" />
    <span className="cloud c2" />
    <span className="cloud c3" />
    <span className="cloud c4" />
    <span className="hill h1" />
    <span className="hill h2" />
  </div>
);

export const Logo: React.FC<{ size?: 'lg' | 'sm' }> = ({ size = 'lg' }) => (
  <div className={`logo logo-${size}`}>
    <span className="logo-plate">TMpoly</span>
  </div>
);
