import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Plus, Check, Star, Flame, Pause } from 'lucide-react';
import { MediaItem } from '../types';
import { getBackdropUrl } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface HeroBannerProps {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  favoriteIds?: Set<number>;
  onToggleFavorite?: (item: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  items,
  onSelect,
  onPlay,
  favoriteIds,
  onToggleFavorite,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const heroItems = items.slice(0, 6);
  const activeItem = heroItems[currentIndex] || heroItems[0];

  // Auto-advance with pause on hover (respecting motion accessibility rule)
  useEffect(() => {
    if (heroItems.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroItems.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [heroItems.length, isPaused]);

  if (!activeItem) return null;

  const title = activeItem.title || activeItem.name || 'Untitled';
  const releaseYear = (activeItem.release_date || activeItem.first_air_date || '').slice(0, 4);
  const isMovie = activeItem.media_type === 'movie' || Boolean(activeItem.title);
  const isFavorite = favoriteIds?.has(activeItem.id);

  return (
    <div
      className="relative w-full h-[72vh] min-h-[500px] max-h-[720px] overflow-hidden bg-neutral-950 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Backdrops with cross-fade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeItem.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src={getBackdropUrl(activeItem.backdrop_path, 'original')}
            alt={title}
            className="w-full h-full object-cover object-top"
          />

          {/* Vignette Gradients: Left darkening, bottom fade, top soft shadow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#08090d] via-[#08090d]/70 to-transparent w-full md:w-3/4 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090d] via-[#08090d]/35 to-transparent pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#08090d]/80 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Content Overlay */}
      <div className="relative z-10 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-14 preserve-white">
        <motion.div
          key={activeItem.id + '-content'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl preserve-white"
        >
          {/* Top Badges */}
          <div className="flex items-center gap-2.5 mb-3 flex-wrap preserve-white">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-extrabold text-xs tracking-wider uppercase shadow-md ${
              isLight
                ? 'bg-white text-black shadow-black/20'
                : isCobalt
                ? 'bg-[#2F6BFE] text-white shadow-[#2F6BFE]/30'
                : 'bg-[#DCFF7D] text-[#0B0B0D] shadow-[#DCFF7D]/20'
            }`}>
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              Featured #{currentIndex + 1}
            </span>

            <span className="px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-md text-white font-medium text-xs border border-white/20">
              {isMovie ? 'Feature Film' : 'TV Series'}
            </span>

            {releaseYear && (
              <span className="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md text-neutral-200 font-medium text-xs border border-white/10">
                {releaseYear}
              </span>
            )}

            {activeItem.vote_average > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 backdrop-blur-md text-amber-300 font-bold text-xs border border-amber-500/30">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {activeItem.vote_average.toFixed(1)} IMDb
              </span>
            )}

            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-neutral-200 border border-white/10">
              4K Ultra HD
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] mb-3.5 drop-shadow-xl preserve-white">
            {title}
          </h1>

          {/* Synopsis with readable measure (max-w-prose) */}
          <p className="text-sm sm:text-base text-neutral-200 line-clamp-3 mb-6 font-normal leading-relaxed drop-shadow-md preserve-white max-w-prose">
            {activeItem.overview}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3.5 flex-wrap">
            {/* Play Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPlay(activeItem)}
              className={`flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 text-black shadow-black/40'
                  : isCobalt
                  ? 'bg-[#2F6BFE] hover:bg-[#2557d6] text-white shadow-[#2F6BFE]/30'
                  : 'bg-[#DCFF7D] hover:bg-[#cbf764] text-[#0B0B0D] shadow-[#DCFF7D]/25'
              }`}
            >
              <Play className={`w-5 h-5 ml-0.5 ${isLight ? 'fill-black text-black' : isCobalt ? 'fill-white text-white' : 'fill-black text-black'}`} />
              <span>Watch Now</span>
            </motion.button>

            {/* More Details Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(activeItem)}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white font-semibold text-sm transition-all cursor-pointer shadow-lg"
            >
              <Info className="w-4 h-4" />
              <span>Details</span>
            </motion.button>

            {/* Favorite / List Button */}
            {onToggleFavorite && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onToggleFavorite(activeItem)}
                title={isFavorite ? 'In My List' : 'Add to My List'}
                className={`flex items-center gap-2 px-4 py-3.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                  isFavorite
                    ? isLight
                      ? 'bg-white text-black border-white shadow-lg'
                      : isCobalt
                      ? 'bg-[#2F6BFE]/25 border-[#2F6BFE]/50 text-white shadow-[#2F6BFE]/20'
                      : 'bg-[#DCFF7D]/20 border-[#DCFF7D]/40 text-[#DCFF7D]'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-neutral-200 hover:text-white'
                }`}
              >
                {isFavorite ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span className="hidden sm:inline text-sm font-medium">
                  {isFavorite ? 'Saved' : 'My List'}
                </span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Carousel Slide Indicators */}
        <div className="absolute bottom-6 right-4 sm:right-8 flex items-center gap-2">
          {isPaused && (
            <span className="flex items-center gap-1 text-[11px] text-neutral-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15">
              <Pause className="w-3 h-3" /> Paused
            </span>
          )}

          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/15">
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? isLight
                      ? 'w-7 bg-white'
                      : isCobalt
                      ? 'w-7 bg-[#38BDF8]'
                      : 'w-7 bg-[#DCFF7D]'
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
