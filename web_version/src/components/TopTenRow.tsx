import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { MediaItem } from '../types';
import { getPosterUrl, FALLBACK_POSTER_SVG } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface TopTenRowProps {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
}

export const TopTenRow: React.FC<TopTenRowProps> = ({ items, onSelect, onPlay }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const scroll = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      const offset = direction === 'left' ? -500 : 500;
      scrollerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const top10 = items.slice(0, 10);
  if (top10.length === 0) return null;

  return (
    <section className="py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[22px] font-extrabold text-[#f2efe9] font-['Bricolage_Grotesque',sans-serif]">
              Top 10 this week
            </h2>
          </div>
        </div>

        {/* Scroll Chevrons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              isLight
                ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              isLight
                ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scroller Container */}
      <div
        ref={scrollerRef}
        className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth py-3"
      >
        {top10.map((item, index) => {
          const rank = index + 1;
          const title = item.title || item.name || 'Untitled';

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -6, scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={() => onSelect(item)}
              className="relative flex items-end flex-shrink-0 cursor-pointer select-none group"
            >
              {/* Kino Massive Outline Rank Number Typography */}
              <span
                className="text-[120px] sm:text-[130px] font-extrabold tracking-[-0.06em] leading-[0.78] select-none text-[#0f0f10] relative z-0 -mr-[22px] font-['Bricolage_Grotesque',sans-serif]"
                style={{
                  WebkitTextStroke: '2px #a9a7a2',
                }}
              >
                {rank}
              </span>

              {/* Poster Card overlapping number */}
              <div className="relative z-10 w-[150px] min-w-[150px] max-w-[150px] h-[220px] flex-shrink-0 rounded-[22px] overflow-hidden bg-[#18181a] border border-[#34343a] shadow-2xl transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]">
                <img
                  src={getPosterUrl(item.poster_path, 'w500')}
                  alt={title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_POSTER_SVG;
                  }}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 block"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                {/* Title & Star Rating overlay at bottom */}
                <div className="absolute bottom-3 left-3 right-3 pointer-events-none z-10">
                  <h3 className="text-[13px] font-extrabold text-[#f2efe9] leading-tight line-clamp-2 font-['Bricolage_Grotesque',sans-serif] drop-shadow-md">
                    {title}
                  </h3>
                  <div className="text-[10px] text-[#ffd24d] font-bold flex items-center gap-1 mt-1 drop-shadow-md">
                    ★ {item.vote_average ? item.vote_average.toFixed(1) : '8.0'}
                  </div>
                </div>

                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px] z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(item);
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer bg-[#ffd24d] hover:bg-[#ffe17d] text-[#141414]"
                  >
                    Play Now
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
