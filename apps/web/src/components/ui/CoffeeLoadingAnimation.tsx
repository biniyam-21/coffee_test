import React from 'react';

export interface CoffeeLoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CoffeeLoadingAnimation: React.FC<CoffeeLoadingAnimationProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-36 h-36',
  };

  return (
    <div
      data-testid="coffee-loading-animation"
      className={`relative flex items-center justify-center select-none ${sizeMap[size]} ${className}`}
    >
      {/* Clean Vector SVG Coffee Cup: Primary Color Body with Pure White Interior */}
      <svg
        viewBox="0 0 160 160"
        className="relative z-10 w-full h-full animate-coffeeFloat overflow-visible"
        aria-label="Animated Ethiopian Coffee Loading"
      >
        <defs>
          {/* Subtle Primary Purple Steam Gradient */}
          <linearGradient id="primarySteam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#7138E8" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#9D4EDD" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7138E8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. Animated Steam Wave Trails in Primary Accent */}
        <g pointerEvents="none">
          {/* Steam Trail 1 (Left) */}
          <path
            d="M 66 54 C 60 42 72 32 65 20 C 60 14 66 8 62 2"
            fill="none"
            stroke="url(#primarySteam)"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-steam-1"
          />
          {/* Steam Trail 2 (Center) */}
          <path
            d="M 80 50 C 87 36 75 26 82 14 C 87 8 80 3 82 0"
            fill="none"
            stroke="url(#primarySteam)"
            strokeWidth="3.2"
            strokeLinecap="round"
            className="animate-steam-2"
          />
          {/* Steam Trail 3 (Right) */}
          <path
            d="M 94 54 C 100 42 88 32 95 20 C 100 14 94 8 98 2"
            fill="none"
            stroke="url(#primarySteam)"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-steam-3"
          />
        </g>

        {/* 2. Soft Saucer Shadow */}
        <ellipse cx="80" cy="136" rx="46" ry="6" fill="#7138E8" opacity="0.1" filter="blur(2px)" />

        {/* 3. Saucer Base (Primary Color) */}
        <ellipse cx="80" cy="132" rx="52" ry="8.5" fill="#7138E8" />
        <ellipse cx="80" cy="131" rx="40" ry="6" fill="#7E47EF" />

        {/* 4. Ergonomic Cup Handle (Primary Color) */}
        <path
          d="M 112 75 C 130 75 134 105 110 109"
          fill="none"
          stroke="#7138E8"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* 5. Ceramic Cup Body (Primary Color #7138E8) */}
        <path
          d="M 43 68 L 49 114 C 51 122 61 127 80 127 C 99 127 109 122 111 114 L 117 68 Z"
          fill="#7138E8"
        />

        {/* 6. Cup Rim & Pure White Interior Surface */}
        <ellipse cx="80" cy="68" rx="37" ry="9.5" fill="#FFFFFF" stroke="#7138E8" strokeWidth="2.5" />
        <ellipse cx="80" cy="69" rx="33" ry="7.5" fill="#FFFFFF" />

        {/* 7. Subtle Delicate Latte Heart Outline Inside White Coffee Surface */}
        <path
          d="M 80 71 C 77 67 73 68 75 72 C 77 75 80 78 80 78 C 80 78 83 75 85 72 C 87 68 83 67 80 71 Z"
          fill="none"
          stroke="#7138E8"
          strokeWidth="1.2"
          opacity="0.35"
        />
      </svg>
    </div>
  );
};
