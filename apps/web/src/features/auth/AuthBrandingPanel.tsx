import React from 'react';
import { Coffee, Flame, Users, Star } from 'lucide-react';
import latteImg from '../../assets/brew-bean-latte.jpg';

export const AuthBrandingPanel: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between p-8 sm:p-12 lg:p-14 xl:p-16 text-white overflow-hidden rounded-t-xl lg:rounded-tr-none lg:rounded-l-2xl min-h-[560px] lg:min-h-[720px] isolate h-full">
      {/* Background Coffee Imagery with full-cover crop and subtle zoom effect */}
      <img
        src={latteImg}
        alt="Artisan cappuccino with rosette latte art and roasted Ethiopian coffee beans"
        className="absolute inset-0 h-full w-full object-cover object-center transform scale-105 pointer-events-none transition-transform duration-1000 ease-out"
        loading="eager"
      />

      {/* Layer 1: Luxury Dark Plum Coffee Brand Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#120622]/95 via-[#21113F]/85 to-[#1A0933]/80 pointer-events-none" />

      {/* Layer 2: Vignette and dark bottom for optimal text legibility */}
      <div className="absolute inset-0 bg-radial-[at_top_left] from-transparent via-[#140624]/40 to-[#0F041B]/85 pointer-events-none" />

      {/* Layer 3: Ambient Glow Accents */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#7138E8]/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#E7C8A0]/15 blur-3xl" />

      {/* Top Branding Section: Akufada COFFEE ARTISANS */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-3 rounded-xl bg-white/[0.08] backdrop-blur-md px-3.5 py-2.5 shadow-lg shadow-black/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7138E8] text-white shadow-sm shadow-[#7138E8]/40">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col text-left pr-2">
            <span className="text-lg font-black tracking-tight text-white leading-none font-sans">
              Akufada
            </span>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#E7C8A0] mt-1">
              COFFEE ARTISANS
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Brand Narrative and Glassmorphic Highlight Card */}
      <div className="relative z-10 my-8 sm:my-10 text-left space-y-4">
        {/* Clear Heading & Supporting Description without text outlines/shadows */}
        <div className="space-y-2.5 max-w-md">
          <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-white tracking-tight leading-tight">
            Exceptional Coffee, Every Day
          </h2>
          <p className="text-xs sm:text-[13.5px] text-[#D8CBEF] leading-relaxed font-normal">
            Crafted with passion, served with purpose. Join our community of coffee lovers and experience the difference.
          </p>
        </div>

        {/* Frosted Glass Coffee Terroir Highlight Card without outline border */}
        <div className="rounded-xl bg-white/[0.08] backdrop-blur-md p-4 shadow-lg max-w-md">
          <div className="flex items-center gap-1 text-[#E7C8A0] mb-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-[#E7C8A0] text-[#E7C8A0]" />
            ))}
            <span className="ml-1.5 text-[11px] font-bold text-white/90">Artisan Heirloom Terroirs</span>
          </div>
          <p className="text-[11.5px] text-white/85 leading-relaxed italic">
            &ldquo;Single-origin beans hand-selected from Yirgacheffe and Sidama, slow-roasted in small batches daily.&rdquo;
          </p>
        </div>
      </div>

      {/* Bottom: Three Compact Feature Groups in clean cards without outlines */}
      <div className="relative z-10 pt-4 border-t border-white/10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
          {/* Feature 1: Premium Beans */}
          <div className="rounded-lg bg-black/30 backdrop-blur-md p-3 flex flex-col justify-between transition-all hover:bg-black/40">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[#E7C8A0] shrink-0">
                <Coffee className="h-3.5 w-3.5" />
              </div>
              <span className="truncate">Premium Beans</span>
            </div>
            <p className="text-[11px] text-[#D8CBEF] font-normal leading-tight mt-1.5 truncate">
              Sourced ethically.
            </p>
          </div>

          {/* Feature 2: Artisan Roasts */}
          <div className="rounded-lg bg-black/30 backdrop-blur-md p-3 flex flex-col justify-between transition-all hover:bg-black/40">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[#E7C8A0] shrink-0">
                <Flame className="h-3.5 w-3.5" />
              </div>
              <span className="truncate">Artisan Roasts</span>
            </div>
            <p className="text-[11px] text-[#D8CBEF] font-normal leading-tight mt-1.5 truncate">
              Small batch.
            </p>
          </div>

          {/* Feature 3: Better Together */}
          <div className="rounded-lg bg-black/30 backdrop-blur-md p-3 flex flex-col justify-between transition-all hover:bg-black/40">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[#E7C8A0] shrink-0">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="truncate">Better Together</span>
            </div>
            <p className="text-[11px] text-[#D8CBEF] font-normal leading-tight mt-1.5 truncate">
              Coffee community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
