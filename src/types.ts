export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
  genre_ids?: number[];
  popularity?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface VideoItem {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  runtime?: number;
}

export interface MediaDetails extends MediaItem {
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  status?: string;
  credits?: {
    cast: CastMember[];
    crew?: CrewMember[];
  };
  videos?: {
    results: VideoItem[];
  };
  seasons?: Season[];
  similar?: {
    results: MediaItem[];
  };
  recommendations?: {
    results: MediaItem[];
  };
  external_ids?: {
    imdb_id?: string;
  };
}

export interface StreamSource {
  name: string;
  key: string;
  url: string;
  badge: string;
}

export interface AppSettings {
  custom_tmdb_api_key: string;
  preferred_server: string;
  auto_play_next: boolean;
  high_quality_posters: boolean;
  theme?: 'classic' | 'dark' | 'light' | 'cobalt';
}

export interface WatchHistoryItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  last_watched_timestamp: number;
}

export interface FavoriteItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: 'movie' | 'tv';
  vote_average: number;
  release_year?: string;
  added_at?: number;
  overview?: string;
}

export interface UserData {
  settings: AppSettings;
  history: WatchHistoryItem[];
  favorites: FavoriteItem[];
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  stream_url: string;
  file_path?: string;
  artwork_url?: string;
  is_local: boolean;
  has_lyrics: boolean;
}

export interface LyricLine {
  time: number;
  text: string;
  isInstrumental?: boolean;
  isHead?: boolean;
  duration?: number;
}

export interface ResolvedAudioStream {
  url: string;
  video_id?: string;
  duration?: number;
  title?: string;
  artist?: string;
}

export interface LyricsData {
  synced: boolean;
  plain_lyrics?: string;
  synced_lyrics?: string;
  lines?: LyricLine[];
  loadedDuration?: number;
}
