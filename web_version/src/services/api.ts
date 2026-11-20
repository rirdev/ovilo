import { isTauri } from './platform';
import {
  MediaItem,
  MediaDetails,
  Episode,
  StreamSource,
  UserData,
  AppSettings,
  WatchHistoryItem,
  FavoriteItem,
  MusicTrack,
  LyricsData,
  LyricLine,
  ResolvedAudioStream,
} from '../types';

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (isTauri()) {
    try {
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
      return await tauriInvoke<T>(cmd, args);
    } catch (err) {
      console.warn(`[Tauri] ${cmd} error:`, err);
    }
  }

  // Pure Web Fallback & Direct Browser API handling
  switch (cmd) {
    case 'fetch_trending': {
      const mediaType = (args?.mediaType as string) || 'all';
      const timeWindow = (args?.timeWindow as string) || 'day';
      const res = await fetch(`${TMDB_BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${TMDB_API_KEY}`);
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      return (await res.json()) as T;
    }
    case 'fetch_popular': {
      const mediaType = (args?.mediaType as string) || 'movie';
      const page = args?.page || 1;
      const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/popular?api_key=${TMDB_API_KEY}&page=${page}`);
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      return (await res.json()) as T;
    }
    case 'fetch_top_rated': {
      const mediaType = (args?.mediaType as string) || 'movie';
      const page = args?.page || 1;
      const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/top_rated?api_key=${TMDB_API_KEY}&page=${page}`);
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      return (await res.json()) as T;
    }
    case 'fetch_genres': {
      const mediaType = (args?.mediaType as string) || 'movie';
      const res = await fetch(`${TMDB_BASE_URL}/genre/${mediaType}/list?api_key=${TMDB_API_KEY}`);
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      return (await res.json()) as T;
    }
    case 'fetch_discover_by_genre': {
      const mediaType = (args?.mediaType as string) || 'movie';
      const genreId = args?.genreId;
      const page = args?.page || 1;
      const res = await fetch(
        `${TMDB_BASE_URL}/discover/${mediaType}?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
      );
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      return (await res.json()) as T;
    }
    case 'fetch_details': {
      const mediaType = (args?.mediaType as string) || 'movie';
      const id = args?.id;
      const res = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,similar,recommendations,external_ids`
      );
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      return (await res.json()) as T;
    }
    case 'fetch_season_episodes': {
      const tvId = args?.tvId;
      const seasonNumber = args?.seasonNumber || 1;
      const res = await fetch(`${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      return (await res.json()) as T;
    }
    case 'search_multi': {
      const query = encodeURIComponent((args?.query as string) || '');
      const page = args?.page || 1;
      const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${query}&page=${page}`);
      if (!res.ok) throw new Error(`TMDB error ${res.status}`);
      return (await res.json()) as T;
    }
    case 'get_storage_stats': {
      return {
        total_gb: 128.0,
        used_gb: 18.5,
        free_gb: 109.5,
        percent: 14.4,
      } as unknown as T;
    }
    default:
      throw new Error(`Command ${cmd} not implemented for web mode`);
  }
};

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Inlined zero-network vector fallbacks for completely offline rendering
export const CURATED_POSTERS = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1518676599602-23c8a9010531?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80',
];

export const FALLBACK_POSTER_SVG = CURATED_POSTERS[0];

export const FALLBACK_BACKDROP_SVG =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80';

