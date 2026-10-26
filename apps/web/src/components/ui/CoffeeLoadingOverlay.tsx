import React from 'react';
import { CoffeeLoadingAnimation } from './CoffeeLoadingAnimation';

export interface CoffeeLoadingOverlayProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
  className?: string;
}

export const CoffeeLoadingOverlay: React.FC<CoffeeLoadingOverlayProps> = ({
  message = 'Loading...',
  subtext,
  fullScreen = true,
  className = '',
}) => {
  const content = (
    <div
      data-testid="coffee-loading-overlay"
      className={`flex flex-col items-center justify-center text-center p-6 select-none bg-white ${className}`}
    >
      {/* Primary Color Coffee Cup Animation with White Interior */}
      <div className="mb-4">
        <CoffeeLoadingAnimation size="md" />
      </div>

      {/* Main Standard Label Directly Beneath the Cup: "Loading..." */}
      <div className="flex flex-col items-center">
        <p className="text-base sm:text-lg font-bold text-[#7138E8] tracking-widest uppercase flex items-center justify-center">
          <span>Loading</span>
          <span className="inline-flex ml-0.5 tracking-normal">
            <span className="animate-pulse" style={{ animationDuration: '1.2s', animationDelay: '0ms' }}>.</span>
            <span className="animate-pulse" style={{ animationDuration: '1.2s', animationDelay: '250ms' }}>.</span>
            <span className="animate-pulse" style={{ animationDuration: '1.2s', animationDelay: '500ms' }}>.</span>
          </span>
        </p>

        {/* Supporting context label if provided */}
        {message && message !== 'Loading...' && (
          <p className="text-xs text-[#777183] font-medium mt-1.5 animate-fadeIn">
            {message}
          </p>
        )}

        {/* Screen-reader / Accessible Information */}
        {subtext && <span className="sr-only">{subtext}</span>}
        <span className="sr-only">Akufada Coffee Artisans</span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        data-testid="coffee-loading-fullscreen"
        className="fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-200"
      >
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center bg-white p-6">
      {content}
    </div>
  );
};
