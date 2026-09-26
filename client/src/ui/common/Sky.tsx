import React from 'react';

// Sunny sky with drifting clouds and rolling hills: the menu backdrop.
// `town` adds a road with a little car cruising along it.
export const Sky: React.FC<{ town?: boolean }> = ({ town }) => (
  <div className="sky" aria-hidden="true">
    <span className="sun" />
    <span className="cloud c1" />
    <span className="cloud c2" />
    <span className="cloud c3" />
    <span className="cloud c4" />
    <span className="hill h1" />
    <span className="hill h2" />
    {town && (
      <div className="road">
        <span className="road-car">
          <span className="car-body" />
          <span className="car-wheel w1" />
          <span className="car-wheel w2" />
        </span>
      </div>
    )}
  </div>
);

export const Logo: React.FC<{ size?: 'lg' | 'sm' }> = ({ size = 'lg' }) => (
  <div className={`logo logo-${size}`}>
    <span className="logo-plate">TMpoly</span>
  </div>
);
