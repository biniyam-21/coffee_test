import React, { useState } from 'react';
import { Heart, ShoppingCart, Check } from 'lucide-react';
import { Product } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';
import { OptimizedImage } from './OptimizedImage';
import { ProductCardSkeletonItem } from './ProductCardSkeleton';

export interface ProductCardProps {
  product?: Product;
  isLoading?: boolean;
  className?: string;
  onAddToCart?: (product: Product) => void;
  inCartQuantity?: number;
  isJustAdded?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isLoading = false,
  className = '',
  onAddToCart,
  inCartQuantity = 0,
  isJustAdded = false,
  isFavorite: externalIsFavorite,
  onToggleFavorite,
}) => {
  const [internalFavorite, setInternalFavorite] = useState<boolean>(false);

  if (isLoading || !product) {
    return <ProductCardSkeletonItem className={className} />;
  }

  const isFavorited = externalIsFavorite !== undefined ? externalIsFavorite : internalFavorite;

  const inStock = Boolean(product.inventory && product.inventory.inStock && product.inventory.availableQuantity > 0);

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(product.id);
    } else {
      setInternalFavorite((prev) => !prev);
    }
  };

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className="group flex flex-col justify-between rounded-[16px] border border-[#EAE6F0] bg-white shadow-[0_4px_20px_-2px_rgba(36,33,38,0.06),0_2px_6px_-1px_rgba(36,33,38,0.04)] hover:shadow-[0_8px_30px_-4px_rgba(88,37,154,0.12),0_4px_12px_-2px_rgba(88,37,154,0.06)] hover:border-[#58259A]/30 transition-all duration-300 overflow-hidden"
    >
      <div>
        {/* Full-width Image Header with matching top border-radius */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-[#FAF9FC]">
          <OptimizedImage
            src={product.imageUrl}
            alt={product.name}
            fallbackCategory={product.category.name}
            containerClassName="h-full w-full"
            className="group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Category Label Pill */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <span className="rounded-full bg-white/95 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-[#242126] shadow-xs border border-[#EAE6F0]/80">
              {product.category.name}
            </span>
          </div>

          {/* Heart / Favorite Icon Button positioned in the top right corner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite();
            }}
            className={`absolute top-3 right-3 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-md shadow-xs border border-white/60 transition-all duration-200 active:scale-90 cursor-pointer ${
              isFavorited
                ? 'text-[#E11D48] hover:bg-white'
                : 'text-[#77717B] hover:text-[#E11D48] hover:bg-white'
            }`}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`h-4 w-4 transition-transform duration-200 ${
                isFavorited ? 'fill-[#E11D48] scale-110' : ''
              }`}
            />
          </button>

          {/* Stock Availability Pill Overlay */}
          {!inStock ? (
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
              <span className="rounded-full bg-[#C24141]/90 text-white backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
                Sold Out
              </span>
            </div>
          ) : (
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
              <span className="rounded-full bg-[#15803D]/90 text-white backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold shadow-xs">
                {product.inventory.availableQuantity} left
              </span>
            </div>
          )}
        </div>

        {/* Product Details Section */}
        <div className="px-4 pt-4 sm:px-5 sm:pt-4 text-left">
          {/* Product Name: Semibold dark charcoal text (#242126), medium sizing */}
          <h3 className="text-[15px] sm:text-base font-semibold text-[#242126] group-hover:text-[#58259A] transition-colors leading-snug line-clamp-1">
            {product.name}
          </h3>

          {/* Subtitle/Description: Muted secondary text (#77717B), regular weight, compact line height */}
          <p className="mt-1.5 text-xs text-[#77717B] font-normal leading-relaxed line-clamp-2 min-h-[32px]">
            {product.description ||
              'Artisan handcrafted coffee prepared with premium roasted beans.'}
          </p>
        </div>
      </div>

      {/* Card Footer: Price & Full-Width Pill Action Button */}
      <div className="p-4 sm:p-5 pt-2 sm:pt-3 text-left">
        {/* Price: Bold deep purple (#58259A), prominent display */}
        <div className="mb-3.5">
          <span className="text-lg sm:text-xl font-bold text-[#58259A] tracking-tight block">
            {formatCurrency(product.basePriceCents)}
          </span>
        </div>

        {/* Action Button: Full-width pill-shaped button using the primary purple theme (#58259A) */}
        <button
          type="button"
          disabled={!inStock}
          onClick={() => onAddToCart?.(product)}
          className={`w-full rounded-full py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            isJustAdded
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : !inStock
              ? 'bg-slate-200 text-slate-500 shadow-none'
              : 'bg-[#58259A] hover:bg-[#481E7F] active:bg-[#381664] text-white hover:shadow-md hover:shadow-[#58259A]/20'
          }`}
        >
          {isJustAdded ? (
            <>
              <Check className="h-4 w-4 text-white" />
              <span>Added to Cart</span>
            </>
          ) : !inStock ? (
            <span>Sold Out</span>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 text-white" />
              <span>
                {inCartQuantity > 0 ? `Add More (${inCartQuantity})` : 'Add to Cart'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
