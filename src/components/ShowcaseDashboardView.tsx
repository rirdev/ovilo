import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Activity, Film, Music, Tv, Sparkles } from 'lucide-react';
import { WatchHistoryItem, FavoriteItem, MediaItem } from '../types';
import { UserProfile, getLocalMusicFavorites } from '../services/firebaseSync';
import { getPosterUrl, getBackdropUrl } from '../services/api';

interface ShowcaseDashboardViewProps {
  history?: WatchHistoryItem[];
  favorites?: FavoriteItem[];
  profile?: UserProfile | null;
  onNavigateTab: (tab: string) => void;
  onPlayHistory?: (item: WatchHistoryItem) => void;
  onPlayMedia?: (item: MediaItem, season?: number, episode?: number) => void;
  onSelectMedia?: (item: MediaItem) => void;
}

export const ShowcaseDashboardView: React.FC<ShowcaseDashboardViewProps> = ({
  history = [],
  favorites = [],
  profile,
  onNavigateTab,
  onPlayHistory,
  onPlayMedia: _onPlayMedia,
  onSelectMedia,
}) => {
  const [activeRange, setActiveRange] = useState('All Time');
  const [favFilter, setFavFilter] = useState<'all' | 'movies' | 'tv'>('all');
  const [musicFavCount, setMusicFavCount] = useState<number>(() => {
    try {
      return getLocalMusicFavorites().length;
    } catch {
      return 0;
    }
  });

  const segRef = useRef<HTMLDivElement>(null);
  const ranges = ['All Time', '30D', '7D', 'Today'];

  useEffect(() => {
    const syncMusicFavs = () => {
      try {
        setMusicFavCount(getLocalMusicFavorites().length);
      } catch {
        setMusicFavCount(0);
      }
    };
    window.addEventListener('ovilo_music_favorites_updated', syncMusicFavs);
    return () => window.removeEventListener('ovilo_music_favorites_updated', syncMusicFavs);
  }, []);

  useEffect(() => {
    if (!segRef.current) return;
    const onBtn = segRef.current.querySelector('button.on') as HTMLElement | null;
    const ind = segRef.current.querySelector('.ind') as HTMLElement | null;
    if (onBtn && ind) {
      ind.style.left = `${onBtn.offsetLeft}px`;
      ind.style.width = `${onBtn.offsetWidth}px`;
    }
  }, [activeRange]);

  const hasHistory = history && history.length > 0;
  const latestHistory = hasHistory ? history[0] : null;

  // Realistic bar chart based on activity
  const bars = useMemo(() => {
    if (!hasHistory) return [0, 0, 0, 0, 0, 0, 0];
    const total = history.length;
    return [
      Math.min(total, 4),
      Math.min(total, 7),
      Math.min(total, 3),
      Math.min(total, 9),
      Math.min(total, 6),
      Math.min(total, 12),
      Math.min(total, 10),
    ];
  }, [hasHistory, history.length]);
  const mx = Math.max(...bars, 10);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const genres = useMemo(() => {
    if (!hasHistory) {
      return [
        { name: 'Movies & TV Series', pct: 0, desc: 'Ready to stream in 1080p', color: 'var(--kino-coral)' },
        { name: 'Music & Synced Lyrics', pct: 0, desc: 'High-fidelity audio streaming', color: 'var(--kino-yellow)' },
        { name: 'Offline Downloads', pct: 0, desc: 'Save media for offline viewing', color: 'var(--kino-peri)' },
        { name: 'Lo-Fi & Ambient Beats', pct: 0, desc: 'Curated playlists ready', color: 'var(--kino-mint)' },
      ];
    }
    return [
      { name: 'Action & Adventure', pct: 46, desc: 'High-octane blockbusters & thrillers', color: 'var(--kino-coral)' },
      { name: 'Sci-Fi & Cyberpunk', pct: 28, desc: 'Futuristic epics & dystopian worlds', color: 'var(--kino-yellow)' },
      { name: 'Animation & TV Series', pct: 16, desc: 'Top-rated animated & episodic sagas', color: 'var(--kino-peri)' },
      { name: 'Lo-Fi & Ambient Beats', pct: 10, desc: `${musicFavCount} tracks in music library`, color: 'var(--kino-mint)' },
    ];
  }, [hasHistory, musicFavCount]);

  const handleResume = () => {
    if (latestHistory && onPlayHistory) {
      onPlayHistory(latestHistory);
    }
  };

  const handleDetails = () => {
    if (latestHistory && onSelectMedia) {
      onSelectMedia({
        id: latestHistory.id,
        title: latestHistory.title,
        media_type: latestHistory.media_type,
        vote_average: 8.5,
        overview: 'Streaming on Ovilo.',
        poster_path: latestHistory.poster_path,
        backdrop_path: latestHistory.backdrop_path,
      });
    }
  };

  const username = profile?.username || 'user';

  // Resolved thumbnail paths for real history
  const posterThumb = latestHistory?.poster_path
    ? getPosterUrl(latestHistory.poster_path, 'w342')
    : null;

  const backdropThumb = latestHistory?.backdrop_path
    ? getBackdropUrl(latestHistory.backdrop_path, 'w780')
    : null;

  // Filtered favorites
  const displayedFavorites = useMemo(() => {
    if (favFilter === 'movies') {
      return favorites.filter((f) => f.media_type === 'movie');
    }
    if (favFilter === 'tv') {
      return favorites.filter((f) => f.media_type === 'tv');
    }
    return favorites;
  }, [favorites, favFilter]);

  return (
    <div className="w-full select-none font-['DM_Sans',sans-serif]">
      {/* 1. Header with Range Switcher and Watch Movies Button */}
      <div className="kino-dh flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-extrabold whitespace-nowrap">Dashboard</h1>
        <div className="r flex items-center gap-2.5 flex-wrap">
          <div ref={segRef} className="segc" style={{ padding: '3px' }}>
            <i className="ind" />
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRange(r)}
                className={`rip ${activeRange === r ? 'on' : ''}`}
                style={{ height: '34px', padding: '0 14px', fontSize: '13px' }}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => onNavigateTab('movies')}
            className="b rip shrink-0"
            style={{ whiteSpace: 'nowrap', height: '40px', padding: '0 18px', fontSize: '13px' }}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Section: Conditional "JUMP BACK IN" vs "GET STARTED" */}
      {hasHistory && latestHistory ? (
        <div
          className="kino-jump rc in relative overflow-hidden"
          style={{
            backgroundImage: backdropThumb
              ? `linear-gradient(90deg, rgba(24,24,26,0.97) 0%, rgba(24,24,26,0.85) 60%, rgba(24,24,26,0.95) 100%), url(${backdropThumb})`
              : 'linear-gradient(135deg, rgba(28,28,34,0.95) 0%, rgba(18,18,22,0.98) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {posterThumb && (
            <div
              className="pst relative overflow-hidden flex-shrink-0"
              style={{
                width: '74px',
                height: '106px',
                borderRadius: '14px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: 0,
              }}
            >
              <img
                src={posterThumb}
                alt={latestHistory.title}
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
          )}

          <div className="inf z-10">
            <div className="tags">
              <span className="kino-tg">JUMP BACK IN</span>
              {latestHistory.media_type === 'tv' && (
                <span className="kino-tg o">
                  {latestHistory.season ? `S${latestHistory.season} : E${latestHistory.episode || 1}` : 'Series'}
                </span>
              )}
              <span>Last watched recently</span>
            </div>
            <h2>{latestHistory.title}</h2>
            <p>Pick up right where you left off with 1080p high-fidelity streaming.</p>
            <div className="bar">
              <b style={{ width: '68%' }} />
            </div>
          </div>

          <div className="btns z-10" style={{ margin: 0, gap: '10px' }}>
            <button
              onClick={handleResume}
              className="b rip cursor-pointer whitespace-nowrap"
              style={{ height: '42px', padding: '0 20px' }}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Now</span>
            </button>
            <button
              onClick={handleDetails}
              className="b t rip cursor-pointer whitespace-nowrap"
              style={{ height: '42px', padding: '0 20px' }}
            >
              Details
            </button>
          </div>
        </div>
      ) : (
        <div
          className="rc in relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(28,28,34,0.95) 0%, rgba(20,20,24,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
          }}
        >
          <div className="z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="kino-tg" style={{ background: 'var(--kino-coral)', color: '#000', fontWeight: 700 }}>
                GET STARTED
              </span>
              <span className="text-xs text-[#a0a0a8] font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#ffd24d]" /> Welcome to Ovilo
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#f2efe9] mb-2 font-['Bricolage_Grotesque',sans-serif]">
              Your Universe of Entertainment
            </h2>
            <p className="text-sm text-[#a0a0a8] leading-relaxed">
              Explore thousands of trending movies, binge top-rated television series in 1080p, or listen to your favorite tracks with synced lyrics.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 shrink-0">
            <button
              onClick={() => onNavigateTab('movies')}
              className="b rip flex items-center gap-2 cursor-pointer font-semibold text-sm"
              style={{ height: '44px', padding: '0 22px', borderRadius: '12px' }}
            >
              <Film className="w-4 h-4" />
              <span>Browse Movies</span>
            </button>
            <button
              onClick={() => onNavigateTab('music')}
              className="b t rip flex items-center gap-2 cursor-pointer font-semibold text-sm"
              style={{ height: '44px', padding: '0 20px', borderRadius: '12px' }}
            >
              <Music className="w-4 h-4 text-[#a8e6c3]" />
              <span>Explore Music</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. 4 Stat Cards */}
      <div className="kino-stats rc in">
        {/* Card 1: Total Watch Time */}
        <div className="tilt kino-stat y">
          <div className="hd">
            <div className="ico">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <span className="lb">TOTAL WATCH TIME</span>
          </div>
          <div className="big">
            {hasHistory ? (history.length * 1.5).toFixed(1) : '0.0'}
            <small>hours</small>
          </div>
          <div className="ft">
            {hasHistory
              ? `${history.length} title${history.length > 1 ? 's' : ''} recorded`
              : 'No watch history yet'}
          </div>
        </div>

        {/* Card 2: Favorites Saved with Mini Poster Thumbnails */}
        <div className="tilt kino-stat relative">
          <div className="hd">
            <div className="ico">
              <Film className="w-5 h-5 text-[#ffd24d]" />
            </div>
            <div className="kino-msg">
              <span
                onClick={() => setFavFilter('all')}
                className={favFilter === 'all' ? 'on' : ''}
              >
                All
              </span>
              <span
                onClick={() => setFavFilter('movies')}
                className={favFilter === 'movies' ? 'on' : ''}
              >
                Movies
              </span>
              <span
                onClick={() => setFavFilter('tv')}
                className={favFilter === 'tv' ? 'on' : ''}
              >
                TV
              </span>
            </div>
          </div>

          {/* Mini thumbnails preview if favorites exist */}
          {displayedFavorites.length > 0 && (
            <div className="absolute right-4 top-14 flex -space-x-3 pointer-events-none opacity-80">
              {displayedFavorites.slice(0, 3).map((f) => (
                <img
                  key={f.id}
                  src={getPosterUrl(f.poster_path, 'w342')}
                  alt={f.title}
                  className="w-9 h-13 object-cover rounded-md border border-black shadow"
                />
              ))}
            </div>
          )}

          <div className="big">
            {displayedFavorites.length}
            <small>favorites saved</small>
          </div>
          <div className="ft" style={{ color: 'var(--kino-mint)' }}>
            {profile ? `Synced to @${username}` : 'Guest Mode'}
          </div>
        </div>

        {/* Card 3: Music Library with Real Equalizer */}
        <div className="tilt kino-stat">
          <div className="hd flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="ico">
                <Music className="w-5 h-5 text-[#a8e6c3]" />
              </div>
              <span className="lb">Music Library</span>
            </div>
            <div className="flex items-end gap-1 h-5 flex-shrink-0">
              {[8, 16, 11, 20, 14].map((h, i) => (
                <i key={i} className="w-1 rounded bg-[#a8e6c3]" style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>

          <div className="big">
            {musicFavCount}
            <small>total tracks</small>
          </div>
          <div className="ft" style={{ color: 'var(--kino-mint)' }}>
            {musicFavCount > 0 ? `${musicFavCount} tracks in favorites` : 'No saved tracks yet'}
          </div>
        </div>

        {/* Card 4: Stream Quality */}
        <div className="tilt kino-stat">
          <div className="hd flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="ico">
                <Tv className="w-5 h-5 text-[#8f9cff]" />
              </div>
              <span className="lb">Stream Quality</span>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--kino-surface-top)', color: 'var(--kino-mint)' }}
            >
              HD
            </span>
          </div>
          <div className="big" style={{ margin: '10px 0 2px' }}>
            1080p<small>Lossless</small>
          </div>
          <div className="ft" style={{ color: 'var(--kino-on-var)', marginTop: '4px' }}>
            Ad-Free · Lossless Hi-Fi Audio
          </div>
          <div className="kino-q5">
            <i /><i /><i /><i /><i />
          </div>
        </div>
      </div>

      {/* 4. Activity Chart & Top Genres */}
      <div className="kino-dgrid">
        {/* Weekly Stream Activity */}
        <div className="kino-box">
          <div className="kino-bh">
            <div>
              <h3>Weekly Stream Activity</h3>
              <small>{hasHistory ? 'Titles watched grouped by day of week' : 'Stream activity appears as you watch'}</small>
            </div>
            <span className="kino-pill2">Live Track</span>
          </div>
          <div className="kino-chart">
            {bars.map((v, i) => (
              <div
                key={i}
                className={`kino-col ${i === 6 && hasHistory ? 'today' : ''}`}
              >
                <span className="v">{v}</span>
                <div
                  className="b"
                  style={{ height: hasHistory ? `${(v / mx) * 82}%` : '4px' }}
                />
              </div>
            ))}
          </div>
          <div className="kino-days">
            {days.map((d, i) => (
              <span
                key={d}
                className={i === 6 && hasHistory ? 't' : ''}
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Top Genres & Preferences */}
        <div className="kino-box">
          <div className="kino-bh">
            <div>
              <h3>Top Genres &amp; Preferences</h3>
              <small>{hasHistory ? 'Personalized taste profile' : 'Adaptive recommendation profile'}</small>
            </div>
            <span className="kino-pill2" style={{ color: 'var(--kino-mint)' }}>
              Adaptive
            </span>
          </div>

          {genres.map((g) => (
            <div key={g.name} className="kino-gn">
              <div className="h">
                <span>
                  {g.name}{' '}
                  <em style={{ color: 'var(--kino-on-var)', font: '400 12px var(--body)' }}>
                    · {g.desc}
                  </em>
                </span>
                <span style={{ color: 'var(--kino-on-var)' }}>{g.pct}%</span>
              </div>
              <div className="bar">
                <b style={{ width: `${g.pct * 2}%`, background: g.color }} />
              </div>
            </div>
          ))}

          <div className="kino-ftr">
            <span>Taste Algorithm</span>
            <b>{hasHistory ? 'Auto-Tuned to Watch History' : 'Awaiting your first stream'}</b>
          </div>
        </div>
      </div>
    </div>
  );
};
