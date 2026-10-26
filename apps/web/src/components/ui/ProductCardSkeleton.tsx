import React from 'react';
import { Coffee } from 'lucide-react';

export interface ProductCardSkeletonItemProps {
  className?: string;
}

export const ProductCardSkeletonItem: React.FC<ProductCardSkeletonItemProps> = ({
  className = '',
}) => {
  return (
    <div
      data-testid="product-card-skeleton-item"
      className={`relative flex flex-col justify-between rounded-[16px] border border-[#EAE6F0] bg-white shadow-[0_4px_20px_-2px_rgba(36,33,38,0.06),0_2px_6px_-1px_rgba(36,33,38,0.04)] overflow-hidden min-h-[380px] sm:min-h-[400px] ${className}`}
    >
      <div>
        {/* Full-width Image Header Placeholder with Shimmer */}
        <div className="relative h-48 sm:h-52 w-full bg-slate-200/80 animate-shimmer overflow-hidden">
          {/* Category Pill Placeholder */}
          <div className="absolute top-3 left-3 h-5 w-16 rounded-full bg-white/80 shadow-xs" />
          {/* Heart Button Placeholder */}
          <div className="absolute top-3 right-3 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/80 shadow-xs" />
          {/* Stock availability badge placeholder */}
          <div className="absolute bottom-3 left-3 h-4 w-14 rounded-full bg-slate-300/60" />
        </div>

        {/* Product Details Skeleton */}
        <div className="px-4 pt-4 sm:px-5 sm:pt-4 text-left space-y-2.5">
          {/* Title Placeholder */}
          <div className="h-5 w-3/4 rounded-md bg-slate-200/90 animate-shimmer" />
          {/* Description line 1 */}
          <div className="h-3.5 w-full rounded bg-slate-100 animate-shimmer" />
          {/* Description line 2 */}
          <div className="h-3.5 w-4/5 rounded bg-slate-100 animate-shimmer" />
        </div>
      </div>

      {/* Card Footer Skeleton */}
      <div className="p-4 sm:p-5 pt-2 sm:pt-3 text-left space-y-3.5">
        {/* Price Placeholder */}
        <div className="h-6 w-24 rounded-md bg-slate-200/90 animate-shimmer" />
        {/* Full-width pill-shaped button placeholder */}
        <div className="h-10 w-full rounded-full bg-slate-200/90 animate-shimmer" />
      </div>

      {/* Centered Loading State at the exact center of each item */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur-md px-4 py-3 shadow-md border border-[#EAE6F0]/80">
          <Coffee className="h-6 w-6 text-[#58259A] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#716B80]">
            Loading
          </span>
        </div>
      </div>
    </div>
  );
};

export const PromotionalSidebarSkeleton: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      data-testid="promotional-sidebar-skeleton"
      className={`rounded-[16px] bg-white border border-[#EAE6F0] p-6 shadow-sm min-h-[460px] animate-shimmer flex flex-col justify-between ${className}`}
    >
      <div className="space-y-4">
        <div className="h-6 w-28 rounded-full bg-slate-200" />
        <div className="h-7 w-3/4 rounded-md bg-slate-200" />
        <div className="space-y-2 pt-2">
          <div className="h-3.5 w-full rounded bg-slate-100" />
          <div className="h-3.5 w-5/6 rounded bg-slate-100" />
          <div className="h-3.5 w-4/6 rounded bg-slate-100" />
        </div>
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="h-3 w-20 rounded bg-slate-100" />
          <div className="h-4 w-36 rounded bg-slate-200" />
        </div>
      </div>
      <div className="h-10 w-full rounded-full bg-slate-200" />
    </div>
  );
};

export interface ProductCardSkeletonProps {
  count?: number;
  className?: string;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({
  count = 8,
  className = 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3',
}) => {
  return (
    <div
      data-testid="product-card-skeletons"
      className={className}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeletonItem key={idx} />
      ))}
    </div>
  );
};
