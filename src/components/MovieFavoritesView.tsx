import React, { useState, useMemo } from 'react';
import { Heart, Play, Film, Tv, Search, ArrowLeft, Trash2, Info, Star } from 'lucide-react';
import { FavoriteItem, MediaItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MovieFavoritesViewProps {
  favorites: FavoriteItem[];
  onPlay: (item: MediaItem) => void;
  onSelectMedia: (item: MediaItem) => void;
  onToggleFavorite: (item: MediaItem) => void;
  onBackToBrowse: () => void;
}

export const MovieFavoritesView: React.FC<MovieFavoritesViewProps> = ({
  favorites,
  onPlay,
  onSelectMedia,
  onToggleFavorite,
  onBackToBrowse,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'title'>('recent');

  const movieCount = useMemo(() => favorites.filter((f) => f.media_type === 'movie').length, [favorites]);
  const tvCount = useMemo(() => favorites.filter((f) => f.media_type === 'tv').length, [favorites]);

  const filteredFavorites = useMemo(() => {
    let result = [...favorites];

    if (filterType !== 'all') {
      result = result.filter((f) => f.media_type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.title.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return (b.added_at || 0) - (a.added_at || 0);
    });

    return result;
  }, [favorites, filterType, searchQuery, sortBy]);

  const toMediaItem = (fav: FavoriteItem): MediaItem => ({
    id: fav.id,
    title: fav.media_type === 'movie' ? fav.title : undefined,
    name: fav.media_type === 'tv' ? fav.title : undefined,
    poster_path: fav.poster_path,
    backdrop_path: fav.backdrop_path,
    overview: fav.overview || '',
    vote_average: fav.vote_average,
    release_date: fav.release_year,
    first_air_date: fav.release_year,
    media_type: fav.media_type,
  });

  return (
    <div className={`min-h-full w-full p-6 md:p-8 space-y-6 select-none transition-colors ${
      isLight ? 'bg-[#F4F5F7] text-neutral-900' : 'bg-[#0B0B0D] text-white'
    }`}>
      {/* 1. Header with Back Button, Title, and Sync Indicator */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 ${
        isLight ? 'border-neutral-200' : 'border-white/6'
      }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToBrowse}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 border ${
              isLight
                ? 'bg-white border-neutral-200 text-neutral-700 hover:text-black hover:bg-neutral-100 shadow-sm'
                : 'bg-[#161619] border-white/8 hover:border-[#DCFF7D]/40 text-neutral-300 hover:text-white'
            }`}
            title="Back to Movies & Series"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isLight
                  ? 'bg-rose-50 border border-rose-200 text-rose-500'
                  : 'bg-[#DCFF7D]/15 border border-[#DCFF7D]/30 text-[#DCFF7D]'
              }`}>
                <Heart className={`w-4 h-4 ${isLight ? 'fill-rose-500' : 'fill-[#DCFF7D]'}`} />
              </div>
              <h1 className={`text-2xl font-extrabold tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                Favorite Movies & Series
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isLight
                  ? 'bg-neutral-100 border-neutral-200 text-neutral-800'
                  : 'bg-[#DCFF7D]/15 text-[#DCFF7D] border-[#DCFF7D]/25'
              }`}>
                {favorites.length}
              </span>
            </div>
            <p className={`text-xs mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Your personal collection • Cloud Sync Active
            </p>
          </div>
        </div>

        {/* Search inside favorites */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved titles..."
            className={`w-full rounded-full pl-4 pr-10 py-2.5 text-xs transition-colors focus:outline-none border ${
              isLight
                ? 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 shadow-sm'
                : 'bg-[#161619] border-white/8 text-white placeholder-neutral-500 focus:border-[#DCFF7D]/50'
            }`}
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Sub-Filter Pills & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'all'
                ? isLight
                  ? 'bg-neutral-900 text-white shadow-none theme-btn-dark preserve-white'
                  : 'bg-[#DCFF7D] text-[#0B0B0D] shadow-md shadow-[#DCFF7D]/20'
                : isLight
                  ? 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 shadow-sm'
                  : 'bg-[#161619] text-neutral-400 hover:text-white hover:bg-[#1E1E23] border border-white/6'
            }`}
          >
            All Titles
            <span className="text-[10px] opacity-80">({favorites.length})</span>
          </button>

          <button
            onClick={() => setFilterType('movie')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'movie'
                ? isLight
                  ? 'bg-neutral-900 text-white shadow-none theme-btn-dark preserve-white'
                  : 'bg-[#DCFF7D] text-[#0B0B0D] shadow-md shadow-[#DCFF7D]/20'
                : isLight
                  ? 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 shadow-sm'
                  : 'bg-[#161619] text-neutral-400 hover:text-white hover:bg-[#1E1E23] border border-white/6'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Movies
            <span className="text-[10px] opacity-80">({movieCount})</span>
          </button>

          <button
            onClick={() => setFilterType('tv')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'tv'
                ? isLight
                  ? 'bg-neutral-900 text-white shadow-none theme-btn-dark preserve-white'
                  : 'bg-[#DCFF7D] text-[#0B0B0D] shadow-md shadow-[#DCFF7D]/20'
                : isLight
                  ? 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 shadow-sm'
                  : 'bg-[#161619] text-neutral-400 hover:text-white hover:bg-[#1E1E23] border border-white/6'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            TV Shows
            <span className="text-[10px] opacity-80">({tvCount})</span>
          </button>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer border ${
              isLight
                ? 'bg-white text-neutral-900 border-neutral-200 shadow-sm'
                : 'bg-[#161619] text-white border-white/8 focus:border-[#DCFF7D]/40'
            }`}
          >
            <option value="recent">Recently Added</option>
            <option value="rating">Highest Rated</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 3. Empty State or Favorites Grid */}
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border ${
            isLight ? 'bg-neutral-100 border-neutral-200 text-neutral-400' : 'bg-white/5 border-white/8 text-neutral-500'
          }`}>
            <Heart className="w-8 h-8" />
          </div>
          <h3 className={`text-base font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
            No favorites added yet
          </h3>
          <p className={`text-xs max-w-md mt-1.5 leading-relaxed ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
            Click the heart icon on any movie or TV series card while browsing to save it to your personal cloud collection.
          </p>
          <button
            onClick={onBackToBrowse}
            className={`mt-6 px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer shadow-md ${
              isLight
                ? 'bg-neutral-900 hover:bg-neutral-800 text-white'
                : 'bg-[#DCFF7D] text-[#0B0B0D] hover:bg-[#c9f164] shadow-[#DCFF7D]/15'
            }`}
          >
            Browse Movies & Series
          </button>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className={`text-sm ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
            No titles match your current filter or search query.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className={`mt-2 text-xs font-bold hover:underline cursor-pointer ${
              isLight ? 'text-neutral-900' : 'text-[#DCFF7D]'
            }`}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredFavorites.map((fav) => {
            const mediaItem = toMediaItem(fav);
            return (
              <div
                key={fav.id}
                onClick={() => onSelectMedia(mediaItem)}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col border ${
                  isLight
                    ? 'bg-white border-neutral-200/80 hover:border-neutral-400 shadow-sm hover:shadow-md'
                    : 'bg-[#161619] border-white/8 hover:border-[#DCFF7D]/50 shadow-lg'
                }`}
              >
                {/* Poster Artwork */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                  {fav.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${fav.poster_path}`}
                      alt={fav.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Film className="w-10 h-10" />
                    </div>
                  )}

                  {/* Rating Tag */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-amber-400 border border-white/10 flex items-center gap-1 preserve-white">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {fav.vote_average ? fav.vote_average.toFixed(1) : 'NR'}
                  </div>

                  {/* Media Type Tag */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white border border-white/10 preserve-white">
                    {fav.media_type === 'tv' ? 'TV' : 'Movie'}
                  </div>

                  {/* Play & Actions Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay(mediaItem);
                      }}
                      title="Play Now"
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer ${
                        isLight
                          ? 'bg-white text-black shadow-black/40'
                          : 'bg-[#DCFF7D] text-[#0B0B0D]'
                      }`}
                    >
                      <Play className={`w-5 h-5 ml-0.5 ${isLight ? 'fill-black text-black' : 'fill-black text-black'}`} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMedia(mediaItem);
                        }}
                        title="View Details"
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(mediaItem);
                        }}
                        title="Remove from favorites"
                        className="w-8 h-8 rounded-full bg-black/70 hover:bg-rose-500 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Title & Info */}
                <div className="p-3">
                  <h4 className={`font-bold text-xs truncate transition-colors ${
                    isLight ? 'text-neutral-900 group-hover:text-black' : 'text-white group-hover:text-[#DCFF7D]'
                  }`}>
                    {fav.title}
                  </h4>
                  <div className={`flex items-center justify-between text-[11px] mt-1 ${
                    isLight ? 'text-neutral-500' : 'text-neutral-400'
                  }`}>
                    <span className="capitalize">{fav.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
                    <span>{fav.release_year || ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