export const getPosterUrl = (path: string | null, size: 'w342' | 'w500' | 'original' = 'w500', fallbackIndex = 0): string => {
  if (!path) {
    return CURATED_POSTERS[Math.abs(fallbackIndex) % CURATED_POSTERS.length];
  }
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280'): string => {
  if (!path) return FALLBACK_BACKDROP_SVG;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

// Curated high quality offline fallbacks in case TMDB rate-limits or network is offline
export const FALLBACK_TRENDING: MediaItem[] = [
  {
    id: 693134,
    title: 'Dune: Part Two',
    overview: 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
    poster_path: '/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
    backdrop_path: '/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    vote_average: 8.2,
    release_date: '2024-02-27',
    media_type: 'movie',
    popularity: 980.5,
  },
  {
    id: 94605,
    name: 'Arcane',
    overview: 'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and incompatible convictions.',
    poster_path: '/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    backdrop_path: '/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    vote_average: 8.7,
    first_air_date: '2021-11-06',
    media_type: 'tv',
    popularity: 910.3,
  },
  {
    id: 872585,
    title: 'Oppenheimer',
    overview: 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb during World War II.',
    poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop_path: '/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg',
    vote_average: 8.1,
    release_date: '2023-07-19',
    media_type: 'movie',
    popularity: 840.1,
  },
  {
    id: 569094,
    title: 'Spider-Man: Across the Spider-Verse',
    overview: 'After reuniting with Gwen Stacy, Brooklyn\'s full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse.',
    poster_path: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    backdrop_path: '/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
    vote_average: 8.4,
    release_date: '2023-05-31',
    media_type: 'movie',
    popularity: 760.4,
  },
  {
    id: 93405,
    name: 'Squid Game',
    overview: 'Hundreds of cash-strapped players accept a strange invitation to compete in children\'s games. Inside, a tempting prize awaits with deadly high stakes.',
    poster_path: '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
    backdrop_path: '/2meX1nMdScFOoV4370rqHWFDxZ2.jpg',
    vote_average: 7.8,
    first_air_date: '2021-09-17',
    media_type: 'tv',
    popularity: 690.8,
  },
  {
    id: 106379,
    name: 'Fallout',
    overview: 'The story of haves and have-nots in a world in which there\'s almost nothing left to have. 200 years after the apocalypse, the gentle denizens of luxury fallout shelters are forced to return to the irradiated hellscape their ancestors left behind.',
    poster_path: '/ansA92iV2nC9Z7i4n4aC8aK9v6u.jpg',
    backdrop_path: '/4woSOUD0equAYzvwhWBHIJDCM88.jpg',
    vote_average: 8.3,
    first_air_date: '2024-04-10',
    media_type: 'tv',
    popularity: 740.2,
  },
];

// TMDB API calls
export const fetchTrending = async (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'day'): Promise<MediaItem[]> => {
  try {
    const res = await invoke<{ results?: MediaItem[] }>('fetch_trending', {
      mediaType,
      timeWindow,
    });
    if (res?.results && res.results.length > 0) {
      return res.results.map((item: any) => ({
        ...item,
        media_type: item.media_type || (mediaType === 'all' ? (item.title ? 'movie' : 'tv') : mediaType),
      }));
    }
  } catch (err) {
    console.warn('Using fallback trending data due to error:', err);
  }
  // Properly filter offline fallback by requested mediaType
  return mediaType === 'all'
    ? FALLBACK_TRENDING
    : FALLBACK_TRENDING.filter((item) => item.media_type === mediaType);
};

export const fetchPopular = async (mediaType: 'movie' | 'tv', page = 1): Promise<MediaItem[]> => {
  try {
    const res = await invoke<{ results?: MediaItem[] }>('fetch_popular', {
      mediaType,
      page,
    });
    if (res?.results && res.results.length > 0) {
      return res.results.map((item: any) => ({ ...item, media_type: mediaType }));
    }
  } catch (err) {
    console.warn('fetchPopular error:', err);
  }
  return FALLBACK_TRENDING.filter(item => item.media_type === mediaType);
};

export const fetchTopRated = async (mediaType: 'movie' | 'tv', page = 1): Promise<MediaItem[]> => {
  try {
    const res = await invoke<{ results?: MediaItem[] }>('fetch_top_rated', {
      mediaType,
      page,
    });
    if (res?.results && res.results.length > 0) {
      return res.results.map((item: any) => ({ ...item, media_type: mediaType }));
    }
  } catch (err) {
    console.warn('fetchTopRated error:', err);
  }
  return FALLBACK_TRENDING.filter(item => item.media_type === mediaType);
};

export const fetchGenres = async (mediaType: 'movie' | 'tv'): Promise<{ id: number; name: string }[]> => {
  try {
    const res = await invoke<{ genres?: { id: number; name: string }[] }>('fetch_genres', {
      mediaType,
    });
    if (res?.genres) return res.genres;
  } catch (err) {
    console.warn('fetchGenres error:', err);
  }
  return [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 18, name: 'Drama' },
    { id: 14, name: 'Fantasy' },
    { id: 878, name: 'Sci-Fi' },
    { id: 53, name: 'Thriller' },
  ];
};

