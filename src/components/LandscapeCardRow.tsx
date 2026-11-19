import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { getBackdropUrl, FALLBACK_BACKDROP_SVG } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface LandscapeCardRowProps {
  title: string;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onSelect: (item: MediaItem) => void;
  onSeeAll?: () => void;
}

export const LandscapeCardRow: React.FC<LandscapeCardRowProps> = ({
  title,
  items,
  onPlay,
  onSelect,
  onSeeAll,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';

  const scroll = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      const offset = direction === 'left' ? -500 : 500;
      scrollerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="py-4">
      {/* Row Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${
          isLight ? 'text-neutral-900' : 'text-white'
        }`}>
          {title}
        </h3>

        <div className="flex items-center gap-3">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className={`text-xs font-semibold transition-colors cursor-pointer ${
                isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
              }`}
            >
              See all
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className={`p-1.5 rounded-full transition-all cursor-pointer border ${
                isLight
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
                  : isCobalt
                  ? 'bg-[#202127] hover:bg-[#282a32] text-slate-200 hover:text-white border-white/8'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-white/5'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className={`p-1.5 rounded-full transition-all cursor-pointer border ${
                isLight
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
                  : isCobalt
                  ? 'bg-[#202127] hover:bg-[#282a32] text-slate-200 hover:text-white border-white/8'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-white/5'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Cards Scroller */}
      <div
        ref={scrollerRef}
        className="flex items-center gap-5 overflow-x-auto no-scrollbar scroll-smooth py-1"
      >
        {items.map((item) => {
          const itemTitle = item.title || item.name || 'Untitled';
          const year = (item.release_date || item.first_air_date || '').slice(0, 4) || '2023';
          const isMovie = item.media_type === 'movie' || Boolean(item.title);
          const metaText = `${year} • ${isMovie ? 'Movie' : 'Series'} • IMDb ${
            item.vote_average ? item.vote_average.toFixed(1) : '8.0'
          }`;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={() => onSelect(item)}
              className={`relative flex-shrink-0 w-64 sm:w-72 aspect-[16/10] rounded-3xl overflow-hidden bg-[#1c1e21] border shadow-xl cursor-pointer select-none group ${
                isLight
                  ? 'border-neutral-200/80 shadow-md hover:border-neutral-400'
                  : isCobalt
                  ? 'border-white/10 hover:border-[#2F6BFE]/50 shadow-xl'
                  : 'border-[#2e3035] hover:border-white/20'
              }`}
            >
              {/* Image Backdrop */}
              <img
                src={getBackdropUrl(item.backdrop_path, 'w780')}
                alt={itemTitle}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_BACKDROP_SVG;
                }}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

              {/* Bottom Card Content */}
              <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3 preserve-white">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate drop-shadow preserve-white">
                    {itemTitle}
                  </h4>
                  <p className="text-[11px] text-neutral-300 font-medium truncate mt-0.5 preserve-white">
                    {metaText}
                  </p>
                </div>

                {/* Circular Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(item);
                  }}
                  title="Play"
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all flex-shrink-0 cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-neutral-100 text-black shadow-black/40'
                      : isCobalt
                      ? 'bg-[#2F6BFE] hover:bg-[#2557d6] text-white shadow-[#2F6BFE]/30'
                      : 'bg-[#DCFF7D] hover:bg-[#cbf764] text-[#0B0B0D]'
                  }`}
                >
                  <Play className={`w-4 h-4 ml-0.5 ${
                    isLight ? 'fill-black text-black' : isCobalt ? 'fill-white text-white' : 'fill-black text-black'
                  }`} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
