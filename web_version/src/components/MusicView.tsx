import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAudio, MUSIC_FALLBACK_SVG } from '../context/AudioContext';
import {
  scanLocalMusic,
  searchOnlineMusic,
  fetchTrendingMusic,
} from '../services/api';
import { MusicTrack } from '../types';
import {
  getLocalMusicFavorites,
  saveLocalMusicFavorites,
  getLocalProfile,
  syncToCloud,
  fetchCloudData,
} from '../services/firebaseSync';
import { startDownload } from '../services/downloadManager';
import { isSameTrack, isTrackInList, getMusicDownloadUrl } from '../lib/musicUtils';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Heart,
  Settings,
  Compass,
  HardDrive,
  Music as MusicIcon,
  FolderOpen,
  Shuffle,
  TrendingUp,
  Flame,
  Trash2,
  Download,
  Check,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MusicViewProps {
  currentSubView?: 'home' | 'search' | 'library' | 'favorites';
  onNavigateSubView?: (view: 'home' | 'search' | 'library' | 'favorites') => void;
  onOpenSettings?: () => void;
}

export const MusicView: React.FC<MusicViewProps> = ({
  currentSubView = 'home',
  onNavigateSubView,
  onOpenSettings,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, getTrackArtwork } = useAudio();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';
  const isLime = theme === 'dark';

  const containerClass = isLight
    ? 'bg-[#F4F5F7] text-neutral-900'
    : isCobalt
    ? 'bg-[#080D1A] text-slate-100'
    : 'bg-[#0B0B0D] text-white';

  const cardClass = isLight
    ? 'bg-white border-neutral-200/90 text-neutral-900 shadow-sm'
    : 'bg-[#17181d] border-white/8 text-white shadow-xl';

  const subCardClass = isLight
    ? 'bg-neutral-50 border-neutral-200 text-neutral-900'
    : 'bg-[#202127] border-white/8 text-neutral-200';

  const inputClass = isLight
    ? 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 shadow-sm'
    : isCobalt
    ? 'bg-[#121215] border-white/10 text-white placeholder-neutral-500 focus:border-[#2F6BFE]'
    : 'bg-[#121215] border-white/10 text-white placeholder-neutral-500 focus:border-[#DCFF7D]/50';

  const primaryBtnClass = isLight
    ? 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm'
    : isCobalt
    ? 'bg-[#2F6BFE] hover:bg-[#2557d6] text-white shadow-md shadow-[#2F6BFE]/30'
    : 'bg-[#DCFF7D] hover:bg-[#c9f164] text-[#0B0B0D] shadow-md shadow-[#DCFF7D]/20';

  const activePillClass = isLight
    ? 'bg-neutral-900 text-white font-bold shadow-sm'
    : isCobalt
    ? 'bg-[#2F6BFE] text-white font-bold shadow-md shadow-[#2F6BFE]/30'
    : 'bg-[#DCFF7D] text-[#0B0B0D] font-bold shadow-md shadow-[#DCFF7D]/20';

  const inactivePillClass = isLight
    ? 'bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200 shadow-sm'
    : 'bg-[#17181d] hover:bg-[#202127] text-neutral-300 hover:text-white border border-white/8';

  const accentColorText = isLight
    ? 'text-neutral-900'
    : isCobalt
    ? 'text-[#38BDF8]'
    : 'text-[#DCFF7D]';

  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'favorites'>(
    (currentSubView as any) || 'home'
  );
  const [favoriteTracks, setFavoriteTracks] = useState<MusicTrack[]>(() => getLocalMusicFavorites());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(
    () => new Set(getLocalMusicFavorites().map((t) => t.id))
  );

  const [profile, setProfile] = useState(() => getLocalProfile());

  const [downloadingTrackIds, setDownloadingTrackIds] = useState<Set<string>>(new Set());
  const [musicToast, setMusicToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleProfileSync = () => {
      setProfile(getLocalProfile());
      const favs = getLocalMusicFavorites();
      setFavoriteTracks(favs);
      setLikedTrackIds(new Set(favs.map((t) => t.id)));
    };
    const handleMusicFavsSync = () => {
      const favs = getLocalMusicFavorites();
      setFavoriteTracks(favs);
      setLikedTrackIds(new Set(favs.map((t) => t.id)));
    };
    const handleDownloadsSync = () => {
      scanLocalMusic().then((tracks) => {
        if (tracks) setLocalTracks(tracks);
      });
    };
    window.addEventListener('ovilo_profile_updated', handleProfileSync);
    window.addEventListener('ovilo_music_favorites_updated', handleMusicFavsSync);
    window.addEventListener('ovilo_downloads_sync', handleDownloadsSync);
    return () => {
      window.removeEventListener('ovilo_profile_updated', handleProfileSync);
      window.removeEventListener('ovilo_music_favorites_updated', handleMusicFavsSync);
      window.removeEventListener('ovilo_downloads_sync', handleDownloadsSync);
    };
  }, []);

  // Tracks states
  const [localTracks, setLocalTracks] = useState<MusicTrack[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<MusicTrack[]>([]);
  const [categoryTracks, setCategoryTracks] = useState<MusicTrack[]>([]);
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);

  // Local library search query
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Favorites page search query & sort
  const [favSearchQuery, setFavSearchQuery] = useState('');
  const [favSort, setFavSort] = useState<'recent' | 'title' | 'artist'>('recent');

  // CoverFlow Carousel active center index (centered on item 2 by default)
  const [activeIndex, setActiveIndex] = useState(2);

  // Horizontal scroll references
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const popularScrollRef = useRef<HTMLDivElement>(null);

  // Categories list matching top online streaming genres
  const categories = [
    'All',
    'Pop',
    'Hip-Hop',
    'Lo-Fi',
    'Relax',
    'Party',
    'Rock',
    'Indie',
    'Electronic',
    'Jazz',
    'R&B',
    'Country',
    'Romance',
  ];

  // Rich initial visual online library (32 well-curated hits across genres)
  const mockHeroTracks: MusicTrack[] = [
    {
      id: 'mock_1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      duration: 200,
      artwork_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_2',
      title: 'Levitating',
      artist: 'Dua Lipa',
      album: 'Future Nostalgia',
      duration: 203,
      artwork_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_3',
      title: 'As It Was',
      artist: 'Harry Styles',
      album: "Harry's House",
      duration: 167,
      artwork_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_4',
      title: 'Birds of a Feather',
      artist: 'Billie Eilish',
      album: 'HIT ME HARD AND SOFT',
      duration: 196,
      artwork_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_5',
      title: 'Starboy',
      artist: 'The Weeknd ft. Daft Punk',
      album: 'Starboy',
      duration: 230,
      artwork_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_6',
      title: 'Not Like Us',
      artist: 'Kendrick Lamar',
      album: 'Single',
      duration: 274,
      artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_7',
      title: 'Espresso',
      artist: 'Sabrina Carpenter',
      album: 'Short n Sweet',
      duration: 175,
      artwork_url: 'https://images.unsplash.com/photo-1445985543470-41fdd6ce388d?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_8',
      title: 'Cruel Summer',
      artist: 'Taylor Swift',
      album: 'Lover',
      duration: 178,
      artwork_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_9',
      title: 'Good Luck, Babe!',
      artist: 'Chappell Roan',
      album: 'Single',
      duration: 218,
      artwork_url: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_10',
      title: 'Lose Control',
      artist: 'Teddy Swims',
      album: "I've Tried Everything But Therapy",
      duration: 210,
      artwork_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_11',
      title: 'Beautiful Things',
      artist: 'Benson Boone',
      album: 'Fireworks & Rollerblades',
      duration: 180,
      artwork_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_12',
      title: 'Snooze',
      artist: 'SZA',
      album: 'SOS',
      duration: 201,
      artwork_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_13',
      title: 'Paint The Town Red',
      artist: 'Doja Cat',
      album: 'Scarlet',
      duration: 231,
      artwork_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_14',
      title: 'Greedy',
      artist: 'Tate McRae',
      album: 'THINK LATER',
      duration: 131,
      artwork_url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_15',
      title: 'Vampire',
      artist: 'Olivia Rodrigo',
      album: 'GUTS',
      duration: 219,
      artwork_url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
    {
      id: 'mock_16',
      title: 'Sunflower',
      artist: 'Post Malone & Swae Lee',
      album: 'Spider-Man: Into the Spider-Verse',
      duration: 158,
      artwork_url: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?q=80&w=800&auto=format&fit=crop',
      stream_url: '',
      is_local: false,
      has_lyrics: true,
    },
  ];

  // Specific background container styling for each popular song card matching the mockup
  const popularCardTints = [
    'bg-[#2A1612] border-[#44231C]', // warm rust
    'bg-[#0C2423] border-[#183E3C]', // deep emerald teal
    'bg-[#13192D] border-[#202949]', // midnight navy
    'bg-[#2E200F] border-[#4A341A]', // warm amber
    'bg-[#13242A] border-[#1E3A44]', // ocean slate
    'bg-[#2A1014] border-[#451B21]', // crimson
  ];

  // Sync subview from props
  useEffect(() => {
    if (currentSubView === 'library') setActiveTab('library');
    else if (currentSubView === 'favorites') setActiveTab('favorites');
    else if (currentSubView === 'home') setActiveTab('home');
  }, [currentSubView]);

  // Load online trending music and scan local music on mount
  useEffect(() => {
    let isMounted = true;

    // Fetch real online trending music (100 tracks from iTunes RSS)
    fetchTrendingMusic().then((online) => {
      if (isMounted && online && online.length > 0) {
        setTrendingTracks(online);
      }
    });

    // Scan local music for the Library subview only
    scanLocalMusic().then((tracks) => {
      if (isMounted && tracks && tracks.length > 0) {
        setLocalTracks(tracks);
      }
    });

    // Hydrate music favorites from cloud if signed in
    const curProfile = getLocalProfile();
    if (curProfile && !curProfile.isGuest && curProfile.username) {
      fetchCloudData(curProfile.username).then((cloud) => {
        if (isMounted && cloud && Array.isArray(cloud.musicFavorites) && cloud.musicFavorites.length > 0) {
          saveLocalMusicFavorites(cloud.musicFavorites);
          setFavoriteTracks(cloud.musicFavorites);
          setLikedTrackIds(new Set(cloud.musicFavorites.map((t) => t.id)));
        }
      }).catch(console.warn);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Search Input
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchOnlineMusic(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Category Click -> dynamic online music retrieval
  const handleSelectCategory = async (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      setCategoryTracks([]);
      return;
    }

    setIsLoadingCategory(true);
    try {
      const q =
        cat === 'Lo-Fi'
          ? 'lofi chill beats'
          : cat === 'Relax'
          ? 'acoustic chill acoustic'
          : cat === 'Party'
          ? 'dance party hits'
          : `${cat} top hits`;
      const res = await searchOnlineMusic(q);
      if (res && res.length > 0) {
        setCategoryTracks(res);
      }
    } catch (e) {
      console.warn('Category search error:', e);
    } finally {
      setIsLoadingCategory(false);
    }
  };

  // Online library track slices
  const activeCatalog = trendingTracks.length > 0 ? trendingTracks : mockHeroTracks;

  // Hero CoverFlow Carousel tracks: 8 tracks
  const heroCarouselTracks = activeCatalog.slice(0, 8);

  // Popular / Category songs row: 20+ tracks
  const popularTracks =
    activeCategory !== 'All' && categoryTracks.length > 0
      ? categoryTracks.slice(0, 24)
      : activeCatalog.length > 8
      ? activeCatalog.slice(8, 32)
      : activeCatalog;

  // Global Top Charts: 50 online tracks
  const chartTracks =
    activeCategory !== 'All' && categoryTracks.length > 24
      ? categoryTracks.slice(24)
      : activeCatalog.length > 32
      ? activeCatalog.slice(32, 82)
      : activeCatalog;

  const isTrackLiked = (track: MusicTrack): boolean => {
    if (!track) return false;
    return likedTrackIds.has(track.id) || isTrackInList(track, favoriteTracks);
  };

  const isTrackDownloaded = (track: MusicTrack): boolean => {
    if (!track) return false;
    return track.is_local || isTrackInList(track, localTracks);
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setMusicToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setMusicToast(null);
    }, 3200);
  };

  const handleDownloadMusic = async (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTrackDownloaded(track)) {
      showToast(`"${track.title}" is already in your offline library!`, 'info');
      return;
    }
    if (downloadingTrackIds.has(track.id)) {
      showToast(`Downloading "${track.title}"...`, 'info');
      return;
    }

    setDownloadingTrackIds((prev) => new Set(prev).add(track.id));
    showToast(`Downloading "${track.title}" (MP3 320k)...`, 'info');

    try {
      const url = getMusicDownloadUrl(track);
      await startDownload({
        url,
        title: `${track.artist} - ${track.title}`,
        formatType: 'audio_mp3',
        formatLabel: 'MP3 320k',
        thumbnail: track.artwork_url,
        uploader: track.artist,
      });
      showToast(`Download started: "${track.title}"! Available offline once finished.`, 'success');
    } catch (err: any) {
      setDownloadingTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
      showToast(`Download failed: ${err?.message || err}`, 'error');
    } finally {
      setTimeout(() => {
        setDownloadingTrackIds((prev) => {
          const next = new Set(prev);
          next.delete(track.id);
          return next;
        });
      }, 5000);
    }
  };

  // Toggle favorite with persistence & cloud sync (supports smart fuzzy matching)
  const handleToggleFavorite = (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiked = isTrackLiked(track);
    let updated: MusicTrack[];
    if (isLiked) {
      updated = favoriteTracks.filter((t) => !isSameTrack(t, track));
      setLikedTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        favoriteTracks.forEach((t) => {
          if (isSameTrack(t, track)) next.delete(t.id);
        });
        return next;
      });
    } else {
      updated = [track, ...favoriteTracks.filter((t) => !isSameTrack(t, track))];
      setLikedTrackIds((prev) => {
        const next = new Set(prev);
        next.add(track.id);
        return next;
      });
    }
    setFavoriteTracks(updated);
    saveLocalMusicFavorites(updated);

    const userProfile = getLocalProfile();
    if (userProfile && !userProfile.isGuest && userProfile.username) {
      syncToCloud(userProfile.username, { musicFavorites: updated }).catch((err) =>
        console.error('Failed to sync music favorites to cloud:', err)
      );
    }
  };

  // Scroll helpers for < > chevrons
  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const offset = direction === 'left' ? -380 : 380;
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Filtered local tracks for the Library view
  const filteredLocalTracks = localTracks.filter(
    (t) =>
      t.title.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(localSearchQuery.toLowerCase())
  );

  // Filtered & sorted favorite tracks for dedicated Favorites View
  const filteredFavorites = useMemo(() => {
    let list = [...favoriteTracks];
    if (favSearchQuery.trim()) {
      const q = favSearchQuery.toLowerCase().trim();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
    }
    if (favSort === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (favSort === 'artist') {
      list.sort((a, b) => a.artist.localeCompare(b.artist));
    }
    return list;
  }, [favoriteTracks, favSearchQuery, favSort]);

  // Total favorites listening duration
  const totalFavDurationFormatted = useMemo(() => {
    const totalSec = favoriteTracks.reduce((acc, t) => acc + (t.duration || 210), 0);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }, [favoriteTracks]);

  return (
    <div className={`min-h-full w-full p-6 sm:p-8 space-y-9 select-none pb-28 transition-colors ${containerClass}`}>
      {/* 1. Top Header Bar: Search pill on left, Mode Switchers in center, User profile on right */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Rounded Search Bar Pill */}
        <div className="relative w-full sm:w-80 md:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 100M+ online tracks..."
            className={`w-full rounded-full pl-5 pr-12 py-3 text-sm transition-colors focus:outline-none border ${inputClass}`}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
        </div>

        {/* Discover (Online) vs Favourites (Dedicated Page) vs Library (Offline) View Toggle */}
        <div className={`flex items-center gap-1.5 p-1 rounded-full border self-start sm:self-auto transition-colors ${
          isLight
            ? 'bg-white border-neutral-200 shadow-sm'
            : 'bg-[#17181d] border-white/8'
        }`}>
          <button
            onClick={() => {
              setActiveTab('home');
              if (onNavigateSubView) onNavigateSubView('home');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? activePillClass
                : isLight
                  ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  : isCobalt
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover Online</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('favorites');
              if (onNavigateSubView) onNavigateSubView('favorites');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? activePillClass
                : isLight
                  ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  : isCobalt
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${
              activeTab === 'favorites'
                ? isLight || isCobalt
                  ? 'fill-white text-white'
                  : 'fill-[#0B0B0D]'
                : isLight
                  ? 'fill-rose-500 text-rose-500'
                  : isCobalt
                  ? 'fill-[#38BDF8] text-[#38BDF8]'
                  : 'fill-[#DCFF7D] text-[#DCFF7D]'
            }`} />
            <span>Favourite Music</span>
            {favoriteTracks.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'favorites'
                    ? isLight
                      ? 'bg-white/20 text-white preserve-white'
                      : isCobalt
                      ? 'bg-white/20 text-white'
                      : 'bg-[#0B0B0D] text-[#DCFF7D]'
                    : isLight
                      ? 'bg-neutral-100 text-neutral-700'
                      : isCobalt
                      ? 'bg-sky-500/20 text-[#38BDF8]'
                      : 'bg-[#DCFF7D]/20 text-[#DCFF7D]'
                }`}
              >
                {favoriteTracks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('library');
              if (onNavigateSubView) onNavigateSubView('library');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'library'
                ? activePillClass
                : isLight
                  ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  : isCobalt
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>My Library</span>
            {localTracks.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'library'
                    ? isLight || isCobalt
                      ? 'bg-white/20 text-white'
                      : 'bg-[#0B0B0D] text-[#DCFF7D]'
                    : isLight
                      ? 'bg-neutral-100 text-neutral-700'
                      : isCobalt
                      ? 'bg-sky-500/20 text-[#38BDF8]'
                      : 'bg-white/10 text-neutral-300'
                }`}
              >
                {localTracks.length}
              </span>
            )}
          </button>
        </div>

        {/* User Profile Pill & Utility Buttons */}
        <div className="flex items-center gap-3">
          <div
            onClick={onOpenSettings}
            title="Open Account Settings"
            className={`flex items-center gap-3 pl-1 pr-3.5 py-1 rounded-full border shadow-sm cursor-pointer transition-all ${
              isLight
                ? 'bg-white hover:bg-neutral-100 border-neutral-200'
                : isCobalt
                ? 'bg-[#17181d] hover:bg-[#202127] border-white/8 hover:border-[#2F6BFE]/40'
                : 'bg-[#17181d] hover:bg-[#202127] border-white/8 hover:border-[#DCFF7D]/30'
            }`}
          >
            <div className={`w-8 h-8 rounded-full overflow-hidden font-extrabold text-xs flex items-center justify-center flex-shrink-0 ${
              isLight ? 'bg-neutral-100 text-neutral-900' : isCobalt ? 'bg-sky-500/20 text-[#38BDF8]' : 'bg-[#DCFF7D]/20 text-[#DCFF7D]'
            }`}>
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : profile?.name ? (
                profile.name.slice(0, 2).toUpperCase()
              ) : (
                'OV'
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className={`text-xs font-bold leading-tight truncate max-w-[110px] ${
                isLight ? 'text-neutral-900' : isCobalt ? 'text-slate-100' : 'text-white'
              }`}>
                {profile?.name || 'Guest User'}
              </div>
              <div className={`text-[10px] font-semibold ${
                isLight ? 'text-neutral-500' : isCobalt ? 'text-[#38BDF8]' : 'text-[#DCFF7D]'
              }`}>
                {profile?.isGuest ? 'Guest Mode' : 'Cloud Sync'}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab('favorites');
              if (onNavigateSubView) onNavigateSubView('favorites');
            }}
            title="Favourites"
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer relative ${
              activeTab === 'favorites'
                ? isLight
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                  : isCobalt
                  ? 'bg-[#2F6BFE] text-white border-[#2F6BFE] shadow-md shadow-[#2F6BFE]/30'
                  : 'bg-[#DCFF7D] text-[#0B0B0D] border-[#DCFF7D]'
                : isLight
                  ? 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700 hover:text-black shadow-sm'
                  : isCobalt
                  ? 'bg-[#17181d] hover:bg-[#202127] border-white/8 text-neutral-300 hover:text-[#38BDF8]'
                  : 'bg-[#17181d] hover:bg-[#202127] border-white/8 text-neutral-300 hover:text-[#DCFF7D]'
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? (isLight || isCobalt ? 'fill-white' : 'fill-[#0B0B0D]') : ''}`} />
            {favoriteTracks.length > 0 && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                isLight ? 'bg-neutral-900 text-white' : isCobalt ? 'bg-[#2F6BFE] text-white' : 'bg-[#DCFF7D] text-[#0B0B0D]'
              }`}>
                {favoriteTracks.length > 99 ? '99+' : favoriteTracks.length}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            title="Account & App Settings"
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700 hover:text-black shadow-sm'
                : isCobalt
                ? 'bg-[#17181d] hover:bg-[#202127] border-white/8 text-neutral-300 hover:text-[#38BDF8]'
                : 'bg-[#17181d] hover:bg-[#202127] border-white/8 text-neutral-300 hover:text-[#DCFF7D]'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Search Results Dropdown / Grid if searching */}
      {searchQuery.trim() && (
        <div className={`p-6 rounded-3xl space-y-4 border transition-colors ${
          isLight ? 'bg-white border-neutral-200/90 shadow-sm' : 'bg-[#151619] border-white/8'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold ${isLight ? 'text-neutral-900' : 'text-neutral-300'}`}>
              {isSearching ? 'Searching Online Catalog...' : `Found ${searchResults.length} tracks for "${searchQuery}"`}
            </h3>
            <button
              onClick={() => setSearchQuery('')}
              className={`text-xs font-semibold cursor-pointer ${
                isLight ? 'text-neutral-500 hover:text-black' : 'text-neutral-400 hover:text-[#DCFF7D]'
              }`}
            >
              Clear Search
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {searchResults.map((t) => {
              const isLiked = isTrackLiked(t);
              const isDownloaded = isTrackDownloaded(t);
              const isDownloading = downloadingTrackIds.has(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => playTrack(t, searchResults)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all group ${subCardClass} ${
                    isLight ? 'hover:border-neutral-400' : isCobalt ? 'hover:border-[#2F6BFE]/50' : 'hover:border-[#DCFF7D]/40'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex-shrink-0">
                    <img
                      src={getTrackArtwork(t)}
                      alt={t.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = MUSIC_FALLBACK_SVG;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold truncate transition-colors ${
                      isLight ? 'text-neutral-900 group-hover:text-black' : isCobalt ? 'text-white group-hover:text-[#38BDF8]' : 'text-white group-hover:text-[#DCFF7D]'
                    }`}>
                      {t.title}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${isLight ? 'text-neutral-500 font-medium' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>
                      {t.artist}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Offline Download Button */}
                    <button
                      onClick={(e) => handleDownloadMusic(t, e)}
                      title={
                        isDownloaded
                          ? 'Offline Ready (Saved to Library)'
                          : isDownloading
                          ? 'Downloading...'
                          : 'Download MP3 for Offline Listening'
                      }
                      disabled={isDownloading}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isDownloaded
                          ? isLight ? 'text-emerald-600 hover:bg-neutral-200' : 'text-emerald-400 hover:bg-white/10'
                          : isLight
                          ? 'hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900'
                          : 'hover:bg-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      ) : isDownloaded ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Heart / Favorite Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(t, e)}
                      title={isLiked ? 'Remove favorite' : 'Add favorite'}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isLight ? 'hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900' : 'hover:bg-white/10 text-neutral-400 hover:text-[#DCFF7D]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLiked
                            ? isLight ? 'fill-neutral-900 text-neutral-900' : isCobalt ? 'fill-[#38BDF8] text-[#38BDF8]' : 'fill-[#DCFF7D] text-[#DCFF7D]'
                            : ''
                        }`}
                      />
                    </button>
                    <Play className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isLight ? 'fill-neutral-900 text-neutral-900' : 'fill-white text-white'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 1: ONLINE DISCOVER HOME VIEW (100% Online Rich Catalog)  */}
      {/* ============================================================ */}
      {activeTab === 'home' && (
        <>
          {/* 2. Featured CoverFlow 3D Card Stack (Center Hero Carousel matching Mockup) */}
          <div className="relative w-full py-4 flex flex-col items-center justify-center overflow-hidden">
            <div className="relative w-full max-w-4xl h-[340px] sm:h-[390px] flex items-center justify-center">
              {heroCarouselTracks.map((track, idx) => {
                const offset = idx - activeIndex;
                const isCenter = offset === 0;
                const isVisible = Math.abs(offset) <= 2;

                if (!isVisible) return null;

                // 3D CoverFlow visual geometry
                const xTranslate = offset * 155;
                const zIndex = 30 - Math.abs(offset) * 10;
                const scale = isCenter ? 1 : Math.max(0.74, 1 - Math.abs(offset) * 0.12);
                const opacity = isCenter ? 1 : Math.max(0.45, 0.88 - Math.abs(offset) * 0.22);
                const rotateY = offset * -14;

                const isThisPlaying = currentTrack?.id === track.id && isPlaying;

                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      if (isCenter) {
                        if (isThisPlaying) togglePlay();
                        else playTrack(track, heroCarouselTracks);
                      } else {
                        setActiveIndex(idx);
                      }
                    }}
                    className={`absolute w-[270px] sm:w-[340px] aspect-square rounded-[32px] overflow-hidden cursor-pointer transition-all duration-500 ease-out ${
                      isCenter
                        ? isLight
                          ? 'border-2 border-neutral-200/80 shadow-[0_20px_45px_rgba(0,0,0,0.12)]'
                          : 'border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                        : isLight
                        ? 'border border-neutral-200/60 shadow-md opacity-75'
                        : 'border border-white/10 hover:border-white/30'
                    }`}
                    style={{
                      transform: `translateX(${xTranslate}px) scale(${scale}) perspective(1200px) rotateY(${rotateY}deg)`,
                      zIndex,
                      opacity,
                    }}
                  >
                    <img
                      src={getTrackArtwork(track)}
                      alt={track.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = MUSIC_FALLBACK_SVG;
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                    {/* Center Card Title & Play Button Overlay */}
                    {isCenter && (
                      <div className="absolute bottom-6 inset-x-6 flex items-end justify-between gap-3 preserve-white">
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xl sm:text-2xl font-extrabold text-white preserve-white truncate drop-shadow-md tracking-tight">
                            {track.title}
                          </h2>
                          <p className="text-xs sm:text-sm text-neutral-300 preserve-white font-medium truncate mt-0.5">
                            {track.artist}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Hero Download Button */}
                          <button
                            onClick={(e) => handleDownloadMusic(track, e)}
                            title={
                              isTrackDownloaded(track)
                                ? 'Offline Ready'
                                : downloadingTrackIds.has(track.id)
                                ? 'Downloading...'
                                : 'Download MP3'
                            }
                            disabled={downloadingTrackIds.has(track.id)}
                            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            {downloadingTrackIds.has(track.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                            ) : isTrackDownloaded(track) ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          {/* Hero Like Button */}
                          <button
                            onClick={(e) => handleToggleFavorite(track, e)}
                            title={isTrackLiked(track) ? 'Remove favorite' : 'Add favorite'}
                            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isTrackLiked(track)
                                  ? isLight
                                    ? 'fill-rose-500 text-rose-500'
                                    : isCobalt
                                    ? 'fill-[#38BDF8] text-[#38BDF8]'
                                    : 'fill-[#DCFF7D] text-[#DCFF7D]'
                                  : 'text-white'
                              }`}
                            />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isThisPlaying) togglePlay();
                              else playTrack(track, heroCarouselTracks);
                            }}
                            className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 theme-self-managed ${
                              isLight
                                ? 'bg-neutral-900 hover:bg-black text-white shadow-lg'
                                : isCobalt
                                ? 'bg-[#2F6BFE] hover:bg-[#437BFE] text-white shadow-xl shadow-[#2F6BFE]/35'
                                : isLime
                                ? 'bg-[#DCFF7D] hover:bg-[#cbf764] text-[#0B0B0D] shadow-xl shadow-[#DCFF7D]/20'
                                : 'bg-white hover:bg-neutral-200 text-black shadow-xl shadow-white/10'
                            }`}
                          >
                            {isThisPlaying ? (
                              <Pause className={`w-5 h-5 ${isLight || isCobalt ? 'fill-white text-white' : 'fill-black text-black'}`} />
                            ) : (
                              <Play className={`w-5 h-5 ml-0.5 ${isLight || isCobalt ? 'fill-white text-white' : 'fill-black text-black'}`} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Select Categories Section (with < > Navigation) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>Select Categories</h2>
                {isLoadingCategory && (
                  <span className={`text-xs animate-pulse font-medium ${accentColorText}`}>
                    Loading charts...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollContainer(categoriesScrollRef, 'left')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isLight ? 'text-neutral-600 hover:text-black hover:bg-neutral-200/70' : isCobalt ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollContainer(categoriesScrollRef, 'right')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isLight ? 'text-neutral-600 hover:text-black hover:bg-neutral-200/70' : isCobalt ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div
              ref={categoriesScrollRef}
              className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1"
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                      isActive
                        ? activePillClass
                        : inactivePillClass
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Popular Songs Row (Squircle Cards & Tinted Containers) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Flame className={`w-5 h-5 ${isLight ? 'text-amber-500' : isCobalt ? 'text-[#38BDF8]' : 'text-[#DCFF7D]'}`} />
                <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  {activeCategory === 'All' ? 'Popular Songs' : `${activeCategory} Spotlight`}
                </h2>
                <span className={`text-xs font-semibold ${isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>({popularTracks.length} tracks)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollContainer(popularScrollRef, 'left')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isLight ? 'text-neutral-600 hover:text-black hover:bg-neutral-200/70' : isCobalt ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollContainer(popularScrollRef, 'right')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isLight ? 'text-neutral-600 hover:text-black hover:bg-neutral-200/70' : isCobalt ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Squircle Cards Row */}
            <div
              ref={popularScrollRef}
              className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2"
            >
              {popularTracks.map((track, i) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                const isLiked = isTrackLiked(track);
                const isDownloaded = isTrackDownloaded(track);
                const isDownloading = downloadingTrackIds.has(track.id);
                const containerStyle = popularCardTints[i % popularCardTints.length];

                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, popularTracks)}
                    className={`group flex-shrink-0 w-44 sm:w-48 p-2.5 rounded-[26px] border transition-all duration-300 cursor-pointer flex flex-col ${
                      isLight
                        ? 'bg-white border-neutral-200/90 hover:border-neutral-400 shadow-sm'
                        : isCobalt
                        ? 'bg-[#17181d] border-white/8 hover:border-[#2F6BFE]/50 shadow-lg'
                        : `${containerStyle} hover:border-[#DCFF7D]/50 shadow-lg`
                    }`}
                  >
                    {/* Inner Squircle Artwork */}
                    <div className="relative aspect-square w-full rounded-[20px] overflow-hidden bg-black/40">
                      <img
                        src={getTrackArtwork(track)}
                        alt={track.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = MUSIC_FALLBACK_SVG;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Top Action Overlay (Download & Heart) */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDownloadMusic(track, e)}
                          title={
                            isDownloaded
                              ? 'Offline Ready (Saved in Library)'
                              : isDownloading
                              ? 'Downloading...'
                              : 'Download MP3 for Offline'
                          }
                          disabled={isDownloading}
                          className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:scale-110 transition-transform cursor-pointer"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                          ) : isDownloaded ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleToggleFavorite(track, e)}
                          title={isLiked ? 'Remove favorite' : 'Add favorite'}
                          className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isLiked
                                ? isLight ? 'fill-neutral-900 text-neutral-900' : isCobalt ? 'fill-[#38BDF8] text-[#38BDF8]' : 'fill-[#DCFF7D] text-[#DCFF7D]'
                                : 'text-white'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Hover Play Button */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ${
                          isLight ? 'bg-neutral-900 text-white' : isCobalt ? 'bg-[#2F6BFE] text-white' : 'bg-[#DCFF7D] text-[#0B0B0D]'
                        }`}>
                          {isThisPlaying ? (
                            <Pause className={`w-5 h-5 fill-current ${isCobalt ? 'text-white' : ''}`} />
                          ) : (
                            <Play className={`w-5 h-5 fill-current ml-0.5 ${isCobalt ? 'text-white' : ''}`} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Centered Title & Artist */}
                    <div className="mt-3 pb-1 text-center px-1">
                      <h3 className={`text-sm font-bold truncate transition-colors ${
                        isLight ? 'text-neutral-900 group-hover:text-black' : isCobalt ? 'text-white group-hover:text-[#38BDF8]' : 'text-white group-hover:text-[#DCFF7D]'
                      }`}>
                        {track.title}
                      </h3>
                      <p className={`text-xs truncate mt-0.5 font-medium ${
                        isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'
                      }`}>
                        {track.artist}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Top 50 Global Online Hit Charts (Comprehensive Streaming Catalog) */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={`w-5 h-5 ${isLight ? 'text-neutral-900' : isCobalt ? 'text-[#38BDF8]' : 'text-[#DCFF7D]'}`} />
                <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  {activeCategory === 'All' ? 'Top Global 100 Chart' : `${activeCategory} Extended Library`}
                </h2>
                <span className={`text-xs font-semibold ${isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>({chartTracks.length} tracks online)</span>
              </div>
              <p className={`text-xs hidden sm:block ${isLight ? 'text-neutral-500 font-medium' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>
                Lossless Hi-Fi Audio • Direct Apple/YouTube Stream
              </p>
            </div>

            {/* 2-Column Table of Online Tracks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chartTracks.slice(0, 40).map((t, idx) => {
                const isThisPlaying = currentTrack?.id === t.id && isPlaying;
                const isLiked = isTrackLiked(t);
                const isDownloaded = isTrackDownloaded(t);
                const isDownloading = downloadingTrackIds.has(t.id);
                return (
                  <div
                    key={t.id + '-' + idx}
                    onClick={() => playTrack(t, chartTracks)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all group ${
                      isLight
                        ? 'bg-white hover:bg-neutral-50 border-neutral-200/90 shadow-sm'
                        : isCobalt
                        ? 'bg-[#17181d] hover:bg-[#202127] border-white/8 hover:border-[#2F6BFE]/40 shadow-md'
                        : 'bg-[#17181d] hover:bg-[#202127] border-white/8 hover:border-[#DCFF7D]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Rank Number */}
                      <span className={`w-6 text-center text-xs font-black transition-colors ${
                        isLight ? 'text-neutral-400 group-hover:text-black' : isCobalt ? 'text-slate-500 group-hover:text-[#38BDF8]' : 'text-neutral-500 group-hover:text-[#DCFF7D]'
                      }`}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      {/* Artwork */}
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex-shrink-0">
                        <img
                          src={getTrackArtwork(t)}
                          alt={t.title}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = MUSIC_FALLBACK_SVG;
                          }}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {isThisPlaying ? (
                            <Pause className={`w-4 h-4 ${isLight ? 'text-white fill-white' : isCobalt ? 'text-white fill-white' : 'text-[#DCFF7D] fill-current'}`} />
                          ) : (
                            <Play className={`w-4 h-4 ml-0.5 ${isLight ? 'text-white fill-white' : isCobalt ? 'text-white fill-white' : 'text-[#DCFF7D] fill-current'}`} />
                          )}
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-bold truncate transition-colors ${
                          isLight ? 'text-neutral-900 group-hover:text-black' : isCobalt ? 'text-white group-hover:text-[#38BDF8]' : 'text-white group-hover:text-[#DCFF7D]'
                        }`}>
                          {t.title}
                        </h4>
                        <p className={`text-[11px] truncate mt-0.5 font-medium ${
                          isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'
                        }`}>{t.artist}</p>
                      </div>
                    </div>

                    {/* Actions: Download + Heart + Duration */}
                    <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                      {/* Offline Download Button */}
                      <button
                        onClick={(e) => handleDownloadMusic(t, e)}
                        title={
                          isDownloaded
                            ? 'Offline Ready (Saved in Library)'
                            : isDownloading
                            ? 'Downloading...'
                            : 'Download MP3 for Offline Listening'
                        }
                        disabled={isDownloading}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          isDownloaded
                            ? isLight ? 'text-emerald-600 hover:bg-neutral-100' : 'text-emerald-400 hover:bg-white/10'
                            : isLight
                            ? 'hover:bg-neutral-100 text-neutral-400 hover:text-black'
                            : 'hover:bg-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        ) : isDownloaded ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(t, e)}
                        title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          isLight ? 'hover:bg-neutral-100 text-neutral-400 hover:text-black' : 'hover:bg-white/10 text-neutral-400 hover:text-[#DCFF7D]'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isLiked
                              ? isLight ? 'fill-neutral-900 text-neutral-900' : isCobalt ? 'fill-[#38BDF8] text-[#38BDF8]' : 'fill-[#DCFF7D] text-[#DCFF7D]'
                              : 'text-neutral-400'
                          }`}
                        />
                      </button>

                      {t.duration && (
                        <span className={`text-[11px] tabular-nums w-10 text-right font-medium ${
                          isLight ? 'text-neutral-400' : 'text-neutral-500'
                        }`}>
                          {Math.floor(t.duration / 60)}:
                          {String(Math.floor(t.duration % 60)).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* MODE 2: DEDICATED FAVOURITE MUSIC PAGE                       */}
      {/* ============================================================ */}
      {activeTab === 'favorites' && (
        <div className="space-y-6">
          {/* Top Banner with Stats & Controls */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl border transition-colors ${
            isLight
              ? 'bg-white border-neutral-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
              : 'bg-[#17181d] border-white/8 shadow-xl'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                isLight
                  ? 'bg-rose-50 border border-rose-200 text-rose-500'
                  : isCobalt
                  ? 'bg-[#2F6BFE]/15 border border-[#2F6BFE]/30 text-[#38BDF8]'
                  : 'bg-[#DCFF7D]/10 border border-[#DCFF7D]/25 text-[#DCFF7D]'
              }`}>
                <Heart className={`w-7 h-7 ${isLight ? 'fill-rose-500' : isCobalt ? 'fill-[#38BDF8]' : 'fill-[#DCFF7D]'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className={`text-xl sm:text-2xl font-extrabold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                    Favourite Music Collection
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isLight
                      ? 'bg-neutral-100 border-neutral-200 text-neutral-800'
                      : isCobalt
                      ? 'bg-sky-500/15 text-[#38BDF8] border-sky-500/30'
                      : 'bg-[#DCFF7D]/15 text-[#DCFF7D] border-[#DCFF7D]/30'
                  }`}>
                    {favoriteTracks.length} tracks
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>
                  Total duration: <span className={`font-semibold ${isLight ? 'text-neutral-900' : 'text-white'}`}>{totalFavDurationFormatted}</span> •{' '}
                  {profile?.isGuest ? 'Stored locally (Guest Mode)' : 'Cloud Sync Active'}
                </p>
              </div>
            </div>

            {/* Actions: Play All & Shuffle */}
            {favoriteTracks.length > 0 && (
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <button
                  onClick={() => playTrack(favoriteTracks[0], favoriteTracks)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer shadow-md ${primaryBtnClass}`}
                >
                  <Play className={`w-4 h-4 ml-0.5 ${isLight || isCobalt ? 'fill-white text-white' : 'fill-current'}`} />
                  Play All
                </button>

                <button
                  onClick={() => {
                    const shuffled = [...favoriteTracks].sort(() => Math.random() - 0.5);
                    playTrack(shuffled[0], shuffled);
                  }}
                  title="Shuffle play favorites"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer border ${
                    isLight
                      ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                      : isCobalt
                      ? 'bg-[#202127] hover:bg-[#282a32] border-white/8 text-slate-200'
                      : 'bg-[#1C1C20] hover:bg-[#25252A] border-white/10 text-white'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Shuffle
                </button>
              </div>
            )}
          </div>

          {/* Search & Sort inside Favorites */}
          {favoriteTracks.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={favSearchQuery}
                  onChange={(e) => setFavSearchQuery(e.target.value)}
                  placeholder="Filter saved tracks..."
                  className={`w-full rounded-full pl-4 pr-10 py-2.5 text-xs transition-colors focus:outline-none border ${inputClass}`}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                  <Search className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className={`text-xs ${isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>Sort by:</span>
                <select
                  value={favSort}
                  onChange={(e) => setFavSort(e.target.value as any)}
                  className={`text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer border ${
                    isLight
                      ? 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
                      : isCobalt
                      ? 'bg-[#17181d] text-slate-100 border-white/8 focus:border-[#2F6BFE]'
                      : 'bg-[#17181d] text-white border-white/8 focus:border-[#DCFF7D]/40'
                  }`}
                >
                  <option value="recent">Recently Added</option>
                  <option value="title">Song Title (A-Z)</option>
                  <option value="artist">Artist Name</option>
                </select>
              </div>
            </div>
          )}

          {/* Empty State */}
          {favoriteTracks.length === 0 ? (
            <div className={`p-16 text-center rounded-3xl border space-y-4 ${
              isLight
                ? 'bg-white border-neutral-200 shadow-sm'
                : 'bg-[#17181d] border-white/8'
            }`}>
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border ${
                isLight ? 'bg-neutral-100 border-neutral-200 text-neutral-400' : isCobalt ? 'bg-[#202127] border-white/8 text-slate-400' : 'bg-white/5 border-white/10 text-neutral-500'
              }`}>
                <Heart className="w-8 h-8" />
              </div>
              <h3 className={`text-lg font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>No favourite tracks saved yet</h3>
              <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>
                Discover trending music and tap the heart icon on any song to save it here. Your favorites will be synced across your devices.
              </p>
              <button
                onClick={() => {
                  setActiveTab('home');
                  if (onNavigateSubView) onNavigateSubView('home');
                }}
                className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer shadow-md ${primaryBtnClass}`}
              >
                Discover Online Music
              </button>
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border space-y-2 ${
              isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#17181d] border-white/8'
            }`}>
              <p className={`text-xs ${isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>No tracks matching &ldquo;{favSearchQuery}&rdquo;</p>
              <button
                onClick={() => setFavSearchQuery('')}
                className={`text-xs font-bold hover:underline cursor-pointer ${isLight ? 'text-neutral-900' : isCobalt ? 'text-[#38BDF8]' : 'text-[#DCFF7D]'}`}
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* Favorites Grid */
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filteredFavorites.map((track) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, filteredFavorites)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all group flex flex-col justify-between ${
                      isLight
                        ? 'bg-white hover:bg-neutral-50 border-neutral-200/80 hover:border-neutral-300 shadow-sm'
                        : isCobalt
                        ? 'bg-[#17181d] hover:bg-[#202127] border-white/8 hover:border-[#2F6BFE]/40 shadow-md'
                        : 'bg-[#17181d] hover:bg-[#202127] border-white/8 hover:border-[#DCFF7D]/40 shadow-md'
                    }`}
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-800 mb-3">
                      <img
                        src={getTrackArtwork(track)}
                        alt={track.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = MUSIC_FALLBACK_SVG;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${
                          isLight ? 'bg-white text-black' : isCobalt ? 'bg-[#2F6BFE] text-white' : 'bg-[#DCFF7D] text-[#0B0B0D]'
                        }`}>
                          {isThisPlaying ? (
                            <Pause className={`w-5 h-5 fill-current ${isLight ? 'text-black' : isCobalt ? 'text-white' : 'text-[#0B0B0D]'}`} />
                          ) : (
                            <Play className={`w-5 h-5 fill-current ml-0.5 ${isLight ? 'text-black' : isCobalt ? 'text-white' : 'text-[#0B0B0D]'}`} />
                          )}
                        </div>
                      </div>

                      {/* Top Action Overlay (Download & Trash) */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleDownloadMusic(track, e)}
                          title={
                            isTrackDownloaded(track)
                              ? 'Offline Ready (Saved in Library)'
                              : downloadingTrackIds.has(track.id)
                              ? 'Downloading...'
                              : 'Download MP3 for Offline'
                          }
                          disabled={downloadingTrackIds.has(track.id)}
                          className="w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                        >
                          {downloadingTrackIds.has(track.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                          ) : isTrackDownloaded(track) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleToggleFavorite(track, e)}
                          title="Remove from favorites"
                          className="w-7 h-7 rounded-full bg-black/70 hover:bg-rose-500 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className={`text-xs font-bold truncate transition-colors ${
                        isLight ? 'text-neutral-900 group-hover:text-black' : isCobalt ? 'text-white group-hover:text-[#38BDF8]' : 'text-white group-hover:text-[#DCFF7D]'
                      }`}>
                        {track.title}
                      </h4>
                      <div className={`flex items-center justify-between text-[11px] truncate mt-1 font-medium ${
                        isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'
                      }`}>
                        <span className="truncate">{track.artist}</span>
                        {track.duration && (
                          <span className={`text-[10px] tabular-nums flex-shrink-0 ${isLight ? 'text-neutral-400' : isCobalt ? 'text-slate-500' : 'text-neutral-500'}`}>
                            {Math.floor(track.duration / 60)}:
                            {String(Math.floor(track.duration % 60)).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 3: MY OFFLINE LIBRARY VIEW (Stored files on disk)       */}
      {/* ============================================================ */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border transition-colors ${cardClass}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isLight
                  ? 'bg-neutral-100 border border-neutral-200 text-neutral-900'
                  : isCobalt
                  ? 'bg-sky-500/15 border border-sky-500/25 text-[#38BDF8]'
                  : 'bg-[#DCFF7D]/10 border border-[#DCFF7D]/20 text-[#DCFF7D]'
              }`}>
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>Local Music Library</h2>
                <p className={`text-xs ${isLight ? 'text-neutral-500 font-medium' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>
                  {localTracks.length} offline tracks scanned from <code className={isLight ? 'text-neutral-900 font-bold' : isCobalt ? 'text-[#38BDF8]' : 'text-[#DCFF7D]'}>~/Music/Ryotunes</code>
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder="Filter local songs..."
                className={`w-full rounded-full pl-4 pr-10 py-2 text-xs transition-colors focus:outline-none border ${inputClass}`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {filteredLocalTracks.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border space-y-3 ${
              isLight
                ? 'bg-white border-neutral-200 shadow-sm'
                : 'bg-[#17181d] border-white/8'
            }`}>
              <MusicIcon className="w-10 h-10 text-neutral-400 mx-auto" />
              <p className={`text-sm ${isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>No local tracks matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredLocalTracks.map((track) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, filteredLocalTracks)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all group ${
                      isLight
                        ? 'bg-white hover:bg-neutral-50 border-neutral-200/90 shadow-sm'
                        : isCobalt
                        ? 'bg-[#17181d] hover:bg-[#202127] border-white/8 hover:border-[#2F6BFE]/40'
                        : 'bg-[#17181d] hover:bg-[#202127] border-white/8 hover:border-[#DCFF7D]/40'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex-shrink-0 relative">
                      <img
                        src={getTrackArtwork(track)}
                        alt={track.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = MUSIC_FALLBACK_SVG;
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {isThisPlaying ? (
                          <Pause className={`w-4 h-4 ${isLight ? 'text-white fill-white' : isCobalt ? 'text-white fill-white' : 'text-[#DCFF7D] fill-current'}`} />
                        ) : (
                          <Play className={`w-4 h-4 ml-0.5 ${isLight ? 'text-white fill-white' : isCobalt ? 'text-white fill-white' : 'text-[#DCFF7D] fill-current'}`} />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold truncate transition-colors ${
                        isLight ? 'text-neutral-900 group-hover:text-black' : isCobalt ? 'text-white group-hover:text-[#38BDF8]' : 'text-white group-hover:text-[#DCFF7D]'
                      }`}>
                        {track.title}
                      </div>
                      <div className={`text-[11px] truncate mt-0.5 font-medium ${isLight ? 'text-neutral-500' : isCobalt ? 'text-slate-400' : 'text-neutral-400'}`}>{track.artist}</div>
                    </div>
                    {track.duration && (
                      <span className={`text-[10px] tabular-nums font-medium ${isLight ? 'text-neutral-400' : isCobalt ? 'text-slate-500' : 'text-neutral-500'}`}>
                        {Math.floor(track.duration / 60)}:
                        {String(Math.floor(track.duration % 60)).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Music Toast Banner */}
      {musicToast && (
        <div className="fixed bottom-24 right-8 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-xl ${
              musicToast.type === 'success'
                ? isLight
                  ? 'bg-neutral-900 text-emerald-400 border-neutral-700'
                  : 'bg-[#18191E]/95 text-emerald-400 border-emerald-500/30'
                : musicToast.type === 'error'
                ? isLight
                  ? 'bg-neutral-900 text-rose-400 border-neutral-700'
                  : 'bg-[#18191E]/95 text-rose-400 border-rose-500/30'
                : isLight
                ? 'bg-neutral-900 text-white border-neutral-700'
                : 'bg-[#18191E]/95 text-neutral-100 border-white/10'
            }`}
          >
            {musicToast.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
            {musicToast.type === 'info' && <Download className="w-4 h-4 text-sky-400" />}
            <span>{musicToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