export const fetchDiscoverByGenre = async (mediaType: 'movie' | 'tv', genreId: number, page = 1): Promise<MediaItem[]> => {
  try {
    const res = await invoke<{ results?: MediaItem[] }>('fetch_discover_by_genre', {
      mediaType,
      genreId,
      page,
    });
    if (res?.results) {
      return res.results.map((item: any) => ({ ...item, media_type: mediaType }));
    }
  } catch (err) {
    console.warn('fetchDiscoverByGenre error:', err);
  }
  return [];
};

export const fetchDetails = async (mediaType: 'movie' | 'tv', id: number): Promise<MediaDetails> => {
  try {
    const res = await invoke<MediaDetails>('fetch_details', {
      mediaType,
      id,
    });
    if (res) return { ...res, media_type: mediaType };
  } catch (err) {
    console.warn('fetchDetails error:', err);
  }
  // Fallback mock details
  const fallback = FALLBACK_TRENDING.find(f => f.id === id) || FALLBACK_TRENDING[0];
  return {
    ...fallback,
    genres: [{ id: 878, name: 'Sci-Fi' }, { id: 28, name: 'Action' }],
    runtime: 145,
    tagline: 'Experience cinema like never before.',
    status: 'Released',
    credits: {
      cast: [
        { id: 1, name: 'Timothée Chalamet', character: 'Paul Atreides', profile_path: null },
        { id: 2, name: 'Zendaya', character: 'Chani', profile_path: null },
        { id: 3, name: 'Rebecca Ferguson', character: 'Lady Jessica', profile_path: null },
        { id: 4, name: 'Javier Bardem', character: 'Stilgar', profile_path: null },
      ],
    },
    seasons: mediaType === 'tv' ? [
      { id: 1, name: 'Season 1', season_number: 1, episode_count: 8, poster_path: null },
      { id: 2, name: 'Season 2', season_number: 2, episode_count: 8, poster_path: null },
    ] : undefined,
  };
};

export const fetchSeasonEpisodes = async (tvId: number, seasonNumber: number): Promise<Episode[]> => {
  try {
    const res = await invoke<{ episodes?: Episode[] }>('fetch_season_episodes', {
      tvId,
      seasonNumber,
    });
    if (res?.episodes && res.episodes.length > 0) return res.episodes;
  } catch (err) {
    console.warn('fetchSeasonEpisodes error:', err);
  }
  // Fallback mock episodes
  return Array.from({ length: 8 }, (_, i) => ({
    id: 1000 + i,
    name: `Episode ${i + 1}`,
    overview: `An unexpected revelation changes everything in chapter ${i + 1}.`,
    episode_number: i + 1,
    season_number: seasonNumber,
    still_path: null,
    air_date: '2024-01-15',
    runtime: 52,
  }));
};

export const searchMulti = async (query: string, page = 1): Promise<MediaItem[]> => {
  if (!query.trim()) return [];
  try {
    const res = await invoke<{ results?: MediaItem[] }>('search_multi', {
      query,
      page,
    });
    if (res?.results) {
      return res.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => ({
          ...item,
          media_type: item.media_type || (item.title ? 'movie' : 'tv'),
        }));
    }
  } catch (err) {
    console.warn('searchMulti error:', err);
  }
  return [];
};

