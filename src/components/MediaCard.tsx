import React, { useState } from 'react';
import { Star, Heart, BookmarkCheck } from 'lucide-react';
import { MediaItem } from '../types';
import { getPosterUrl, FALLBACK_POSTER_SVG } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface MediaCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onSelect,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';

  const [imageLoaded, setImageLoaded] = useState(false);
  const title = item.title || item.name || 'Untitled';
  const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const isMovie = item.media_type === 'movie' || Boolean(item.title);

  return (
    <div
      className="group relative flex-shrink-0 w-44 sm:w-48 cursor-pointer select-none"
      onClick={() => onSelect(item)}
    >
      {/* Poster Container with Kino Poster Hover Micro-interaction (.pv) */}
      <div className={`pv relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#1c1e21] border ${
        isLight
          ? 'border-neutral-200 shadow-md'
          : isCobalt
          ? 'border-white/10 shadow-lg'
          : 'border-[#2e3035] shadow-lg'
      }`}>
        {/* Shimmer skeleton until image loads */}
        {!imageLoaded && (
          <div className="absolute inset-0 animate-shimmer bg-[#1c1e21]" />
        )}

        <img
          src={getPosterUrl(item.poster_path, 'w500', item.id)}
          alt={title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER_SVG;
            setImageLoaded(true);
          }}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-106 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        />

        {/* Kino Showcase Vignette Overlay (.ov) */}
        <div className="ov" />

        {/* Kino Showcase Pop Play Button (.pp) with 450ms Spring Pop */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onPlay(item);
          }}
          className="pp cursor-pointer shadow-2xl"
          title="Watch Now"
        >
          <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: 'var(--ink, #141414)', stroke: 'none', marginLeft: '3px' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* Top Badges & Favorite Heart */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-auto">
          <span className="px-2.5 py-1 text-[11px] font-semibold tracking-wide bg-black/50 backdrop-blur-xl border border-white/10 rounded-full text-white shadow-sm pointer-events-none">
            {isMovie ? 'Movie' : 'Series'}
          </span>

          <div className="flex items-center gap-1.5">
            {rating && (
              <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-black/50 backdrop-blur-xl border border-amber-500/30 text-amber-400 rounded-full shadow-sm pointer-events-none">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {rating}
              </span>
            )}
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item);
                }}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                className="like sm p-1.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/10 cursor-pointer transition-transform active:scale-90"
                style={{ width: '32px', height: '32px' }}
              >
                {isFavorite ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#ffd24d] fill-[#ffd24d]" />
                ) : (
                  <Heart className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Title on Card (.tx) */}
        <div className="tx absolute bottom-0 inset-x-0 p-3.5 flex flex-col justify-end preserve-white pointer-events-none z-10">
          <p className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">
            {title}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-neutral-300 mt-0.5">
            {releaseYear && <span>{releaseYear}</span>}
            <span className="w-1 h-1 rounded-full bg-neutral-400" />
            <span className="text-neutral-300 font-medium">HD</span>
          </div>
        </div>
      </div>
    </div>
  );
};
