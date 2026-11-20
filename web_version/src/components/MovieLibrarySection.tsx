import React from 'react';
import { Clock, Play, Film } from 'lucide-react';
import { WatchHistoryItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MovieLibrarySectionProps {
  history: WatchHistoryItem[];
  onPlayHistory: (item: WatchHistoryItem) => void;
}

export const MovieLibrarySection: React.FC<MovieLibrarySectionProps> = ({
  history,
  onPlayHistory,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Format relative time helper
  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const displayHistory = history.slice(0, 10);

  if (displayHistory.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 select-none">
      {/* CONTINUE WATCHING (YOUR HISTORY) */}
      <div className={`rounded-3xl p-6 space-y-4 transition-colors ${
        isLight
          ? 'bg-white border border-neutral-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
          : 'bg-[#161619] border border-white/8 shadow-xl'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className={`w-5 h-5 ${isLight ? 'text-neutral-900' : 'text-[#DCFF7D]'}`} />
            <h2 className={`text-base font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
              Continue Watching (Your History)
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              isLight ? 'bg-neutral-100 text-neutral-600' : 'bg-white/10 text-neutral-400'
            }`}>
              {displayHistory.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {displayHistory.map((item, idx) => (
            <div
              key={item.id + '-' + idx}
              onClick={() => onPlayHistory(item)}
              className={`group relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
                isLight
                  ? 'bg-white border border-neutral-200 hover:border-neutral-400 shadow-sm'
                  : 'bg-[#1D1D22] border border-white/8 hover:border-[#DCFF7D]/50 shadow-md'
              }`}
            >
              <div className="relative aspect-video w-full overflow-hidden bg-neutral-800">
                {item.backdrop_path || item.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.backdrop_path || item.poster_path}`}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <Film className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-semibold text-white border border-white/10 preserve-white">
                  {getRelativeTime(item.last_watched_timestamp)}
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${
                    isLight ? 'bg-white text-black' : 'bg-[#DCFF7D] text-[#0B0B0D]'
                  }`}>
                    <Play className={`w-4 h-4 ml-0.5 ${isLight ? 'fill-black text-black' : 'fill-black text-black'}`} />
                  </div>
                </div>
              </div>

              <div className="p-3">
                <div className={`font-bold text-xs truncate transition-colors ${
                  isLight
                    ? 'text-neutral-900 group-hover:text-black'
                    : 'text-white group-hover:text-[#DCFF7D]'
                }`}>
                  {item.title}
                </div>
                <div className={`text-[11px] mt-0.5 flex items-center justify-between ${
                  isLight ? 'text-neutral-500' : 'text-neutral-400'
                }`}>
                  <span>
                    {item.media_type === 'tv'
                      ? `Season ${item.season || 1} • Ep ${item.episode || 1}`
                      : 'Feature Movie'}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    isLight ? 'text-neutral-900' : 'text-[#DCFF7D]'
                  }`}>
                    Resume
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