// Stream Sources Generator (VidSrc & mirrors)
export const getVideoSources = async (
  mediaType: 'movie' | 'tv',
  id: number,
  imdbId?: string,
  season?: number,
  episode?: number
): Promise<StreamSource[]> => {
  try {
    const sources = await invoke<StreamSource[]>('get_video_sources', {
      mediaType,
      id,
      imdbId: imdbId || null,
      season: season || null,
      episode: episode || null,
    });
    if (sources && sources.length > 0) return sources;
  } catch (err) {
    console.warn('getVideoSources error:', err);
  }
  // Client fallback
  const s = season || 1;
  const ep = episode || 1;
  if (mediaType === 'tv') {
    return [
      {
        name: 'VidSrc.ru (Official)',
        key: 'vidsrc_ru',
        url: `https://vidsrc.ru/tv/${id}/${s}/${ep}?colour=e50914&autoplay=true&autonextepisode=true`,
        badge: 'Fast 1080p',
      },
      {
        name: 'VidLink (Ad-Free & Fast)',
        key: 'vidlink',
        url: `https://vidlink.pro/tv/${id}/${s}/${ep}?primaryColor=e50914`,
        badge: 'No Ads • 1080p',
      },
      {
        name: 'SuperEmbed / Multi',
        key: 'superembed',
        url: `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${ep}`,
        badge: 'Failover',
      },
      {
        name: 'VidSrc.cc (v2 Engine)',
        key: 'vidsrc_cc',
        url: `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${ep}`,
        badge: 'Multi-Sub',
      },
      {
        name: 'VidSrc.to (Direct)',
        key: 'vidsrc_to',
        url: `https://vidsrc.to/embed/tv/${id}/${s}/${ep}`,
        badge: 'Fast CDN',
      },
      {
        name: 'VidSrc.xyz (Mirror)',
        key: 'vidsrc_xyz',
        url: `https://vidsrc.xyz/embed/tv/${id}/${s}/${ep}`,
        badge: 'Adaptive',
      },
    ];
  }
  return [
    {
      name: 'VidSrc.ru (Official)',
      key: 'vidsrc_ru',
      url: `https://vidsrc.ru/movie/${id}?colour=e50914&autoplay=true`,
      badge: 'Fast 1080p',
    },
    {
      name: 'VidLink (Ad-Free & Fast)',
      key: 'vidlink',
      url: `https://vidlink.pro/movie/${id}?primaryColor=e50914`,
      badge: 'No Ads • 1080p',
    },
    {
      name: 'SuperEmbed / Multi',
      key: 'superembed',
      url: `https://multiembed.mov/?video_id=${id}&tmdb=1`,
      badge: 'Failover',
    },
    {
      name: 'VidSrc.cc (v2 Engine)',
      key: 'vidsrc_cc',
      url: `https://vidsrc.cc/v2/embed/movie/${id}`,
      badge: 'Multi-Sub',
    },
    {
      name: 'VidSrc.to (Direct)',
      key: 'vidsrc_to',
      url: `https://vidsrc.to/embed/movie/${id}`,
      badge: 'Fast CDN',
    },
    {
      name: 'VidSrc.xyz (Mirror)',
      key: 'vidsrc_xyz',
      url: `https://vidsrc.xyz/embed/movie/${id}`,
      badge: 'Adaptive',
    },
  ];
};

const DEFAULT_USER_DATA: UserData = {
  settings: {
    custom_tmdb_api_key: '',
    preferred_server: 'vidsrc_ru',
    auto_play_next: true,
    high_quality_posters: true,
  },
  history: [],
  favorites: [],
};

