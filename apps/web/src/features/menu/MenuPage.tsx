import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Coffee,
  RefreshCw,
  X,
  ArrowRight,
  Sparkles,
  Zap,
  Milk,
  Snowflake,
  Leaf,
  Croissant,
  LayoutGrid,
} from 'lucide-react';
import { Product, Category, PaginatedResult } from '../../types/api';
import { apiRequest } from '../../lib/api-client';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { ProductCard } from '../../components/ui/ProductCard';
import {
  ProductCardSkeleton,
  PromotionalSidebarSkeleton,
} from '../../components/ui/ProductCardSkeleton';
import { Pagination } from '../../components/ui/Pagination';
import { HeroCarousel } from './HeroCarousel';

const CATEGORY_ITEMS = [
  { id: 'all', label: 'All', icon: Coffee, slug: 'all' },
  { id: 'espresso', label: 'Espresso', icon: Zap, slug: 'hot-coffee' },
  { id: 'latte', label: 'Latte', icon: Milk, slug: 'hot-coffee' },
  { id: 'cappuccino', label: 'Cappuccino', icon: Sparkles, slug: 'hot-coffee' },
  { id: 'iced-coffee', label: 'Iced Coffee', icon: Snowflake, slug: 'cold-brew' },
  { id: 'tea', label: 'Tea', icon: Leaf, slug: 'tea' },
  { id: 'pastries', label: 'Pastries', icon: Croissant, slug: 'pastries' },
  { id: 'view-all', label: 'View All', icon: LayoutGrid, slug: 'all' },
] as const;

