import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Tv, Film, Compass, Music, Play, Pause, Heart, Download, Check } from 'lucide-react';
import { MediaItem, MusicTrack } from '../types';
import { searchMulti, searchOnlineMusic } from '../services/api';
import { MediaCard } from './MediaCard';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import { getLocalMusicFavorites, saveLocalMusicFavorites, getLocalProfile, syncToCloud } from '../services/firebaseSync';
import { startDownload } from '../services/downloadManager';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  favoriteIds?: Set<number>;
  onToggleFavorite?: (item: MediaItem) => void;
  activeTab?: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onPlay,
  favoriteIds,
  onToggleFavorite,
  activeTab = 'dashboard',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv' | 'music'>('all');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [musicResults, setMusicResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [musicFavorites, setMusicFavorites] = useState<MusicTrack[]>(() => getLocalMusicFavorites());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setMusicFavorites(getLocalMusicFavorites());
      if (activeTab?.startsWith('music')) {
        setFilter('music');
      } else if (activeTab === 'movies') {
        setFilter('movie');
      } else {
        setFilter('all');
      }
    } else {
      setQuery('');
      setResults([]);
      setMusicResults([]);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    const handleFavsUpdate = () => {
      setMusicFavorites(getLocalMusicFavorites());
    };
    window.addEventListener('ovilo_music_favorites_updated', handleFavsUpdate);
    return () => window.removeEventListener('ovilo_music_favorites_updated', handleFavsUpdate);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setMusicResults([]);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [mediaData, musicData] = await Promise.allSettled([
          searchMulti(query.trim()),
          searchOnlineMusic(query.trim()),
        ]);
        if (isCurrent) {
          if (mediaData.status === 'fulfilled') {
            setResults(mediaData.value || []);
          }
          if (musicData.status === 'fulfilled') {
            setMusicResults(musicData.value || []);
          }
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMusicFav = (trackId?: string, trackTitle?: string) => {
    const cleanId = (trackId || '').trim();
    const cleanT = (trackTitle || '').trim().toLowerCase();
    return musicFavorites.some((f) => {
      if (!f) return false;
      const fId = (f.id || '').trim();
      if (cleanId && fId && fId === cleanId) return true;
      const fTitle = (f.title || (f as any).name || '').trim().toLowerCase();
      return Boolean(cleanT && fTitle && fTitle === cleanT);
    });
  };

  const handleToggleMusicFavorite = (e: React.MouseEvent, track: MusicTrack) => {
    e.stopPropagation();
    if (!track || (!track.title && !track.id)) return;
    const cleanT = (track.title || '').trim().toLowerCase();
    const cleanId = (track.id || '').trim();

    const isMatch = (f: MusicTrack) => {
      if (!f) return false;
      const fId = (f.id || '').trim();
      if (cleanId && fId && fId === cleanId) return true;
      const fTitle = (f.title || (f as any).name || '').trim().toLowerCase();
      return Boolean(cleanT && fTitle && fTitle === cleanT);
    };

    const isFav = musicFavorites.some(isMatch);
    let updated: MusicTrack[];
    if (isFav) {
      updated = musicFavorites.filter((f) => !isMatch(f));
    } else {
      updated = [track, ...musicFavorites.filter((f) => !isMatch(f))];
    }
    setMusicFavorites(updated);
    saveLocalMusicFavorites(updated);
    const p = getLocalProfile();
    if (p && !p.isGuest && (p.username || p.uid)) {
      syncToCloud(p.username || p.uid || '', { musicFavorites: updated });
    }
    window.dispatchEvent(new CustomEvent('ovilo_music_favorites_updated'));
  };

  const handleMusicClick = (track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, musicResults);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec || isNaN(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredMedia = results.filter((item) => {
    if (filter === 'all') return true;
    return item.media_type === filter;
  });

  const showMedia = filter === 'all' || filter === 'movie' || filter === 'tv';
  const showMusic = filter === 'all' || filter === 'music';

  const hasAnyResults = (showMedia && filteredMedia.length > 0) || (showMusic && musicResults.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.05, 0.7, 0.1, 1] }}
          className={`fixed inset-0 z-50 flex flex-col backdrop-blur-2xl transition-colors ${
            isLight ? 'bg-white/95 text-neutral-900' : 'bg-black/95 text-white'
          }`}
        >
        {/* Top Search Input Bar */}
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isLight ? 'text-neutral-500' : 'text-neutral-400'
              }`} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, TV shows, songs, artists, albums..."
                className={`w-full pl-12 pr-12 py-4 rounded-2xl text-lg font-medium transition-all focus:outline-none border ${
                  isLight
                    ? 'bg-neutral-100 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900'
                    : 'bg-[#151515] border-[#262626] text-white placeholder-neutral-400 focus:border-[#DCFF7D]/50'
                }`}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full ${
                    isLight ? 'text-neutral-400 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isLight
                  ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700'
                  : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/10 text-neutral-300 hover:text-white'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? isLight
                    ? 'bg-neutral-900 text-white shadow-none theme-btn-dark preserve-white'
                    : 'bg-[#DCFF7D] text-[#0B0B0D]'
                  : isLight
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 border border-white/10'
              }`}
            >
              All Results
            </button>
            <button
              onClick={() => setFilter('movie')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'movie'
                  ? isLight
                    ? 'bg-neutral-900 text-white shadow-none theme-btn-dark preserve-white'
                    : 'bg-[#DCFF7D] text-[#0B0B0D]'
                  : isLight
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 border border-white/10'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> Movies
            </button>
            <button
              onClick={() => setFilter('tv')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'tv'
                  ? isLight
                    ? 'bg-neutral-900 text-white shadow-none theme-btn-dark preserve-white'
                    : 'bg-[#DCFF7D] text-[#0B0B0D]'
                  : isLight
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 border border-white/10'
              }`}
            >
              <Tv className="w-3.5 h-3.5" /> TV Series
            </button>
            <button
              onClick={() => setFilter('music')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'music'
                  ? isLight
                    ? 'bg-neutral-900 text-white shadow-none theme-btn-dark preserve-white'
                    : 'bg-[#DCFF7D] text-[#0B0B0D]'
                  : isLight
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 border border-white/10'
              }`}
            >
              <Music className="w-3.5 h-3.5" /> Music & Songs
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full no-scrollbar">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className={`aspect-[2/3] rounded-2xl animate-shimmer border ${
                    isLight ? 'bg-neutral-200 border-neutral-300' : 'bg-neutral-900 border-white/5'
                  }`}
                />
              ))}
            </div>
          ) : hasAnyResults ? (
            <div className="space-y-8">
              {/* Movies & TV Shows Section */}
              {showMedia && filteredMedia.length > 0 && (
                <div>
                  {filter === 'all' && (
                    <div className="flex items-center gap-2 mb-3">
                      <Film className={`w-4 h-4 ${isLight ? 'text-neutral-700' : 'text-[#DCFF7D]'}`} />
                      <h3 className="text-sm font-bold uppercase tracking-wider opacity-75">
                        Movies & TV Shows ({filteredMedia.length})
                      </h3>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredMedia.map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        onSelect={(m) => {
                          onClose();
                          onSelect(m);
                        }}
                        onPlay={(m) => {
                          onClose();
                          onPlay(m);
                        }}
                        isFavorite={favoriteIds?.has(item.id)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Music Section */}
              {showMusic && musicResults.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Music className={`w-4 h-4 ${isLight ? 'text-neutral-700' : 'text-[#DCFF7D]'}`} />
                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-75">
                      Songs & Audio ({musicResults.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {musicResults.map((track) => {
                      const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                      const isFav = isMusicFav(track.id, track.title);
                      const artwork = track.artwork_url && track.artwork_url.startsWith('http')
                        ? track.artwork_url
                        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80';

                      return (
                        <div
                          key={track.id}
                          onClick={() => handleMusicClick(track)}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group ${
                            isLight
                              ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200'
                              : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5'
                          } ${isThisPlaying ? (isLight ? 'border-neutral-900 bg-neutral-100' : 'border-[#DCFF7D]/40 bg-[#DCFF7D]/[0.06]') : ''}`}
                        >
                          {/* Thumbnail / Disc with Play Overlay */}
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow-sm">
                            <img
                              src={artwork}
                              alt={track.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                              isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}>
                              {isThisPlaying ? (
                                <Pause className="w-5 h-5 text-white" />
                              ) : (
                                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                              )}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm truncate ${
                              isThisPlaying ? (isLight ? 'text-neutral-900 font-bold' : 'text-[#DCFF7D]') : ''
                            }`}>
                              {track.title}
                            </div>
                            <div className={`text-xs truncate ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                              {track.artist}{track.album ? ` • ${track.album}` : ''}
                            </div>
                          </div>

                          {/* Duration */}
                          <div className={`text-xs font-mono tabular-nums ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            {formatDuration(track.duration)}
                          </div>

                          {/* Download Song Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startDownload({
                                url: track.stream_url || `https://music.youtube.com/search?q=${encodeURIComponent(track.title + ' ' + track.artist)}`,
                                title: `${track.title} - ${track.artist}`,
                                uploader: track.artist,
                                thumbnail: artwork,
                                formatType: 'audio_mp3',
                                formatLabel: 'MP3 High Quality',
                              });
                              setDownloadToast(`Queued download: ${track.title}`);
                              setTimeout(() => setDownloadToast(null), 3500);
                            }}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              isLight ? 'text-neutral-400 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
                            }`}
                            title="Download song"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Favorite Heart Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleMusicFavorite(e, track)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              isFav
                                ? 'text-rose-500 hover:text-rose-400'
                                : isLight
                                  ? 'text-neutral-400 hover:text-rose-500'
                                  : 'text-neutral-500 hover:text-rose-400'
                            }`}
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : query ? (
            <div className="text-center py-20 text-neutral-400">
              <Film className="w-12 h-12 mx-auto stroke-1 text-neutral-500 mb-3" />
              <p className={`text-base font-semibold ${isLight ? 'text-neutral-800' : 'text-neutral-300'}`}>
                No matches found for "{query}"
              </p>
              <p className={`text-xs mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Try searching by movie title, show, song name, or artist
              </p>
            </div>
          ) : (
            <div className="text-center py-20 text-neutral-500">
              <Compass className={`w-10 h-10 mx-auto mb-3 ${isLight ? 'text-neutral-400' : 'text-[#DCFF7D]/50'}`} />
              <p className={`text-sm font-medium ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>Type anything to explore movies, shows, and music</p>
              <p className={`text-xs mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-600'}`}>Instant multi-source discovery across TMDB and online audio catalogs</p>
            </div>
          )}
        </div>
        {downloadToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-neutral-900 border border-white/10 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4 text-[var(--kino-mint)]" />
            <span>{downloadToast}</span>
          </div>
        )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