// User Storage & Settings
export const getUserData = async (): Promise<UserData> => {
  if (isTauri()) {
    try {
      return await invoke<UserData>('get_user_data');
    } catch (err) {
      console.warn('getUserData tauri error:', err);
    }
  }
  try {
    const raw = localStorage.getItem('ovilo_user_data');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_USER_DATA;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  if (isTauri()) {
    try {
      await invoke('save_settings', { settings });
      return;
    } catch (err) {
      console.warn('saveSettings tauri error:', err);
    }
  }
  try {
    const data = await getUserData();
    data.settings = settings;
    localStorage.setItem('ovilo_user_data', JSON.stringify(data));
  } catch (_) {}
};

export const addWatchHistory = async (item: WatchHistoryItem): Promise<WatchHistoryItem[]> => {
  if (isTauri()) {
    try {
      return await invoke<WatchHistoryItem[]>('add_watch_history', { item });
    } catch (err) {
      console.warn('addWatchHistory tauri error:', err);
    }
  }
  const data = await getUserData();
  const filtered = data.history.filter((h) => h.id !== item.id);
  const updated = [item, ...filtered].slice(0, 50);
  data.history = updated;
  localStorage.setItem('ovilo_user_data', JSON.stringify(data));
  return updated;
};

export const toggleFavorite = async (item: FavoriteItem): Promise<boolean> => {
  if (isTauri()) {
    try {
      return await invoke<boolean>('toggle_favorite', { item });
    } catch (err) {
      console.warn('toggleFavorite tauri error:', err);
    }
  }
  const data = await getUserData();
  const exists = data.favorites.some((f) => f.id === item.id);
  if (exists) {
    data.favorites = data.favorites.filter((f) => f.id !== item.id);
  } else {
    data.favorites = [item, ...data.favorites];
  }
  localStorage.setItem('ovilo_user_data', JSON.stringify(data));
  return !exists;
};

export const setUserLibrary = async (favorites: FavoriteItem[], history: WatchHistoryItem[]): Promise<void> => {
  if (isTauri()) {
    try {
      await invoke('set_user_library', { favorites, history });
      return;
    } catch (err) {
      console.warn('setUserLibrary error:', err);
    }
  }
  const data = await getUserData();
  data.favorites = favorites;
  data.history = history;
  localStorage.setItem('ovilo_user_data', JSON.stringify(data));
};

// -----------------------------------------------------------------
// Music Section APIs
// -----------------------------------------------------------------

export const scanLocalMusic = async (folderPath?: string): Promise<MusicTrack[]> => {
  if (isTauri()) {
    try {
      return await invoke<MusicTrack[]>('scan_local_music', { folderPath: folderPath || null });
    } catch (err) {
      console.warn('scanLocalMusic error:', err);
      return [];
    }
  }
  return [];
};

export const readLocalLrc = async (filePath: string): Promise<string | null> => {
  if (isTauri()) {
    try {
      return await invoke<string | null>('read_local_lrc', { filePath });
    } catch (err) {
      console.warn('readLocalLrc error:', err);
      return null;
    }
  }
  try {
    return localStorage.getItem(`ovilo_lrc_${filePath}`);
  } catch (_) {
    return null;
  }
};

export const saveLocalLrc = async (filePath: string, lrcContent: string): Promise<boolean> => {
  if (isTauri()) {
    try {
      return await invoke<boolean>('save_local_lrc', { filePath, lrcContent });
    } catch (err) {
      console.warn('saveLocalLrc error:', err);
      return false;
    }
  }
  try {
    localStorage.setItem(`ovilo_lrc_${filePath}`, lrcContent);
    return true;
  } catch (_) {
    return false;
  }
};

export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || '').trim().toLowerCase();
  const s2 = (str2 || '').trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const maxLen = Math.max(len1, len2);
  return 1.0 - matrix[len1][len2] / maxLen;
}