export const MenuPage: React.FC = () => {
  const { addItem, items: cartItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const categoryItems = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return CATEGORY_ITEMS;
    const categoryIcons = [Coffee, Zap, Milk, Snowflake, Leaf, Croissant];
    return [
      { id: 'all', label: 'All', icon: Coffee, slug: 'all' },
      ...categories.map((category, index) => ({
        id: category.id,
        label: category.name,
        icon: categoryIcons[index % categoryIcons.length],
        slug: category.slug,
      })),
    ];
  }, [categories]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);
  const menuGridRef = useRef<HTMLDivElement>(null);

  const fetchMenuData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        apiRequest<PaginatedResult<Product>>('/products?limit=50'),
        apiRequest<Category[]>('/categories'),
      ]);

      if (prodRes.status === 'fulfilled') {
        const prodData = prodRes.value?.data;
        setProducts(Array.isArray(prodData) ? prodData : []);
      } else {
        throw new Error(prodRes.reason?.message || 'Failed to load products');
      }

      if (catRes.status === 'fulfilled') {
        const catData = catRes.value;
        setCategories(Array.isArray(catData) ? catData : []);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to connect to the coffee shop menu service',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  // Reset to first page when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const handleAddToCart = (product: Product) => {
    addItem(product, 1);
    setAddedProductId(product.id);
    setTimeout(() => {
      setAddedProductId((current) => (current === product.id ? null : current));
    }, 1200);
  };

  const handleToggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  const filteredProducts = useMemo(() => {
    return safeProducts.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        p.category?.slug === selectedCategory ||
        p.category?.name?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [safeProducts, selectedCategory, searchQuery]);

  // Derived pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (
      menuGridRef.current &&
      typeof window !== 'undefined' &&
      typeof window.scrollTo === 'function'
    ) {
      try {
        const yOffset = -70;
        const y = menuGridRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } catch {
        // Safe fallback in headless / test environments
      }
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const scrollToMenu = () => {
    if (menuGridRef.current) {
      menuGridRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#191525] antialiased pb-16">
      {/* 1. Hero Section: Full-Width Atmospheric Carousel extending to the left and right end of the screen */}
      <HeroCarousel onExploreClick={scrollToMenu} />

      {/* 2. Main Storefront & Product Catalogue */}
      <main
        id="menu-catalog"
        ref={menuGridRef}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4"
      >
        {/* Section Introduction */}
        <div className="mb-6 text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#191525] tracking-tight">
            Find your next favorite.
          </h2>
          <p className="mt-1 text-sm text-[#716B80]">
            From expressive espresso to slow-brewed coffee and something fresh from the oven.
          </p>
        </div>

        {/* Search & Filter Command Bar */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-card-subtle border border-[#EAE6F0] mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="h-4.5 w-4.5 text-[#8C829E]" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Search coffee, drinks, and pastries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-[#EAE6F0] bg-[#FAF9FC] pl-10 pr-9 py-2.5 text-xs text-[#191525] placeholder:text-[#8C829E] focus:border-[#7138E8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7138E8]/20 transition-all"
              />
              {searchQuery && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="p-1 rounded-full text-[#8C829E] hover:text-[#7138E8] hover:bg-[#F3EEFC] transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Total Items Metadata */}
            <div className="text-xs text-[#716B80] font-medium self-end sm:self-center">
              Total items:{' '}
              <span className="font-bold text-[#191525]">{filteredProducts.length}</span>
            </div>
          </div>

          {/* Horizontal Scrollable Category Bar with Preview Thumbnails & Text Labels */}
          <div
            className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none"
            role="tablist"
            aria-label="Coffee Categories"
          >
            {categoryItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                selectedCategory === item.slug ||
                (item.slug === 'all' && (selectedCategory === 'all' || selectedCategory === ''));
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCategory(item.slug)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                    isActive
                      ? 'bg-[#7138E8] text-white border-[#7138E8] shadow-xs'
                      : 'bg-white border-[#EAE6F0] text-[#716B80] hover:text-[#242126] hover:bg-[#FAF9FC] hover:border-[#7138E8]/40'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-[#7138E8]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Heading: Popular Today with See More link */}
        <div className="flex items-center justify-between mb-6 text-left">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#242126] tracking-tight">
              Popular Today
            </h2>
            <p className="text-xs text-[#716B80] mt-0.5">
              Handcrafted specialty coffees and freshly baked morning pairings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#58259A] hover:text-[#481E7F] transition-colors cursor-pointer"
          >
            <span>See More</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mb-8">
            <Alert variant="error" title="Menu Service Notice">
              <div className="flex items-center justify-between gap-4">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchMenuData}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Retry
                </Button>
              </div>
            </Alert>
          </div>
        )}

        {/* Loading Skeletons matching exact catalogue grid dimensions */}
        {isLoading && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-9">
                <ProductCardSkeleton count={pageSize} />
              </div>
              <div className="hidden lg:block lg:col-span-3">
                <PromotionalSidebarSkeleton />
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAE6F0] bg-white p-12 text-center shadow-card-subtle">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1EBFC] text-[#58259A] mb-4">
              <Coffee className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#191525] mb-1">No products found</h3>
            <p className="text-sm text-[#716B80] max-w-sm mb-6">
              We couldn&apos;t find any items matching your selected category or search filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Product Cards Grid Alongside Styled Promotional Sidebar Tile */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Product Cards Grid: Responsive columns */}
              <div className="lg:col-span-9">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {paginatedProducts.map((product) => {
                    const cartItem = cartItems.find((ci) => ci.product.id === product.id);
                    const inCartQty = cartItem ? cartItem.quantity : 0;
                    const isJustAdded = addedProductId === product.id;

                    return (
                      <div key={product.id} className="animate-fadeIn">
                        <ProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          inCartQuantity={inCartQty}
                          isJustAdded={isJustAdded}
                          isFavorite={favorites.has(product.id)}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Styled Promotional Sidebar Tile: Coffee Brings People Together */}
              <div className="hidden lg:block lg:col-span-3">
                <div className="sticky top-28 rounded-[16px] bg-gradient-to-br from-[#240C38] via-[#351252] to-[#1E0B30] text-white p-6 shadow-md border border-[#58259A]/30 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
                  {/* Subtle ambient lighting inside card */}
                  <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#58259A]/40 blur-2xl" />
                  <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#E7C8A0]/15 blur-xl" />

                  <div className="relative z-10 space-y-4 text-left">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#E7C8A0] border border-white/10 shadow-xs">
                      <Sparkles className="h-3.5 w-3.5 text-[#E7C8A0]" />
                      <span>Community Blend</span>
                    </div>

                    <h3 className="text-xl font-black text-white leading-snug">
                      Coffee Brings People Together.
                    </h3>

                    <p className="text-xs text-slate-200 leading-relaxed">
                      Order for your team or family gathering. Enjoy 15% off any 4 handcrafted drinks with code <span className="font-bold text-[#E7C8A0]">BUNA15</span>.
                    </p>

                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[10px] uppercase font-bold text-[#D8C7EC] tracking-wider block">
                        Today&apos;s Feature
                      </span>
                      <span className="text-sm font-bold text-white block mt-0.5">
                        Yirgacheffe Honey Geisha
                      </span>
                      <span className="text-[11px] text-[#E7C8A0] font-medium block mt-0.5">
                        Notes of jasmine blossom &amp; wild peach
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        if (menuGridRef.current) {
                          menuGridRef.current.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#E7C8A0] hover:bg-[#DFC096] active:bg-[#C9A97D] text-[#240C38] font-bold px-4 py-2.5 text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02]"
                    >
                      <span>Explore Collection</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination Controls */}
            {filteredProducts.length > 0 && (
              <div className="border-t border-[#EAE6F0] pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredProducts.length}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[8, 12, 24]}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
