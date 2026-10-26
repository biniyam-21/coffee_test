import React, { useState, useEffect } from 'react';
import { Coffee, ImageOff } from 'lucide-react';

export interface OptimizedImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src'
> {
  src?: string | null;
  alt: string;
  containerClassName?: string;
  fallbackCategory?: string;
  fallbackIcon?: React.ReactNode;
  priority?: boolean;
}

/**
 * Automatically optimizes known image CDN URLs (like Unsplash) by appending
 * resolution limits, modern WebP compression, and crop parameters to prevent
 * downloading multi-megabyte raw photos.
 */
export function optimizeImageUrl(
  src: string | null | undefined,
  width = 600,
  quality = 80,
): string | undefined {
  if (!src) return undefined;
  try {
    if (src.includes('images.unsplash.com')) {
      const url = new URL(src);
      if (!url.searchParams.has('w')) {
        url.searchParams.set('w', String(width));
      }
      if (!url.searchParams.has('auto')) {
        url.searchParams.set('auto', 'format');
      }
      if (!url.searchParams.has('fit')) {
        url.searchParams.set('fit', 'crop');
      }
      if (!url.searchParams.has('q')) {
        url.searchParams.set('q', String(quality));
      }
      return url.toString();
    }
  } catch {
    // If invalid URL or relative path, return src as-is
  }
  return src;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  fallbackCategory,
  fallbackIcon,
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Reset loading and error state when source image changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const optimizedSrc = optimizeImageUrl(src);
  const shouldRenderImage = Boolean(optimizedSrc && !hasError);

  return (
    <div
      className={`relative overflow-hidden bg-slate-100/90 flex items-center justify-center select-none ${containerClassName}`}
      data-testid="optimized-image-container"
    >
      {/* Skeleton Loading State with Shimmer Effect */}
      {shouldRenderImage && !isLoaded && (
        <div
          data-testid="image-skeleton"
          className="absolute inset-0 z-10 flex items-center justify-center bg-slate-200/75 animate-shimmer"
        >
          <div className="flex flex-col items-center justify-center gap-1.5 opacity-60">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-xs border border-white/60 backdrop-blur-xs">
              <Coffee className="h-6 w-6 text-[#58259A] animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Render Image with Lazy Loading & Smooth Blur-to-Clear Transition */}
      {shouldRenderImage ? (
        <img
          src={optimizedSrc as string}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`h-full w-full object-cover transition-all duration-500 ease-out ${
            isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-[1.02] blur-sm'
          } ${className}`}
          {...props}
        />
      ) : (
        /* Fallback when image fails to load or no URL provided */
        <div
          data-testid="image-fallback"
          className="flex flex-col items-center justify-center p-4 text-center text-slate-400"
        >
          {fallbackIcon ? (
            fallbackIcon
          ) : hasError ? (
            <ImageOff className="h-10 w-10 text-slate-300 mb-1" />
          ) : (
            <Coffee className="h-10 w-10 text-brand-300 mb-1" />
          )}
          {fallbackCategory && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-1">
              {fallbackCategory}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
