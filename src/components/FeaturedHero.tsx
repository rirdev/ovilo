import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { MediaItem } from '../types';
import { getBackdropUrl, FALLBACK_BACKDROP_SVG } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface FeaturedHeroProps {
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onSelect: (item: MediaItem) => void;
}

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({ items, onPlay, onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const featuredList = items.slice(0, 6);
  if (featuredList.length === 0) return null;

  const currentItem = featuredList[currentIndex] || featuredList[0];
  const title = (currentItem.title || currentItem.name || 'Untitled').toUpperCase();
  const year = (currentItem.release_date || currentItem.first_air_date || '').slice(0, 4) || '2024';
  const rating = currentItem.vote_average ? currentItem.vote_average.toFixed(1) : '8.4';
  const isMovie = currentItem.media_type === 'movie' || Boolean(currentItem.title);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredList.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredList.length) % featuredList.length);
  };

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden shadow-2xl h-[380px] sm:h-[420px] select-none group border ${
      isLight ? 'bg-neutral-900 border-neutral-200/80 shadow-lg' : 'bg-[#151515] border-[#262626]'
    }`}>
      {/* Dynamic Backdrop */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src={getBackdropUrl(currentItem.backdrop_path, 'original')}
            alt={title}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_BACKDROP_SVG;
            }}
            className="w-full h-full object-cover object-center"
          />

          {/* Gradients matching Material 3 surface (#111315) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#111315] via-[#111315]/85 to-transparent w-full md:w-3/4 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111315] via-[#111315]/40 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Content Overlay */}
      <div className="relative z-10 h-full p-6 sm:p-10 flex flex-col justify-between preserve-white">
        {/* Top Badges */}
        <div className="flex items-center gap-3 preserve-white">
          <span className="bg-[#141414] text-[#ffd24d] font-bold text-[12px] px-3.5 py-1 rounded-full shadow-sm">
            #1 this week
          </span>
        </div>

        {/* Middle / Bottom Details */}
        <div className="max-w-xl preserve-white">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-md preserve-white">
            {title}
          </h2>

          {/* Metadata line: 2023 • 3 hrs • IMDb 8.2/10 */}
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-300 font-medium mb-3 preserve-white">
            <span>{year}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-400" />
            <span>{isMovie ? '2h 15m' : 'TV Series'}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-400" />
            <span className="text-amber-400 font-bold">IMDb {rating}/10</span>
          </div>

          {/* Synopsis (2 lines) */}
          <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2 leading-relaxed mb-6 font-normal drop-shadow preserve-white">
            {currentItem.overview ||
              'An epic adventure that continues the journey with high stakes, visual mastery, and unforgettable storytelling.'}
          </p>

          {/* Action Buttons: Watch (white), Download / Info (glass), Options */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onPlay(currentItem)}
              className="flex items-center gap-2 px-7 py-3 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer theme-btn-white"
            >
              <Play className="w-4 h-4 fill-neutral-950 text-neutral-950 ml-0.5" />
              <span className="text-neutral-950 font-bold">Watch</span>
            </button>

            <button
              onClick={() => onSelect(currentItem)}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white font-semibold text-sm transition-all cursor-pointer shadow-md"
            >
              <Info className="w-4 h-4" />
              <span>Details</span>
            </button>

            <button
              onClick={() => onSelect(currentItem)}
              title="More Options"
              className="p-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer shadow-md"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Up / Down Navigation Chevrons on right side */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5">
        <button
          onClick={handlePrev}
          title="Previous Featured"
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          title="Next Featured"
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
