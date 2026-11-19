import React, { useState, useRef, useEffect } from 'react';
import { Play, Activity, Film, Music, Tv } from 'lucide-react';
import { WatchHistoryItem, FavoriteItem, MediaItem } from '../types';
import { UserProfile } from '../services/firebaseSync';
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
  onPlayMedia,
  onSelectMedia,
}) => {
  const [activeRange, setActiveRange] = useState('All Time');
  const [favFilter, setFavFilter] = useState<'all' | 'movies' | 'tv'>('all');
  const segRef = useRef<HTMLDivElement>(null);

  const ranges = ['All Time', '30D', '7D', 'Today'];

  useEffect(() => {
    if (!segRef.current) return;
    const onBtn = segRef.current.querySelector('button.on') as HTMLElement | null;
    const ind = segRef.current.querySelector('.ind') as HTMLElement | null;
    if (onBtn && ind) {
      ind.style.left = `${onBtn.offsetLeft}px`;
      ind.style.width = `${onBtn.offsetWidth}px`;
    }
  }, [activeRange]);

  const bars = [9, 12, 7, 14, 11, 18, 15];
  const mx = 18;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const genres = [
    { name: 'Action & Adventure', pct: 46, desc: 'High-octane blockbusters & thrillers', color: 'var(--kino-coral)' },
    { name: 'Sci-Fi & Cyberpunk', pct: 28, desc: 'Futuristic epics & dystopian worlds', color: 'var(--kino-yellow)' },
    { name: 'Animation & TV Series', pct: 16, desc: 'Top-rated animated & episodic sagas', color: 'var(--kino-peri)' },
    { name: 'Lo-Fi & Ambient Beats', pct: 10, desc: '13 tracks in music library', color: 'var(--kino-mint)' },
  ];

  const latestHistory = history[0];

  const handleResume = () => {
    if (latestHistory && onPlayHistory) {
      onPlayHistory(latestHistory);
    } else if (onPlayMedia) {
      onPlayMedia(
        {
          id: 1100,
          title: 'Dexter: Resurrection',
          media_type: 'tv',
          vote_average: 8.9,
          overview: 'High-fidelity streaming.',
          poster_path: '/ansA92iV2nC9Z7i4n4aC8aK9v6u.jpg',
          backdrop_path: '/4woSOUD0equAYzvwhWBHIJDCM88.jpg',
        },
        1,
        6
      );
    }
  };

  const handleDetails = () => {
    if (onSelectMedia) {
      onSelectMedia({
        id: latestHistory?.id || 1100,
        title: latestHistory?.title || 'Dexter: Resurrection',
        media_type: (latestHistory?.media_type as any) || 'tv',
        vote_average: 8.9,
        overview: 'High-fidelity streaming.',
        poster_path: latestHistory?.poster_path || '/ansA92iV2nC9Z7i4n4aC8aK9v6u.jpg',
        backdrop_path: latestHistory?.backdrop_path || '/4woSOUD0equAYzvwhWBHIJDCM88.jpg',
      });
    }
  };

  const username = profile?.username || 'terabyte';

  // Resolved thumbnail paths
  const posterThumb = latestHistory?.poster_path
    ? getPosterUrl(latestHistory.poster_path, 'w342')
    : 'https://image.tmdb.org/t/p/w500/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg';

  const backdropThumb = latestHistory?.backdrop_path
    ? getBackdropUrl(latestHistory.backdrop_path, 'w780')
    : 'https://image.tmdb.org/t/p/w780/4woSOUD0equAYzvwhWBHIJDCM88.jpg';

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

      {/* 2. Jump Back In Card with Real Poster & Backdrop Thumbnails */}
      <div
        className="kino-jump rc in relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(24,24,26,0.97) 0%, rgba(24,24,26,0.85) 60%, rgba(24,24,26,0.95) 100%), url(${backdropThumb})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Real Poster Thumbnail */}
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
            alt={latestHistory?.title || 'Dexter'}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://image.tmdb.org/t/p/w500/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg';
            }}
            className="w-full h-full object-cover rounded-[14px]"
          />
        </div>

        <div className="inf z-10">
          <div className="tags">
            <span className="kino-tg">JUMP BACK IN</span>
            <span className="kino-tg o">
              {latestHistory?.season ? `S${latestHistory.season} : E${latestHistory.episode || 1}` : 'S1 : E5'}
            </span>
            <span>Last watched today</span>
          </div>
          <h2>{latestHistory?.title || 'Dexter: Resurrection'}</h2>
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
            142.5<small>hours</small>
          </div>
          <div className="ft">
            {history.length > 0 ? `${history.length} titles recorded` : '86 titles watched (all)'}
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
          {favorites.length > 0 && (
            <div className="absolute right-4 top-14 flex -space-x-3 pointer-events-none opacity-80">
              {favorites.slice(0, 3).map((f) => (
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
            {favorites.length > 0 ? favorites.length : 24}
            <small>favorites saved</small>
          </div>
          <div className="ft" style={{ color: 'var(--kino-mint)' }}>
            Synced to @{username}
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
            27<small>total tracks</small>
          </div>
          <div className="ft" style={{ color: 'var(--kino-mint)' }}>
            13 local · 14 favorited
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
              <small>Titles watched grouped by day of week</small>
            </div>
            <span className="kino-pill2">Today: Sun</span>
          </div>
          <div className="kino-chart">
            {bars.map((v, i) => (
              <div
                key={i}
                className={`kino-col ${i === 6 ? 'today' : ''}`}
              >
                <span className="v">{v}</span>
                <div
                  className="b"
                  style={{ height: `${(v / mx) * 82}%` }}
                />
              </div>
            ))}
          </div>
          <div className="kino-days">
            {days.map((d, i) => (
              <span
                key={d}
                className={i === 6 ? 't' : ''}
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
              <small>Personalized taste profile</small>
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
            <b>Auto-Tuned to Watch History</b>
          </div>
        </div>
      </div>
    </div>
  );
};