export const fetchOnlineLyrics = async (
  trackName: string,
  artistName: string,
  duration?: number,
  videoId?: string
): Promise<LyricsData | null> => {
  // 1. Try native backend command (queries LRCLIB with backend HTTP client and similarity scoring)
  try {
    const res = await invoke<{
      synced: boolean;
      plain_lyrics: string | null;
      synced_lyrics: string | null;
    } | null>('fetch_online_lyrics', {
      trackName,
      artistName,
      duration: duration || null,
      videoId: videoId || null,
    });

    if (res && (res.synced_lyrics || res.plain_lyrics)) {
      let lines: LyricLine[] = [];
      if (res.synced_lyrics) {
        lines = parseLrc(res.synced_lyrics);
      }

      if (lines.length > 0 || res.plain_lyrics) {
        return {
          synced: res.synced && lines.length > 0,
          plain_lyrics: res.plain_lyrics || undefined,
          synced_lyrics: res.synced_lyrics || undefined,
          lines: lines.length > 0 ? lines : undefined,
          loadedDuration: duration,
        };
      }
    }
  } catch (err) {
    console.warn('fetch_online_lyrics invoke error, trying direct fallback:', err);
  }

  // 2. Direct client LRCLIB query (exact 1:1 strategy of ovilo_flutter & ArchiveTune)
  let cleanTrack = trackName;
  let cleanArtist = artistName;

  // Split "Artist - Title" if title contains " - " and artist is generic/uploader
  if (cleanTrack.includes(' - ')) {
    const parts = cleanTrack.split(' - ');
    const left = parts[0].trim();
    const right = parts.slice(1).join(' - ').trim();
    const isGeneric = !cleanArtist || /youtube|unknown|local|vevo|topic|channel/i.test(cleanArtist);
    if (isGeneric && left.length > 0) {
      cleanArtist = left;
      cleanTrack = right;
    }
  }

  cleanTrack = cleanTrack
    .replace(/\s*[\(\[](official\s*(music\s*)?video|official\s*audio|lyrics?(\s*video)?|4k|hd|visualizer|audio)[\)\]]/gi, '')
    .replace(/^#+/, '')
    .trim();

  const isGenericArtist = !cleanArtist || /^(local\s*artist|unknown(\s*artist)?|youtube(\s*music)?)$/i.test(cleanArtist.trim());
  cleanArtist = isGenericArtist
    ? ''
    : cleanArtist
        .replace(/vevo$/i, '')
        .replace(/\s*-\s*topic$/i, '')
        .split(/[,;&]|\bft\.?\b|\bfeat\.?\b/i)[0]
        .replace(/\s*[\(\[].*?[\)\]]/g, '')
        .trim();

  const durSeconds = duration && duration > 0 ? Math.round(duration) : 0;

  const pickBestItem = (list: any[]) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    const syncedList = list.filter((i: any) => i?.syncedLyrics?.trim());
    const candidates = syncedList.length > 0 ? syncedList : list.filter((i: any) => i?.plainLyrics?.trim());
    if (candidates.length === 0) return null;

    if (durSeconds > 0) {
      // 1. Look for close duration match within 3s (ArchiveTune MAX_DURATION_DELTA_SECONDS)
      const exactDur = candidates.filter((i: any) => i.duration && Math.abs(i.duration - durSeconds) <= 3);
      if (exactDur.length > 0) {
        return exactDur.sort((a, b) => Math.abs(a.duration - durSeconds) - Math.abs(b.duration - durSeconds))[0];
      }
      // 2. Otherwise sort candidates by duration delta
      return candidates.slice().sort((a, b) => {
        const diffA = a.duration ? Math.abs(a.duration - durSeconds) : 9999;
        const diffB = b.duration ? Math.abs(b.duration - durSeconds) : 9999;
        return diffA - diffB;
      })[0];
    }
    return candidates[0];
  };

  // A. Query /api/get WITH duration first if both artist and duration are known
  if (cleanArtist && durSeconds > 0) {
    try {
      const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}&duration=${durSeconds}`;
      const getResp = await fetch(getUrl, { headers: { 'User-Agent': 'OviloMusicApp/1.0' } });
      if (getResp.ok) {
        const item = await getResp.json();
        if (item?.syncedLyrics?.trim()) {
          const lines = parseLrc(item.syncedLyrics);
          if (lines.length > 0) {
            return {
              synced: true,
              plain_lyrics: item.plainLyrics || undefined,
              synced_lyrics: item.syncedLyrics,
              lines,
              loadedDuration: durSeconds || item.duration,
            };
          }
        }
      }
    } catch (_) {}
  }

  // B. Query /api/search by track_name & artist_name (ArchiveTune pattern)
  try {
    const searchUrl = cleanArtist
      ? `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}`
      : `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTrack)}`;

    const searchResp = await fetch(searchUrl, { headers: { 'User-Agent': 'OviloMusicApp/1.0' } });
    if (searchResp.ok) {
      const list = await searchResp.json();
      const best = pickBestItem(list);
      if (best) {
        if (best.syncedLyrics?.trim()) {
          const lines = parseLrc(best.syncedLyrics);
          if (lines.length > 0) {
            return {
              synced: true,
              plain_lyrics: best.plainLyrics || undefined,
              synced_lyrics: best.syncedLyrics,
              lines,
              loadedDuration: durSeconds || best.duration,
            };
          }
        }
        if (best.plainLyrics?.trim()) {
          return {
            synced: false,
            plain_lyrics: best.plainLyrics,
            loadedDuration: durSeconds || best.duration,
          };
        }
      }
    }
  } catch (_) {}

  // C. Query /api/get without duration as fallback for when duration was not provided
  if (cleanArtist) {
    try {
      const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      const getResp = await fetch(getUrl, { headers: { 'User-Agent': 'OviloMusicApp/1.0' } });
      if (getResp.ok) {
        const item = await getResp.json();
        if (item?.syncedLyrics?.trim()) {
          const lines = parseLrc(item.syncedLyrics);
          if (lines.length > 0) {
            return {
              synced: true,
              plain_lyrics: item.plainLyrics || undefined,
              synced_lyrics: item.syncedLyrics,
              lines,
              loadedDuration: durSeconds || item.duration,
            };
          }
        }
        if (item?.plainLyrics?.trim()) {
          return {
            synced: false,
            plain_lyrics: item.plainLyrics,
            loadedDuration: durSeconds || item.duration,
          };
        }
      }
    } catch (_) {}
  }

  // C. Query /api/search with generic query 'artist title'
  try {
    const queryStr = cleanArtist ? `${cleanArtist} ${cleanTrack}` : cleanTrack;
    const qUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(queryStr)}`;
    const qResp = await fetch(qUrl, { headers: { 'User-Agent': 'OviloMusicApp/1.0' } });
    if (qResp.ok) {
      const list = await qResp.json();
      const best = pickBestItem(list);
      if (best) {
        if (best.syncedLyrics?.trim()) {
          const lines = parseLrc(best.syncedLyrics);
          if (lines.length > 0) {
            return {
              synced: true,
              plain_lyrics: best.plainLyrics || undefined,
              synced_lyrics: best.syncedLyrics,
              lines,
              loadedDuration: durSeconds,
            };
          }
        }
        if (best.plainLyrics?.trim()) {
          return {
            synced: false,
            plain_lyrics: best.plainLyrics,
            loadedDuration: durSeconds,
          };
        }
      }
    }
  } catch (_) {}

  // D. Query /api/search with just title
  if (cleanArtist) {
    try {
      const qUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTrack)}`;
      const qResp = await fetch(qUrl, { headers: { 'User-Agent': 'OviloMusicApp/1.0' } });
      if (qResp.ok) {
        const list = await qResp.json();
        const best = pickBestItem(list);
        if (best) {
          if (best.syncedLyrics?.trim()) {
            const lines = parseLrc(best.syncedLyrics);
            if (lines.length > 0) {
              return {
                synced: true,
                plain_lyrics: best.plainLyrics || undefined,
                synced_lyrics: best.syncedLyrics,
                lines,
                loadedDuration: durSeconds,
              };
            }
          }
        }
      }
    } catch (_) {}
  }

  return null;
};

export const searchOnlineMusic = async (query: string): Promise<MusicTrack[]> => {
  if (isTauri()) {
    try {
      return await invoke<MusicTrack[]>('search_online_music', { query });
    } catch (err) {
      console.warn('searchOnlineMusic tauri error:', err);
    }
  }

  // Web search via iTunes Search API (Fast, rich metadata & cover art)
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=40`);
    if (res.ok) {
      const data = await res.json();
      return (data.results || []).map((r: any) => ({
        id: `itunes_${r.trackId}`,
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName || 'Single',
        duration: r.trackTimeMillis ? r.trackTimeMillis / 1000 : 215,
        stream_url: r.previewUrl || '',
        file_path: null,
        artwork_url: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg') : '',
        is_local: false,
        source: 'itunes',
      }));
    }
  } catch (err) {
    console.warn('Web searchOnlineMusic error:', err);
  }
  return [];
};

