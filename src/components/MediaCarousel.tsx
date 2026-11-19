import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface MediaCarouselProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  favoriteIds?: Set<number>;
  onToggleFavorite?: (item: MediaItem) => void;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  title,
  subtitle,
  icon: Icon,
  items,
  onSelect,
  onPlay,
  favoriteIds,
  onToggleFavorite,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      const offset = direction === 'left' ? -600 : 600;
      scrollerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="relative py-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Row Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-[#DCFF7D]/10 border border-[#DCFF7D]/20 text-[#DCFF7D]">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Scroll Chevrons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            aria-label={`Scroll ${title} left`}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label={`Scroll ${title} right`}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Cards Scroller */}
      <div
        ref={scrollerRef}
        className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2"
      >
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onSelect={onSelect}
            onPlay={onPlay}
            isFavorite={favoriteIds?.has(item.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
};
