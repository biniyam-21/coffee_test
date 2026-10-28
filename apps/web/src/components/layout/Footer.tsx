import React from 'react';
import { Coffee, Heart, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="footer-contact" className="mt-auto border-t border-white/10 bg-[#1E0B30] text-[#E8D7F7] py-2.5 sm:py-3 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#58259A] text-white shadow-xs">
            <Coffee className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-white text-xs">Akufada Coffee Artisans</span>
          <span className="text-[10px] text-[#E7C8A0] font-medium hidden md:inline">
            • Addis Ababa
          </span>
        </div>

        {/* Center: Contact Info */}
        <div className="flex items-center gap-3 text-[11px] text-[#D8C7EC]">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#E7C8A0]" />
            Bole, Addis Ababa
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-[#E7C8A0]" />
            +251 911 000 000
          </span>
        </div>

        {/* Right: Copyright & Specialty Note */}
        <div className="flex items-center gap-2 text-[11px] text-[#BFA6D9]">
          <span>&copy; {new Date().getFullYear()} Akufada</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-[#E7C8A0]">
            Handcrafted with <Heart className="h-3 w-3 fill-[#E11D48] text-[#E11D48]" />
          </span>
        </div>
      </div>
    </footer>
  );
};