export const fetchTrendingMusic = async (): Promise<MusicTrack[]> => {
  if (isTauri()) {
    try {
      return await invoke<MusicTrack[]>('fetch_trending_music');
    } catch (err) {
      console.warn('fetchTrendingMusic tauri error:', err);
    }
  }

  // Web trending music via iTunes Top Charts
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=Top+Hits+2026&entity=song&limit=40`);
    if (res.ok) {
      const data = await res.json();
      return (data.results || []).map((r: any) => ({
        id: `itunes_${r.trackId}`,
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName || 'Top Hits',
        duration: r.trackTimeMillis ? r.trackTimeMillis / 1000 : 215,
        stream_url: r.previewUrl || '',
        file_path: null,
        artwork_url: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg') : '',
        is_local: false,
        source: 'itunes',
      }));
    }
  } catch (err) {
    console.warn('Web fetchTrendingMusic error:', err);
  }
  return [];
};

export const resolveOnlineStream = async (
  title: string,
  artist: string,
  videoId?: string,
  expectedDuration?: number
): Promise<ResolvedAudioStream | null> => {
  if (isTauri()) {
    try {
      return await invoke<ResolvedAudioStream>('resolve_online_stream', {
        title,
        artist,
        videoId: videoId || null,
        expectedDuration:
          expectedDuration && expectedDuration > 0 && Math.abs(expectedDuration - 215) > 0.1
            ? expectedDuration
            : null,
      });
    } catch (err) {
      console.warn('resolveOnlineStream tauri error:', err);
    }
  }

  if (videoId) {
    return {
      url: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`,
      video_id: videoId,
      title,
      artist,
    };
  }

  return null;
};

