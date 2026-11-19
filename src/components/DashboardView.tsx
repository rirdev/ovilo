import React, { useState } from 'react';
import {
  Play,
  Activity,
  Film,
  Headphones,
  Tv,
} from 'lucide-react';
import { WatchHistoryItem, FavoriteItem, MediaItem } from '../types';
import { getPosterUrl } from '../services/api';

interface DashboardViewProps {
  history: WatchHistoryItem[];
  favorites?: FavoriteItem[];
  profile?: any;
  onNavigateTab: (tab: string) => void;
  onPlayHistory?: (hist: WatchHistoryItem) => void;
  onPlayMedia?: (item: MediaItem, season?: number, episode?: number) => void;
  onSelectMedia?: (item: MediaItem) => void;
}

type TimeRange = 'All Time' | '30D' | '7D' | 'Today';
type FavFilter = 'All' | 'Movies' | 'TV';

const RANGES: Record<TimeRange, { h: string; t: number; fav: Record<FavFilter, number>; bars: number[]; note: string }> = {
  'All Time': { h: '142.5', t: 86, fav: { All: 24, Movies: 15, TV: 9 }, bars: [9, 12, 7, 14, 11, 18, 15], note: '86 titles watched (all)' },
  '30D': { h: '36.2', t: 23, fav: { All: 24, Movies: 15, TV: 9 }, bars: [4, 6, 3, 7, 5, 9, 8], note: '23 titles watched (30d)' },
  '7D': { h: '11.8', t: 8, fav: { All: 24, Movies: 15, TV: 9 }, bars: [1, 2, 0, 3, 2, 4, 3], note: '8 titles watched (7d)' },
  'Today': { h: '2.4', t: 3, fav: { All: 24, Movies: 15, TV: 9 }, bars: [0, 0, 0, 0, 0, 0, 3], note: '3 titles watched today' },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  history = [],
  favorites = [],
  profile,
  onNavigateTab,
  onPlayHistory,
  onSelectMedia,
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('All Time');
  const [selectedFav, setSelectedFav] = useState<FavFilter>('All');

  const rangeData = RANGES[selectedRange];
  const maxBar = Math.max(...rangeData.bars, 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const genres = [
    { name: 'Action & Adventure', pct: 46, desc: 'High-octane blockbusters & thrillers', color: 'bg-[#ff7a64]' },
    { name: 'Sci-Fi & Cyberpunk', pct: 28, desc: 'Futuristic epics & dystopian worlds', color: 'bg-[#ffd24d]' },
    { name: 'Animation & TV Series', pct: 16, desc: 'Top-rated animated & episodic sagas', color: 'bg-[#8f9cff]' },
    { name: 'Lo-Fi & Ambient Beats', pct: 10, desc: '13 tracks in music library', color: 'bg-[#a8e6c3]' },
  ];

  // Latest watched item
  const latestWatched = history.length > 0 ? history[0] : null;
  const jumpTitle = latestWatched?.title || '';
  const jumpPoster = latestWatched?.poster_path ? getPosterUrl(latestWatched.poster_path, 'w342') : null;

  const username = profile?.username || 'user';

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto select-none pb-12 font-['DM_Sans',sans-serif]">
      {/* 1. Header with Range Segments & Watch Movies Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-[40px] font-extrabold tracking-[-0.02em] text-[#f2efe9] font-['Bricolage_Grotesque',sans-serif] m-0">
          Dashboard
        </h1>
        <div className="flex items-center gap-3">
          {/* Range Segment */}
          <div className="flex bg-[#18181a] border border-[#34343a] rounded-full p-1 shadow-sm">
            {(['All Time', '30D', '7D', 'Today'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`h-[34px] px-4 rounded-full font-medium text-[13px] transition-all cursor-pointer border-0 ${
                  selectedRange === r
                    ? 'bg-[#ffd24d] text-[#141414] font-bold shadow-sm'
                    : 'text-[#a9a7a2] hover:text-[#f2efe9] bg-transparent'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Watch Movies Button */}
          <button
            onClick={() => onNavigateTab('movies')}
            className="flex items-center gap-2 h-11 px-5 rounded-full bg-[#ffd24d] text-[#141414] font-bold text-[14px] hover:brightness-105 transition-all cursor-pointer border-0 shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Watch Movies</span>
          </button>
        </div>
      </div>

      {/* 2. Jump Back In / Welcome Card */}
      {latestWatched ? (
        <div className="flex items-center gap-5.5 bg-[#18181a] border border-[#34343a] rounded-[32px] p-5 sm:p-6 shadow-sm">
          {/* Poster */}
          {jumpPoster && (
            <div className="w-[84px] h-[120px] rounded-2xl bg-[#222] flex items-end p-2 text-[#141414] font-extrabold text-[11px] leading-tight flex-shrink-0 overflow-hidden relative shadow-sm">
              <img src={jumpPoster} alt={jumpTitle} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 text-[12px] text-[#a9a7a2]">
              <span className="bg-[#ffd24d] text-[#141414] font-extrabold text-[11px] px-2.5 py-1 rounded-full tracking-[0.03em]">
                JUMP BACK IN
              </span>
              {latestWatched.media_type === 'tv' && (
                <span className="bg-[#2b2b2f] text-[#f2efe9] font-semibold text-[11px] px-2 py-0.5 rounded-full">
                  {latestWatched.season ? `S${latestWatched.season} : E${latestWatched.episode || 1}` : 'Series'}
                </span>
              )}
              <span>Last watched recently</span>
            </div>
            <h2 className="text-[30px] font-extrabold text-[#f2efe9] font-['Bricolage_Grotesque',sans-serif] mb-1 truncate">
              {jumpTitle}
            </h2>
            <p className="text-[13px] text-[#a9a7a2] mb-3">
              Pick up right where you left off with 1080p high-fidelity streaming.
            </p>
            <div className="w-full max-w-[320px] h-1.5 rounded-full bg-[#2b2b2f] overflow-hidden">
              <div className="h-full rounded-full bg-[#ffd24d] w-[68%]" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => {
                if (latestWatched && onPlayHistory) {
                  onPlayHistory(latestWatched);
                } else {
                  onNavigateTab('movies');
                }
              }}
              className="flex items-center gap-2 h-11 px-5 rounded-full bg-[#ffd24d] text-[#141414] font-bold text-[14px] hover:brightness-105 transition-all cursor-pointer border-0 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Now</span>
            </button>
            <button
              onClick={() => {
                if (latestWatched && onSelectMedia) {
                  onSelectMedia({
                    id: latestWatched.id,
                    title: latestWatched.title,
                    media_type: latestWatched.media_type,
                    poster_path: latestWatched.poster_path,
                    backdrop_path: latestWatched.backdrop_path,
                    overview: '',
                    vote_average: 8.5,
                  });
                } else {
                  onNavigateTab('movies');
                }
              }}
              className="h-11 px-5 rounded-full bg-[#2b2b2f] text-[#f2efe9] font-semibold text-[14px] hover:bg-[#34343a] transition-all cursor-pointer border-0"
            >
              Details
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-[#18181a] border border-[#34343a] rounded-[32px] p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#ffd24d] text-[#141414] font-extrabold text-[11px] px-2.5 py-1 rounded-full tracking-[0.03em]">
                GET STARTED
              </span>
              <span className="text-[12px] text-[#a9a7a2]">Welcome to Ovilo</span>
            </div>
            <h2 className="text-[28px] font-extrabold text-[#f2efe9] font-['Bricolage_Grotesque',sans-serif] mb-1">
              Start Streaming Today
            </h2>
            <p className="text-[13px] text-[#a9a7a2]">
              Explore trending blockbusters, binge television series, or listen to music with synchronized lyrics.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('movies')}
              className="flex items-center gap-2 h-11 px-5 rounded-full bg-[#ffd24d] text-[#141414] font-bold text-[14px] hover:brightness-105 transition-all cursor-pointer border-0 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Browse Movies</span>
            </button>
            <button
              onClick={() => onNavigateTab('music')}
              className="flex items-center gap-2 h-11 px-5 rounded-full bg-[#2b2b2f] text-[#f2efe9] font-semibold text-[14px] hover:bg-[#34343a] transition-all cursor-pointer border-0"
            >
              <Headphones className="w-4 h-4 text-[#a8e6c3]" />
              <span>Explore Music</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Watch Time (Yellow Accent) */}
        <div className="rounded-[28px] p-5 bg-[#ffd24d] text-[#141414] border border-[#ffd24d] min-h-[178px] flex flex-col relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-black/12 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#141414]" />
            </div>
            <span className="font-semibold text-[13px] text-black/70">TOTAL WATCH TIME</span>
          </div>
          <div className="text-[44px] leading-none font-extrabold font-['Bricolage_Grotesque',sans-serif] tracking-[-0.03em] mt-auto">
            {history.length > 0 ? (history.length * 1.5).toFixed(1) : '0.0'}
            <small className="text-[14px] font-medium font-sans text-black/70 tracking-normal ml-1.5">hours</small>
          </div>
          <div className="text-[12px] font-semibold mt-2.5 flex items-center gap-1.5 text-[#141414]">
            <Activity className="w-3.5 h-3.5" />
            <span>{history.length > 0 ? `${history.length} titles recorded` : 'No watch history yet'}</span>
          </div>
        </div>

        {/* Stat 2: Favorites Saved */}
        <div className="rounded-[28px] p-5 bg-[#18181a] border border-[#34343a] min-h-[178px] flex flex-col relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#2b2b2f] flex items-center justify-center">
              <Film className="w-5 h-5 text-[#f2efe9]" />
            </div>
            <div className="flex bg-[#222225] rounded-lg p-0.5 text-[11px]">
              {(['All', 'Movies', 'TV'] as FavFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFav(f)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all border-0 cursor-pointer ${
                    selectedFav === f ? 'bg-[#ffd24d] text-[#141414]' : 'text-[#a9a7a2] bg-transparent'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[44px] leading-none font-extrabold font-['Bricolage_Grotesque',sans-serif] tracking-[-0.03em] mt-auto text-[#f2efe9]">
            {favorites.length}
            <small className="text-[14px] font-medium font-sans text-[#a9a7a2] tracking-normal ml-1.5">favorites saved</small>
          </div>
          <div className="text-[12px] font-semibold mt-2.5 text-[#a8e6c3]">
            {profile ? `Synced to @${username}` : 'Guest Mode'}
          </div>
        </div>

        {/* Stat 3: Music Library */}
        <div className="rounded-[28px] p-5 bg-[#18181a] border border-[#34343a] min-h-[178px] flex flex-col relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#2b2b2f] flex items-center justify-center">
              <Headphones className="w-5 h-5 text-[#f2efe9]" />
            </div>
            <span className="font-semibold text-[13px] text-[#a9a7a2]">Music Library</span>
          </div>
          {/* Animated sound equalizer bars */}
          <div className="absolute right-5 top-5 flex items-end gap-1 h-7">
            {[14, 26, 20, 34, 22].map((h, i) => (
              <span key={i} style={{ height: `${h}px` }} className="w-1.5 rounded-sm bg-[#a8e6c3]" />
            ))}
          </div>
          <div className="text-[44px] leading-none font-extrabold font-['Bricolage_Grotesque',sans-serif] tracking-[-0.03em] mt-auto text-[#f2efe9]">
            0
            <small className="text-[14px] font-medium font-sans text-[#a9a7a2] tracking-normal ml-1.5">total tracks</small>
          </div>
          <div className="text-[12px] font-semibold mt-2.5 text-[#a8e6c3]">
            Library ready
          </div>
        </div>

        {/* Stat 4: Stream Quality */}
        <div className="rounded-[28px] p-5 bg-[#18181a] border border-[#34343a] min-h-[178px] flex flex-col relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#2b2b2f] flex items-center justify-center">
              <Tv className="w-5 h-5 text-[#f2efe9]" />
            </div>
            <span className="font-semibold text-[13px] text-[#a9a7a2]">Stream Quality</span>
          </div>
          <div className="text-[44px] leading-none font-extrabold font-['Bricolage_Grotesque',sans-serif] tracking-[-0.03em] mt-auto text-[#f2efe9] flex items-center">
            1080p
            <span className="text-[11px] font-extrabold bg-[#2b2b2f] text-[#a8e6c3] px-2 py-0.5 rounded-full ml-2">
              ULTRA HD
            </span>
          </div>
          <div className="text-[12px] font-semibold mt-2.5 text-[#a9a7a2]">
            Ad-Free · Lossless Hi-Fi Audio
          </div>
          {/* 5 quality bars */}
          <div className="flex gap-1.5 mt-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="flex-1 h-1.5 rounded-full bg-[#a8e6c3]" />
            ))}
          </div>
        </div>
      </div>

      {/* 4. Two-Column Dashboard Grid: Weekly Activity & Genres */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Left: Weekly Stream Activity Chart */}
        <div className="bg-[#18181a] border border-[#34343a] rounded-[28px] p-5.5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-[18px] font-extrabold text-[#f2efe9] font-['Bricolage_Grotesque',sans-serif] m-0">
                Weekly Stream Activity
              </h3>
              <small className="text-[#a9a7a2] text-[13px] font-sans">
                Titles watched grouped by day of week
              </small>
            </div>
            <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-[#2b2b2f] text-[#ffd24d] whitespace-nowrap">
              Today: Sun
            </span>
          </div>

          {/* 7-Bar Chart */}
          <div className="grid grid-cols-7 gap-3.5 h-[210px] items-end border-b border-[#34343a] pb-0">
            {rangeData.bars.map((val, i) => {
              const isToday = i === 6;
              const barHeightPct = Math.max(8, (val / maxBar) * 85);

              return (
                <div key={i} className="flex flex-col items-center justify-end h-full relative cursor-pointer group">
                  <span className="text-[12px] font-bold mb-1.5 transition-opacity opacity-0 group-hover:opacity-100 text-[#f2efe9]">
                    {val}
                  </span>
                  <div
                    style={{ height: `${barHeightPct}%` }}
                    className={`w-full rounded-xl transition-all duration-300 min-h-[12px] ${
                      isToday
                        ? 'bg-[#ffd24d]'
                        : 'bg-[#2b2b2f] group-hover:bg-[#8f9cff]'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Days Row */}
          <div className="grid grid-cols-7 gap-3.5 text-center text-[#a9a7a2] text-[12px] mt-2">
            {days.map((d, i) => (
              <span key={d} className={i === 6 ? 'text-[#ffd24d] font-bold' : ''}>
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Top Genres & Preferences */}
        <div className="bg-[#18181a] border border-[#34343a] rounded-[28px] p-5.5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[18px] font-extrabold text-[#f2efe9] font-['Bricolage_Grotesque',sans-serif] m-0">
                  Top Genres &amp; Preferences
                </h3>
                <small className="text-[#a9a7a2] text-[13px] font-sans">
                  Personalized taste profile
                </small>
              </div>
              <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-[#2b2b2f] text-[#a8e6c3] whitespace-nowrap">
                Adaptive
              </span>
            </div>

            {/* Genre Progress Rows */}
            <div className="flex flex-col gap-3.5">
              {genres.map((g) => (
                <div key={g.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[13px] font-semibold text-[#f2efe9]">
                    <span>{g.name}</span>
                    <span className="text-[#a9a7a2]">{g.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#2b2b2f] overflow-hidden">
                    <div style={{ width: `${g.pct * 2}%` }} className={`h-full rounded-full ${g.color}`} />
                  </div>
                  <small className="text-[#a9a7a2] text-[11px]">{g.desc}</small>
                </div>
              ))}
            </div>
          </div>

          {/* Algorithm Badge Footer */}
          <div className="flex justify-between items-center border-t border-[#34343a] pt-3 mt-4 text-[12px] text-[#a9a7a2]">
            <span>Taste Algorithm</span>
            <b className="text-[#ffd24d]">Auto-Tuned to Watch History</b>
          </div>
        </div>
      </div>
    </div>
  );
};
