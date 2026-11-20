import React, { useState, useEffect } from 'react';
import { MediaItem, FavoriteItem, WatchHistoryItem } from '../types';
import { Play, Star, Loader2 } from 'lucide-react';
import { getBackdropUrl, FALLBACK_TRENDING, searchMulti } from '../services/api';
import { MovieFavoritesView } from './MovieFavoritesView';
import { MediaCard } from './MediaCard';
import { TopTenRow } from './TopTenRow';

interface ShowcaseMoviesViewProps {
  trendingItems?: MediaItem[];
  favorites?: FavoriteItem[];
  history?: WatchHistoryItem[];
  onPlay: (item: MediaItem, season?: number, episode?: number) => void;
  onSelect: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => void;
  searchQuery?: string;
}

export const ShowcaseMoviesView: React.FC<ShowcaseMoviesViewProps> = ({
  trendingItems = [],
  favorites = [],
  history = [],
  onPlay,
  onSelect,
  onToggleFavorite = () => {},
  searchQuery = '',
}) => {
  const [activeChip, setActiveChip] = useState('All');
  const chips = ['All', 'Favorites', 'Animation', 'Sci-fi', 'Series', 'Thriller', 'Drama', 'Comedy'];
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const q = searchQuery?.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCurrent = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchMulti(q);
        if (isCurrent) setSearchResults(res || []);
      } catch (err) {
        console.warn('Movie in-page search error:', err);
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const allItems = trendingItems.length > 0 ? trendingItems : FALLBACK_TRENDING;

  // Filter movies based on active chip
  const getFilteredItems = () => {
    if (activeChip === 'All') return allItems;
    if (activeChip === 'Animation') {
      return allItems.filter(
        (m) =>
          m.genre_ids?.includes(16) ||
          m.title?.toLowerCase().includes('arcane') ||
          m.title?.toLowerCase().includes('spider') ||
          m.name?.toLowerCase().includes('arcane')
      );
    }
    if (activeChip === 'Sci-fi') {
      return allItems.filter(
        (m) =>
          m.genre_ids?.includes(878) ||
          m.title?.toLowerCase().includes('dune') ||
          m.title?.toLowerCase().includes('fallout') ||
          m.name?.toLowerCase().includes('fallout')
      );
    }
    if (activeChip === 'Series') {
      return allItems.filter((m) => m.media_type === 'tv' || (!m.title && !!m.name));
    }
    return allItems;
  };

  const displayItems = getFilteredItems().length > 0 ? getFilteredItems() : allItems;
  const featured = displayItems[0] || allItems[0];
  const top10 = allItems.slice(0, 10);

  useEffect(() => {
    const handleOpen = () => {
      if (featured) onSelect(featured);
    };
    window.addEventListener('ovilo_open_featured_modal', handleOpen);
    return () => window.removeEventListener('ovilo_open_featured_modal', handleOpen);
  }, [featured, onSelect]);

  // If user selected "Favorites" chip, render the full dedicated MovieFavoritesView
  if (activeChip === 'Favorites') {
    return (
      <div className="w-full">
        <div className="kino-dh mb-4">
          <h1>Movies &amp; Series</h1>
          <div className="kino-chips">
            {chips.map((c) => (
              <span
                key={c}
                onClick={() => setActiveChip(c)}
                className={`kino-chip ${activeChip === c ? 'on' : ''}`}
              >
                {c === 'Favorites' ? `Favorites (${favorites.length})` : c}
              </span>
            ))}
          </div>
        </div>
        <MovieFavoritesView
          favorites={favorites}
          onPlay={(m) => onPlay(m, 1, 1)}
          onSelectMedia={onSelect}
          onToggleFavorite={onToggleFavorite}
          onBackToBrowse={() => setActiveChip('All')}
        />
      </div>
    );
  }

  // If search query is active, render the in-page Search Results grid
  if (searchQuery && searchQuery.trim()) {
    return (
      <div className="w-full select-none pb-14">
        <div className="kino-dh mb-4">
          <h1>Movies &amp; Series</h1>
          <div className="sec mb-2 flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
              {isSearching ? `Searching for "${searchQuery}"...` : `Search results for "${searchQuery}" (${searchResults.length})`}
            </h2>
          </div>
        </div>

        {isSearching ? (
          <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#ffd24d]" />
            <span className="text-xs">Searching movies &amp; series catalog...</span>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {searchResults.map((m) => (
              <MediaCard
                key={m.id}
                item={m}
                onSelect={onSelect}
                onPlay={onPlay}
                isFavorite={favorites.some((f) => f.id === m.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="kino-box p-12 text-center text-neutral-400 text-xs">
            No movies or series found matching "{searchQuery}".
          </div>
        )}
      </div>
    );
  }

  // Curated animation & sci-fi rows with rich real thumbnails
  const animationMovies: MediaItem[] = [
    {
      id: 94605,
      title: 'Arcane',
      name: 'Arcane',
      poster_path: '/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
      backdrop_path: null,
      media_type: 'tv',
      vote_average: 8.7,
      overview: 'League of Legends universe saga.',
    },
    {
      id: 569094,
      title: 'Spider-Verse',
      poster_path: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
      backdrop_path: null,
      media_type: 'movie',
      vote_average: 8.4,
      overview: 'Miles Morales across the multiverse.',
    },
    {
      id: 519182,
      title: 'Despicable Me 4',
      poster_path: '/wWba3TaojhK7NdycRhoQpsG0FaH.jpg',
      backdrop_path: null,
      media_type: 'movie',
      vote_average: 7.2,
      overview: 'Gru and the minions return.',
    },
    {
      id: 1022789,
      title: 'Inside Out 2',
      poster_path: '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
      backdrop_path: null,
      media_type: 'movie',
      vote_average: 7.6,
      overview: 'Joy, Sadness and Anxiety explore new emotions.',
    },
    {
      id: 1429,
      title: 'Attack on Titan',
      name: 'Attack on Titan',
      poster_path: '/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
      backdrop_path: null,
      media_type: 'tv',
      vote_average: 8.7,
      overview: 'Humanity battles against the colossal Titans.',
    },
    {
      id: 129,
      title: 'Spirited Away',
      poster_path: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
      backdrop_path: null,
      media_type: 'movie',
      vote_average: 8.5,
      overview: 'Chihiro wanders into a world ruled by gods and witches.',
    },
  ];

  const scifiMovies: MediaItem[] = [
    {
      id: 693134,
      title: 'Dune: Part Two',
      poster_path: '/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
      backdrop_path: null,
      media_type: 'movie',
      vote_average: 8.2,
      overview: 'Paul Atreides unites with the Fremen.',
    },
    {
      id: 106379,
      title: 'Fallout',
      name: 'Fallout',
      poster_path: '/ansA92iV2nC9Z7i4n4aC8aK9v6u.jpg',
      backdrop_path: null,
      media_type: 'tv',
      vote_average: 8.3,
      overview: 'Post-apocalyptic wasteland survival.',
    },
    {
      id: 872585,
      title: 'Oppenheimer',
      poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      backdrop_path: null,
      media_type: 'movie',
      vote_average: 8.1,
      overview: 'The creation of the atomic bomb.',
    },
    {
      id: 93405,
      title: 'Squid Game',
      name: 'Squid Game',
      poster_path: '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
      backdrop_path: null,
      media_type: 'tv',
      vote_average: 7.8,
      overview: 'Deadly survival games for a massive prize.',
    },
    {
      id: 157336,
      title: 'Interstellar',
      poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop_path: null,
      media_type: 'movie',
      vote_average: 8.4,
      overview: 'A team of explorers travel through a wormhole in space.',
    },
    {
      id: 335984,
      title: 'Blade Runner 2049',
      poster_path: '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
      backdrop_path: null,
      media_type: 'movie',
      vote_average: 7.6,
      overview: 'Officer K unearths a long-buried secret.',
    },
  ];

  const tvSeries: MediaItem[] = [
    {
      id: 1399,
      name: 'Game of Thrones',
      poster_path: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
      backdrop_path: null,
      media_type: 'tv',
      vote_average: 8.4,
      overview: 'Nine noble families fight for control over the lands of Westeros.',
    },
    {
      id: 66732,
      name: 'Stranger Things',
      poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
      backdrop_path: null,
      media_type: 'tv',
      vote_average: 8.6,
      overview: 'A young boy vanishes into an alternate dimension.',
    },
    {
      id: 60059,
      name: 'Better Call Saul',
      poster_path: '/fC2HDm5t0kHsf72TmF7KiZgQ29f.jpg',
      backdrop_path: null,
      media_type: 'tv',
      vote_average: 8.7,
      overview: 'The trials and tribulations of criminal lawyer Jimmy McGill.',
    },
    {
      id: 1396,
      name: 'Breaking Bad',
      poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
      backdrop_path: null,
      media_type: 'tv',
      vote_average: 8.9,
      overview: 'A chemistry teacher diagnosed with lung cancer turns to meth.',
    },
  ];

  const backdropImage = getBackdropUrl(featured?.backdrop_path || featured?.poster_path || null);

  return (
    <div className="w-full select-none font-['DM_Sans',sans-serif] pb-16">
      {/* 1. Header with Chips */}
      <div className="kino-dh flex items-center justify-between gap-4 mb-4">
        <h1 className="text-3xl font-extrabold whitespace-nowrap shrink-0">Movies &amp; Series</h1>
        <div className="kino-chips flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {chips.map((c) => (
            <span
              key={c}
              onClick={() => setActiveChip(c)}
              className={`kino-chip whitespace-nowrap shrink-0 ${activeChip === c ? 'on' : ''}`}
            >
              {c === 'Favorites' ? `Favorites (${favorites.length})` : c}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Hero Banner with Real Backdrop Thumbnail + Vinyl Disc Cutout */}
      <div
        className="kino-hero relative overflow-hidden"
        style={{
          height: '210px',
          backgroundImage: `linear-gradient(90deg, rgba(15,15,16,0.96) 0%, rgba(15,15,16,0.78) 50%, rgba(15,15,16,0.9) 100%), url(${backdropImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
        }}
      >
        <div className="kino-disc" style={{ opacity: 0.85 }} />

        <div className="relative z-10 flex items-end justify-between w-full h-full">
          <div className="flex flex-col justify-end max-w-[65%]">
            <span className="kino-tag">#1 this week</span>
            <div
              className="t"
              style={{
                fontSize: '36px',
                lineHeight: 1.05,
                color: '#fff',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {featured.title || featured.name || 'The Odyssey'}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[#f2efe9] text-[13px] font-medium">
              <span className="flex items-center gap-1 text-[#ffd24d] font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                {featured.vote_average ? featured.vote_average.toFixed(1) : '8.4'}
              </span>
              <span className="text-[#a9a7a2]">·</span>
              <span className="text-[#a9a7a2]">
                {(featured.release_date || featured.first_air_date || '2024').slice(0, 4)}
              </span>
              <span className="text-[#a9a7a2]">·</span>
              <span className="text-[#a9a7a2] uppercase text-[11px] font-bold tracking-wider">
                {featured.media_type === 'tv' ? 'TV Series' : 'Movie'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 mb-1 flex-shrink-0">
            <button
              onClick={() => onSelect(featured)}
              className="kino-btn rip cursor-pointer whitespace-nowrap"
              style={{ height: '38px', padding: '0 14px', fontSize: '13px' }}
            >
              Details
            </button>
            <button
              onClick={() => onPlay(featured, 1, 1)}
              className="kino-btn y rip cursor-pointer whitespace-nowrap"
              style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Continue Watching (History) if exists */}
      {history.length > 0 && (
        <div style={{ margin: '18px 0 10px' }}>
          <div className="kino-sec">
            <h2>Continue Watching</h2>
            <span onClick={() => setActiveChip('Favorites')}>Saved ({favorites.length})</span>
          </div>
          <div className="kino-row" style={{ gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
            {history.slice(0, 8).map((h) => {
              const mediaObj: MediaItem = {
                id: h.id,
                title: h.title,
                poster_path: h.poster_path,
                backdrop_path: h.backdrop_path,
                media_type: h.media_type,
                overview: '',
                vote_average: 8.0,
              };

              return (
                <MediaCard
                  key={`hist-${h.id}`}
                  item={mediaObj}
                  onSelect={onSelect}
                  onPlay={(item) => onPlay(item, h.season, h.episode)}
                  isFavorite={favorites.some((f) => f.id === h.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Top 10 This Week with Outline Numbers */}
      <TopTenRow items={top10} onSelect={onSelect} onPlay={onPlay} />

      {/* 5. Trending Movies & Sagas */}
      <div style={{ margin: '18px 0 10px' }}>
        <div className="kino-sec">
          <h2>Trending Movies &amp; Sagas</h2>
          <span>Popular</span>
        </div>
        <div className="kino-row" style={{ gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
          {allItems.slice(0, 10).map((m) => (
            <MediaCard
              key={`trend-${m.id}`}
              item={m}
              onSelect={onSelect}
              onPlay={onPlay}
              isFavorite={favorites.some((f) => f.id === m.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>

      {/* 6. Top Rated TV Series */}
      <div style={{ margin: '18px 0 10px' }}>
        <div className="kino-sec">
          <h2>Top Rated TV Series</h2>
          <span>Episodes</span>
        </div>
        <div className="kino-row" style={{ gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
          {tvSeries.map((s) => (
            <MediaCard
              key={`series-${s.id}`}
              item={s}
              onSelect={onSelect}
              onPlay={onPlay}
              isFavorite={favorites.some((f) => f.id === s.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>

      {/* 7. Animation Row */}
      <div style={{ margin: '18px 0 10px' }}>
        <div className="kino-sec">
          <h2>Animation &amp; Anime</h2>
          <span>Explore</span>
        </div>
        <div className="kino-row" style={{ gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
          {animationMovies.map((m) => (
            <MediaCard
              key={`anim-${m.id}`}
              item={m}
              onSelect={onSelect}
              onPlay={onPlay}
              isFavorite={favorites.some((f) => f.id === m.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>

      {/* 8. Sci-Fi & Cyberpunk Row */}
      <div style={{ margin: '18px 0 10px' }}>
        <div className="kino-sec">
          <h2>Sci-Fi &amp; Cyberpunk</h2>
          <span>Explore</span>
        </div>
        <div className="kino-row" style={{ gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
          {scifiMovies.map((m) => (
            <MediaCard
              key={`scifi-${m.id}`}
              item={m}
              onSelect={onSelect}
              onPlay={onPlay}
              isFavorite={favorites.some((f) => f.id === m.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