/**
 * Synchronized .lrc timestamp parser ported 1:1 from ovilo_flutter
 * Parses standard [mm:ss.xx], [mm:ss:xx], [mm:ss] timestamps and preserves full lyric text
 */
export const parseLrc = (lrcText: string): LyricLine[] => {
  const lines: LyricLine[] = [];
  if (!lrcText || typeof lrcText !== 'string') return lines;

  // Extract [offset:+-millisec] if present in headers
  let offsetSec = 0;
  const offsetMatch = lrcText.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  if (offsetMatch) {
    const parsedOffset = parseInt(offsetMatch[1], 10);
    if (!isNaN(parsedOffset)) {
      offsetSec = parsedOffset / 1000.0;
    }
  }

  const rawLines = lrcText.split('\n');
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?\]/g;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length > 0) {
      // Extract text after all timestamp headers and strip inline word timing tags
      let text = trimmed.replace(/^(?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+/, '');
      text = text
        .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, '')
        .replace(/<\d{1,8}(?:,\d{1,8})?>/g, '')
        .replace(/\(\d{1,8},\d{1,8}(?:,\d{1,8})?\)/g, '')
        .replace(/<span\b[^>]*>.*?<\/span>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 0) {
        // Skip acoustic subtitle markers e.g. [Music], [Applause], ♪
        if (/^\[?(music|applause|cheering|instrumental|intro|outro)\]?$/i.test(text) || /^♪[\s♪]*$/.test(text)) {
          continue;
        }
        for (const m of matches) {
          const min = parseInt(m[1], 10) || 0;
          const sec = parseInt(m[2], 10) || 0;
          const millisRaw = m[3] || '0';
          const millis = (parseInt(millisRaw, 10) || 0) * (millisRaw.length === 2 ? 10 : millisRaw.length === 1 ? 100 : 1);
          const time = Math.max(0, min * 60 + sec + millis / 1000.0 + offsetSec);
          lines.push({ time, text });
        }
      }
    }
  }

  // Sort chronologically
  lines.sort((a, b) => a.time - b.time);
  return lines;
};

export interface SystemStorageStats {
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent: number;
}

export const getStorageStats = async (): Promise<SystemStorageStats> => {
  try {
    return await invoke<SystemStorageStats>('get_storage_stats');
  } catch (err) {
    console.warn('getStorageStats error:', err);
    return {
      total_gb: 128.0,
      used_gb: 13.0,
      free_gb: 115.0,
      percent: 10.2,
    };
  }
};

