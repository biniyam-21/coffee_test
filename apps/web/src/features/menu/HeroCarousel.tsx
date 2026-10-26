import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import heroLatteImg from '../../assets/brew-bean-latte.jpg';

export interface HeroSlide {
  id: string;
  image: string;
  fallbackImage?: string;
  greeting: string;
  headline: string;
  subtitle: string;
  quote: string;
  originBadge: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    image: heroLatteImg,
    greeting: 'Good Morning 👋',
    headline: 'Your Daily Coffee, Made Better.',
    subtitle:
      'Artisan Ethiopian beans, slow-roasted daily in small batches, prepared with deliberate craftsmanship for an extraordinary cup.',
    quote:
      '“In every cup of Ethiopian coffee lies centuries of sacred heritage, volcanic highlands, and delicate floral aromas.”',
    originBadge: 'Yirgacheffe & Sidama Terroirs',
  },
  {
    id: 'slide-2',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1600&q=80',
    fallbackImage: heroLatteImg,
    greeting: 'Artisanal Pour-Over ✨',
    headline: 'Purity in Every Calculated Drop.',
    subtitle:
      'Calibrated water temperature and slow hand-drip extraction unlock radiant bergamot, apricot nectar, and raw honey.',
    quote:
      '“Deliberate flow rate and patience reveal layers of floral sweetness that define single-origin excellence.”',
    originBadge: 'Guji Hambela • Sun-Dried Natural',
  },
  {
    id: 'slide-3',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80',
    fallbackImage: heroLatteImg,
    greeting: 'Fresh Micro-Batch Roast 🔥',
    headline: 'Roasted to Honor the Bean’s Soul.',
    subtitle:
      'Disciplined micro-batches roasted every morning to capture peak caramelization without ever masking natural fruit character.',
    quote:
      '“Small-batch craft ensures the nuanced jasmine and chocolate notes reach your cup at their absolute peak.”',
    originBadge: 'Sidama Bensa • Honey Process',
  },
  {
    id: 'slide-4',
    image: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=1600&q=80',
    fallbackImage: heroLatteImg,
    greeting: 'Precision Barista Craft ☕',
    headline: 'The Ritual of Dense, Velvet Crema.',
    subtitle:
      'Nine bars of pressure, dialed in to the exact second. Rich espresso coating the palate with notes of dark cacao and warm spice.',
    quote:
      '“True espresso is culinary chemistry — dialed in every dawn for silky texture and lingering sweetness.”',
    originBadge: 'Harar Moka Reserve • Dry Process',
  },
  {
    id: 'slide-5',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
    fallbackImage: heroLatteImg,
    greeting: 'Mindful Gathering 🌿',
    headline: 'Coffee Brings People Together.',
    subtitle:
      'The Ethiopian Buna ritual reminds us that coffee is sacred community, unhurried conversation, and warmth shared with friends.',
    quote:
      '“Buna tetu is more than a beverage; it is an open door, a slower pulse, and heartfelt hospitality.”',
    originBadge: 'Kaffa Biosphere Reserve • Forest Heirloom',
  },
];

const AUTO_PLAY_INTERVAL = 5500; // 5.5s automated smooth cycling

export interface HeroCarouselProps {
  onExploreClick?: () => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onExploreClick }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Eagerly prefetch all carousel images into browser memory to eliminate auto-scroll delay
  useEffect(() => {
    HERO_SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.image;
      img.onerror = () => {
        if (slide.fallbackImage) {
          const fallback = new Image();
          fallback.src = slide.fallbackImage;
        }
      };
    });
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  // Automated smooth transition timer with zero manual next/prev buttons
  useEffect(() => {
    timerRef.current = setInterval(() => {
      nextSlide();
    }, AUTO_PLAY_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide, currentIndex]);

  const currentSlide = HERO_SLIDES[currentIndex];

  const handleScrollToMenu = () => {
    if (onExploreClick) {
      onExploreClick();
    } else {
      const menuEl = document.getElementById('menu-catalog');
      if (menuEl) {
        menuEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section
      aria-label="Promotional Hero Showcase"
      data-testid="hero-carousel"
      className="relative isolate w-full overflow-hidden bg-[#180A26] text-white select-none min-h-[300px] sm:min-h-[330px] flex items-center border-b border-[#EAE6F0]/10"
    >
      {/* 1. Warm Specialty-Coffee Photography Layers with Automatic Crossfade extending full screen */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.headline}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover object-center filter brightness-[0.70] contrast-[1.08] saturate-[1.15]"
                onError={(e) => {
                  if (slide.fallbackImage && e.currentTarget.src !== slide.fallbackImage) {
                    e.currentTarget.src = slide.fallbackImage;
                  }
                }}
              />
            </div>
          );
        })}

        {/* 2. Warm Specialty-Coffee Color Overlays & Blending Gradients */}
        {/* Deep purple/charcoal side overlay to protect left-aligned typography */}
        <div className="absolute inset-0 z-20 bg-gradient-to-r from-[#1E0B30] via-[#1E0B30]/85 md:via-[#1E0B30]/75 to-transparent" />

        {/* Warm amber & dark vignette overlays for a cozy, inviting coffee-shop ambiance */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#180A26] via-transparent to-[#180A26]/50" />

        {/* Ambient warm glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#58259A]/30 blur-3xl z-20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#E7C8A0]/15 blur-3xl z-20" />
      </div>

      {/* 3. Hero Content Container: Full width with max-w-7xl content container and generous left/right padding */}
      <div className="relative z-30 mx-auto max-w-7xl w-full px-6 py-5 sm:px-10 sm:py-6 lg:px-12">
        <div className="max-w-xl text-left space-y-3">
          {/* Main Headline */}
          <h1
            key={`headline-${currentSlide.id}`}
            className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight transition-all duration-500 ease-out animate-fadeIn"
          >
            {currentSlide.headline}
          </h1>

          {/* Subtitle / Inspiring Quote */}
          <div
            key={`subtitle-${currentSlide.id}`}
            className="space-y-1.5 transition-all duration-500 ease-out animate-fadeIn"
          >
            <p className="text-xs sm:text-sm text-slate-200 font-normal leading-relaxed line-clamp-2">
              {currentSlide.subtitle}
            </p>
            <p className="text-[11px] sm:text-xs text-[#E7C8A0] italic font-medium leading-normal border-l-2 border-[#E7C8A0]/70 pl-2.5 line-clamp-1">
              {currentSlide.quote}
            </p>
          </div>

          {/* Solid Purple Pill Button: Explore Menu → */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleScrollToMenu}
              className="inline-flex items-center gap-2 rounded-full bg-[#58259A] hover:bg-[#481E7F] active:bg-[#381664] text-white font-bold px-5 py-2.5 text-xs shadow-md shadow-[#58259A]/40 transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Explore Menu</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom-Center Automatic Carousel Pagination Indicators */}
      <div
        className="absolute bottom-3 inset-x-0 z-30 flex items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Automatic Carousel Pagination"
      >
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`Carousel slide ${idx + 1}`}
              className={`transition-all duration-500 rounded-full h-1.5 ${
                isActive
                  ? 'w-6 bg-[#E7C8A0] shadow-sm shadow-[#E7C8A0]/50'
                  : 'w-1.5 bg-white/40'
              }`}
            />
          );
        })}
      </div>
    </section>
  );
};
