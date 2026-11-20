import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isTauri } from './services/platform';
import {
  MediaItem,
  UserData,
  FavoriteItem,
  WatchHistoryItem,
} from './types';
import {
  fetchTrending,
  getUserData,
  toggleFavorite,
  setUserLibrary,
  FALLBACK_TRENDING,
} from './services/api';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { ShowcaseDashboardView } from './components/ShowcaseDashboardView';
import { ShowcaseMoviesView } from './components/ShowcaseMoviesView';
import { ShowcaseMusicView } from './components/ShowcaseMusicView';
import { ShowcaseSettingsView } from './components/ShowcaseSettingsView';
import { DownloadsUnifiedView } from './components/DownloadsUnifiedView';
import { MediaDetailModal } from './components/MediaDetailModal';
import { VideoPlayerView } from './components/VideoPlayerView';
import { SearchModal } from './components/SearchModal';
import { MusicPlayerDock } from './components/MusicPlayerDock';
import { KinoNotch } from './components/KinoNotch';
import { LyricsOverlay } from './components/LyricsOverlay';
import { AppStartupSplash } from './components/InfinityLoader';
import { WelcomeOnboardingModal } from './components/WelcomeOnboardingModal';
import { UpdateNotificationModal } from './components/UpdateNotificationModal';
import {
  subscribeToAppUpdates,
  AppUpdateData,
  dismissUpdateForSession,
} from './services/updateService';
import {
  getLocalProfile,
  fetchCloudData,
  syncToCloud,
  saveLocalMusicFavorites,
  UserProfile,
} from './services/firebaseSync';
import { AudioProvider, useAudio } from './context/AudioContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const { pause, isPlaying, currentTrack, toggleLyricsModal, togglePlay } = useAudio();
  const { theme, setTheme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getLocalProfile());
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [playingMedia, setPlayingMedia] = useState<{
    item: MediaItem;
    season?: number;
    episode?: number;
    directUrl?: string;
  } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [moviesSearchQuery, setMoviesSearchQuery] = useState('');
  const [downloadsSearchQuery, setDownloadsSearchQuery] = useState('');
  const [ftpInitialQuery, setFtpInitialQuery] = useState<string>('');
  const [musicSubTab, setMusicSubTab] = useState<string>('Hits');

  const handleNavigateToFtp = (query: string) => {
    setSelectedMedia(null);
    setFtpInitialQuery(query);
    setActiveTab('ftp');
  };

  const handlePlayDirectVideo = (title: string, url: string, poster?: string) => {
    setPlayingMedia({
      item: {
        id: 0,
        title,
        overview: 'Direct High-Speed Media Stream',
        poster_path: poster || null,
        backdrop_path: poster || null,
        vote_average: 10,
        media_type: 'movie',
      },
      directUrl: url,
    });
  };

  useEffect(() => {
    const handlePlayFtpEvent = (e: any) => {
      if (e.detail?.url) {
        handlePlayDirectVideo(e.detail.title || 'Now Playing', e.detail.url, e.detail.poster);
      }
    };
    window.addEventListener('ovilo_play_ftp_video', handlePlayFtpEvent);
    return () => window.removeEventListener('ovilo_play_ftp_video', handlePlayFtpEvent);
  }, []);

  useEffect(() => {
    const handleSubTab = (e: any) => {
      if (e.detail) setMusicSubTab(e.detail);
    };
    window.addEventListener('ovilo_music_subtab_changed', handleSubTab);
    return () => window.removeEventListener('ovilo_music_subtab_changed', handleSubTab);
  }, []);

  const handleNavigateTab = (tab: string) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    try {
      localStorage.removeItem('ovilo_default_tab');
    } catch {}
  }, []);

  // Sync theme changes to cloud if user is signed in
  useEffect(() => {
    const handleThemeEvent = (e: any) => {
      const cur = getLocalProfile();
      if (cur && !cur.isGuest && (cur.username || cur.uid)) {
        syncToCloud(cur.username || cur.uid || '', { theme: e.detail?.theme });
      }
    };
    window.addEventListener('ovilo_theme_changed', handleThemeEvent);
    return () => window.removeEventListener('ovilo_theme_changed', handleThemeEvent);
  }, []);

  // Listen for global search trigger events
  useEffect(() => {
    const handleSetSearch = (e: any) => {
      const q = e.detail?.query || '';
      if (activeTab.startsWith('music')) {
        setMusicSearchQuery(q);
      } else if (activeTab === 'downloads') {
        setDownloadsSearchQuery(q);
      } else {
        setMoviesSearchQuery(q);
      }
    };
    window.addEventListener('ovilo_set_search_query', handleSetSearch);
    return () => window.removeEventListener('ovilo_set_search_query', handleSetSearch);
  }, [activeTab]);

  // Listen for login modal open request and custom tab navigation
  useEffect(() => {
    const handleOpenLogin = () => {
      setShowOnboarding(true);
    };
    const handleNavEvent = (e: any) => {
      if (e.detail) {
        handleNavigateTab(e.detail);
      }
    };
    window.addEventListener('ovilo_open_login_modal', handleOpenLogin);
    window.addEventListener('ovilo_navigate_tab', handleNavEvent);
    return () => {
      window.removeEventListener('ovilo_open_login_modal', handleOpenLogin);
      window.removeEventListener('ovilo_navigate_tab', handleNavEvent);
    };
  }, []);

  // Tauri native navigation listener + low-frequency fallback for external triggers
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let isMounted = true;

    // Listen for direct Tauri broadcast events (0ms latency, zero polling) if running in desktop mode
    if (isTauri()) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<{ tab?: string; subtab?: string; notch?: string }>('ovilo_navigate', (event) => {
          const payload = event.payload;
          if (payload?.tab) {
            setActiveTab(payload.tab);
            if (payload.subtab) {
              const sub = payload.subtab.toLowerCase();
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('ovilo_navigate_tab', {
                    detail: `${payload.tab}:${sub}`,
                  })
                );
              }, 80);
            }
          }
          if (payload?.notch) {
            if (payload.notch === 'open_login') {
              setShowOnboarding(true);
            } else if (payload.notch === 'close_login') {
              setShowOnboarding(false);
            } else if (payload.notch === 'search') {
              setSearchOpen(true);
            } else if (payload.notch === 'movie_details') {
              setShowOnboarding(false);
              setSelectedMedia({
                id: 1022789,
                title: 'Inside Out 2',
                overview: "Teenager Riley's mind headquarters is undergoing a sudden demolition to make room for unexpected new Emotions: Anxiety, Envy, Ennui, and Embarrassment.",
                poster_path: '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
                backdrop_path: '/xg27NrXi7VXCGUr7MG75UqLl6Vg.jpg',
                vote_average: 8.4,
                release_date: '2024-06-11',
                media_type: 'movie',
              });
            } else if (payload.notch === 'series_details') {
              setShowOnboarding(false);
              setSelectedMedia({
                id: 202879,
                name: 'Dexter: Resurrection',
                overview: "Dexter Morgan returns in this all-new sequel series exploring the continuation of his complex life and internal conflicts.",
                poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
                backdrop_path: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
                vote_average: 8.1,
                first_air_date: '2025-01-15',
                media_type: 'tv',
              });
            } else if (payload.notch === 'close_details') {
              setSelectedMedia(null);
            } else if (payload.notch === 'open_search') {
              setSearchOpen(true);
            } else if (payload.notch === 'close_search') {
              setSearchOpen(false);
            } else if (payload.notch?.startsWith('music_search:')) {
              const q = payload.notch.slice('music_search:'.length);
              setActiveTab('music:browse');
              setMusicSearchQuery(q);
            } else if (payload.notch?.startsWith('movie_search:')) {
              const q = payload.notch.slice('movie_search:'.length);
              setActiveTab('movies');
              setMoviesSearchQuery(q);
            } else if (payload.notch === 'maximize') {
              if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
            } else if (payload.notch === 'unmaximize') {
              if (document.exitFullscreen) document.exitFullscreen();
            } else if (payload.notch === 'toggle_play') {
              togglePlay();
            } else if (payload.notch === 'play_new') {
              togglePlay();
            } else {
              window.dispatchEvent(new CustomEvent('ovilo_notch_control', { detail: payload.notch }));
            }
          }
        }).then((un) => {
          if (isMounted) unlisten = un;
          else un();
        });
      }).catch(() => {});
    }

    // Background IPC fallback (polls every 800ms)
    const pollNav = async () => {
      try {
        const res = await fetch('http://127.0.0.1:4545/poll_nav');
        if (res.ok) {
          const data = await res.json();
          if (data && data.tab && data.tab.length > 0) {
            setActiveTab(data.tab);
          }
          if (data && data.notch && data.notch.length > 0) {
            if (data.notch === 'open_login') {
              setShowOnboarding(true);
            } else if (data.notch === 'close_login') {
              setShowOnboarding(false);
            } else if (data.notch === 'movie_details') {
              setShowOnboarding(false);
              setSelectedMedia({
                id: 1022789,
                title: 'Inside Out 2',
                overview: "Teenager Riley's mind headquarters is undergoing a sudden demolition to make room for unexpected new Emotions: Anxiety, Envy, Ennui, and Embarrassment.",
                poster_path: '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
                backdrop_path: '/xg27NrXi7VXCGUr7MG75UqLl6Vg.jpg',
                vote_average: 8.4,
                release_date: '2024-06-11',
                media_type: 'movie',
              });
            } else if (data.notch === 'series_details') {
              setShowOnboarding(false);
              setSelectedMedia({
                id: 202879,
                name: 'Dexter: Resurrection',
                overview: "Dexter Morgan returns in this all-new sequel series exploring the continuation of his complex life and internal conflicts.",
                poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
                backdrop_path: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
                vote_average: 8.1,
                first_air_date: '2025-01-15',
                media_type: 'tv',
              });
            } else if (data.notch === 'close_details') {
              setSelectedMedia(null);
            } else if (data.notch === 'open_search') {
              setSearchOpen(true);
            } else if (data.notch === 'close_search') {
              setShowOnboarding(false);
              setSearchOpen(false);
            } else if (data.notch?.startsWith('music_search:')) {
              const q = data.notch.slice('music_search:'.length);
              setActiveTab('music:browse');
              setMusicSearchQuery(q);
            } else if (data.notch?.startsWith('movie_search:')) {
              const q = data.notch.slice('movie_search:'.length);
              setActiveTab('movies');
              setMoviesSearchQuery(q);
            } else if (data.notch?.startsWith('fetch_dl:')) {
              const url = decodeURIComponent(data.notch.slice('fetch_dl:'.length));
              setActiveTab('downloads');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ovilo_fetch_download_url', { detail: url }));
              }, 100);
            } else if (data.notch === 'maximize') {
              import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().maximize());
            } else if (data.notch === 'unmaximize') {
              import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().unmaximize());
            } else if (data.notch === 'toggle_play') {
              togglePlay();
            } else if (data.notch === 'play_new') {
              togglePlay();
            } else {
              window.dispatchEvent(new CustomEvent('ovilo_notch_control', { detail: data.notch }));
            }
          }
        }
      } catch {}
    };

    let timer: ReturnType<typeof setInterval> | null = null;
    if (isTauri()) {
      timer = setInterval(pollNav, 800);
    }
    return () => {
      isMounted = false;
      if (unlisten) unlisten();
      if (timer) clearInterval(timer);
    };
  }, []);

  // Global shortcuts: Space for play/pause, Alt+1..5 for tabs, prevent F5/Ctrl+R refresh
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
      }
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        handleNavigateTab('dashboard');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        handleNavigateTab('movies');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        handleNavigateTab('music');
      } else if (e.altKey && e.key === '4') {
        e.preventDefault();
        handleNavigateTab('downloads');
      } else if (e.altKey && e.key === '5') {
        e.preventDefault();
        handleNavigateTab('settings');
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleNavigateTab('music');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ovilo_navigate_tab', { detail: 'music:nowplaying' }));
        }, 80);
      } else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleNavigateTab('movies');
        const target = trending[0] || (FALLBACK_TRENDING as any)[0];
        if (target) setSelectedMedia(target);
      } else if (e.altKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        if (!isPlaying) togglePlay();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ovilo_notch_control', { detail: 'open' }));
        }, 120);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [togglePlay, handleNavigateTab]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUserProfile(getLocalProfile());
    };
    window.addEventListener('ovilo_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('ovilo_profile_updated', handleProfileUpdate);
  }, []);

  // Listen for account logout / library clear
  useEffect(() => {
    const handleClearLibrary = () => {
      setUserData((prev) => ({
        ...prev,
        favorites: [],
        history: [],
      }));
      try {
        localStorage.removeItem('ovilo_favorites');
        localStorage.removeItem('ovilo_watch_history');
      } catch {}
      setUserLibrary([], []);
      saveLocalMusicFavorites([]);
      window.dispatchEvent(new Event('ovilo_music_favorites_updated'));
    };

    window.addEventListener('ovilo_clear_library', handleClearLibrary);
    return () => window.removeEventListener('ovilo_clear_library', handleClearLibrary);
  }, []);

  // Listen for account switched from SettingsView
  useEffect(() => {
    const handleAccountSwitched = (e: any) => {
      const { profile: newProf, data: cloudData } = e.detail || {};
      if (newProf) {
        setUserProfile(newProf);
      }
      const newFavs = cloudData?.movieFavorites || cloudData?.favorites || [];
      const newHist = cloudData?.watchHistory || cloudData?.history || [];
      const newMusic = cloudData?.musicFavorites || [];

      setUserData((prev) => ({
        ...prev,
        favorites: newFavs,
        history: newHist,
      }));

      try {
        localStorage.setItem('ovilo_favorites', JSON.stringify(newFavs));
        localStorage.setItem('ovilo_watch_history', JSON.stringify(newHist));
      } catch {}

      setUserLibrary(newFavs, newHist);
      saveLocalMusicFavorites(newMusic);
      window.dispatchEvent(new Event('ovilo_music_favorites_updated'));

      if (cloudData?.theme) {
        setTheme(cloudData.theme);
      }
    };

    window.addEventListener('ovilo_account_switched', handleAccountSwitched);
    return () => window.removeEventListener('ovilo_account_switched', handleAccountSwitched);
  }, []);

  // Media Rows with instant localStorage / curated fallback hydration (zero-latency boot)
  const [trending, setTrending] = useState<MediaItem[]>(() => {
    try {
      const cached = localStorage.getItem('ovilo_cache_trending');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return FALLBACK_TRENDING;
  });

  // User Data: Favorites & History hydrated instantly from disk/localStorage
  const [userData, setUserData] = useState<UserData>(() => {
    let hist: WatchHistoryItem[] = [];
    let favs: FavoriteItem[] = [];
    const prof = getLocalProfile();
    try {
      if (prof && !prof.isGuest && prof.username) {
        const rawF = localStorage.getItem('ovilo_favorites');
        const rawH = localStorage.getItem('ovilo_watch_history');
        if (rawF) favs = JSON.parse(rawF);
        if (rawH) hist = JSON.parse(rawH);
      } else {
        const rawF = localStorage.getItem('ovilo_guest_favorites');
        const rawH = localStorage.getItem('ovilo_guest_history');
        if (rawF) favs = JSON.parse(rawF);
        if (rawH) hist = JSON.parse(rawH);
      }
    } catch {}
    return {
      settings: {
        custom_tmdb_api_key: '',
        preferred_server: 'vidsrc_ru',
        auto_play_next: true,
        high_quality_posters: true,
      },
      history: hist,
      favorites: favs,
    };
  });

  // Live Cloud App Update State
  const [activeUpdate, setActiveUpdate] = useState<AppUpdateData | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  useEffect(() => {
    // Web version: live cloud updates are handled automatically via CDN/hosting; do not pop up desktop update dialogs
    const unsub = subscribeToAppUpdates((update) => {
      setActiveUpdate(update);
      setUpdateModalOpen(false);
    });
    return () => unsub();
  }, []);

  const handleRemindLater = () => {
    if (activeUpdate) {
      dismissUpdateForSession(activeUpdate.version);
    }
    setUpdateModalOpen(false);
  };

  // Instant App Boot: Dismiss splash screen quickly & fetch fresh data in background
  useEffect(() => {
    let isMounted = true;

    // Display Welcome to Ovilo splash animation, then dismiss and check onboarding status
    const splashTimer = setTimeout(() => {
      if (isMounted) {
        setIsAppLoading(false);
        try {
          const hasCompletedOnboarding = localStorage.getItem('ovilo_onboarding_completed') === 'true';
          const profile = getLocalProfile();
          if (!hasCompletedOnboarding || !profile) {
            setShowOnboarding(true);
          }
        } catch {
          setShowOnboarding(true);
        }
      }
    }, 2600);

    const initBackgroundSync = async () => {
      try {
        const profile = getLocalProfile();
        let loadedFavorites = userData.favorites;
        let loadedHistory = userData.history;

        // 1. Synchronize settings from local Rust backend
        try {
          const uData = await getUserData();
          if (uData?.settings && isMounted) {
            setUserData((prev) => ({
              ...prev,
              settings: uData.settings,
            }));
          }
        } catch {}

        // 2. Cloud Firestore sync in background if signed in
        if (profile && !profile.isGuest && profile.username) {
          try {
            const cloud = await fetchCloudData(profile.username);
            if (cloud && isMounted) {
              if (cloud.avatarUrl && cloud.avatarUrl !== profile.avatarUrl) {
                const updatedProf = { ...profile, avatarUrl: cloud.avatarUrl };
                if (cloud.name) updatedProf.name = cloud.name;
                if (cloud.bio) updatedProf.bio = cloud.bio;
                setUserProfile(updatedProf);
                try {
                  localStorage.setItem('ovilo_user_profile', JSON.stringify(updatedProf));
                } catch {}
                window.dispatchEvent(new Event('ovilo_profile_updated'));
              }
              if (Array.isArray(cloud.movieFavorites)) {
                loadedFavorites = cloud.movieFavorites;
              }
              if (Array.isArray(cloud.watchHistory)) {
                loadedHistory = cloud.watchHistory;
              }
              if (Array.isArray(cloud.musicFavorites)) {
                saveLocalMusicFavorites(cloud.musicFavorites);
                window.dispatchEvent(new Event('ovilo_music_favorites_updated'));
              }
              setUserData((prev) => ({
                ...prev,
                favorites: loadedFavorites,
                history: loadedHistory,
              }));
              try {
                localStorage.setItem('ovilo_favorites', JSON.stringify(loadedFavorites));
                localStorage.setItem('ovilo_watch_history', JSON.stringify(loadedHistory));
              } catch {}
            }
          } catch (cloudErr) {
            console.warn('Background cloud sync fetch:', cloudErr);
          }
        }

        // Keep local Rust storage updated in background
        setUserLibrary(loadedFavorites, loadedHistory).catch(() => {});

        // 3. Fetch fresh TMDB Media Rows in background (Stale-While-Revalidate)
        Promise.allSettled([
          fetchTrending('all', 'day'),
        ]).then(([trendRes]) => {
          if (!isMounted) return;

          if (trendRes.status === 'fulfilled' && trendRes.value.length > 0) {
            setTrending(trendRes.value);
            try { localStorage.setItem('ovilo_cache_trending', JSON.stringify(trendRes.value)); } catch {}
          }
        });
      } catch (err) {
        console.warn('Background initialization error:', err);
      }
    };

    initBackgroundSync();

    return () => {
      isMounted = false;
      clearTimeout(splashTimer);
    };
  }, []);

  // Helper to sync favorites & history to Firebase cloud if account is connected
  const syncToFirebaseCloud = (newFavorites?: FavoriteItem[], newHistory?: WatchHistoryItem[]) => {
    const profile = getLocalProfile();
    if (profile && !profile.isGuest && (profile.username || profile.uid)) {
      syncToCloud(profile.username || profile.uid || '', {
        movieFavorites: newFavorites || userData.favorites,
        watchHistory: newHistory || userData.history,
      }).catch((err) => console.warn('Failed to sync movie collection to Firebase:', err));
    }
  };

  // Keyboard shortcuts: "/" for search, Alt+1-5 or 1-5 for quick tab switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always allow Alt+1-5 to switch tabs even inside input fields
      if (e.altKey) {
        if (e.key === '1') { setActiveTab('dashboard'); return; }
        if (e.key === '2') { setActiveTab('movies'); return; }
        if (e.key === '3') { setActiveTab('music'); return; }
        if (e.key === '4') { setActiveTab('downloads'); return; }
        if (e.key === '5') { setActiveTab('settings'); return; }
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '/' && !searchOpen && !playingMedia) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === '1') {
        setActiveTab('dashboard');
      } else if (e.key === '2') {
        setActiveTab('movies');
      } else if (e.key === '3') {
        setActiveTab('music');
      } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
        setActiveTab('downloads');
      } else if (e.key === '5' || e.key === '7' || e.key === ',') {
        setActiveTab('settings');
      } else if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      } else if (e.key === 'l' || e.key === 'L') {
        toggleLyricsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, playingMedia, activeTab]);

  // Debounce map to prevent rapid double-clicks from causing local/cloud desync
  const favDebounceRef = useRef<Map<number, number>>(new Map());

  // Toggle Favorite with Per-Account Isolation and Cloud Sync
  const handleToggleFavorite = async (item: MediaItem) => {
    const now = Date.now();
    const lastClick = favDebounceRef.current.get(item.id) || 0;
    if (now - lastClick < 400) return;
    favDebounceRef.current.set(item.id, now);

    const favItem: FavoriteItem = {
      id: item.id,
      title: item.title || item.name || 'Untitled',
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      media_type: (item.media_type as 'movie' | 'tv') || (item.title ? 'movie' : 'tv'),
      vote_average: item.vote_average || 0,
      release_year: (item.release_date || item.first_air_date || '').slice(0, 4),
    };

    await toggleFavorite(favItem);
    setUserData((prev) => {
      const exists = prev.favorites.some((f) => f.id === item.id);
      let newFavs = [...prev.favorites];
      if (exists) {
        newFavs = newFavs.filter((f) => f.id !== item.id);
      } else {
        newFavs.unshift(favItem);
      }

      const prof = getLocalProfile();
      if (prof && !prof.isGuest && (prof.username || prof.uid)) {
        syncToFirebaseCloud(newFavs, prev.history);
      } else {
        try {
          localStorage.setItem('ovilo_guest_favorites', JSON.stringify(newFavs));
        } catch {}
      }
      return { ...prev, favorites: newFavs };
    });
  };

  const favoriteIds = new Set(userData.favorites.map((f) => f.id));

  // Automatically pause music whenever user starts watching a movie or TV show
  useEffect(() => {
    if (playingMedia && isPlaying) {
      pause();
    }
  }, [playingMedia]);

  // Play handler with Per-Account Watch History Recording
  const handlePlay = (item: MediaItem, season?: number, episode?: number) => {
    if (isPlaying) pause();
    setSelectedMedia(null);
    setPlayingMedia({
      item,
      season: season || 1,
      episode: episode || 1,
    });

    const isTv = (item.media_type as string) === 'tv' || (!item.title && !!item.name);
    const histItem: WatchHistoryItem = {
      id: item.id,
      title: item.title || item.name || 'Untitled',
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      media_type: isTv ? 'tv' : 'movie',
      season: isTv ? (season || 1) : undefined,
      episode: isTv ? (episode || 1) : undefined,
      last_watched_timestamp: Date.now(),
    };

    setUserData((prev) => {
      const newHist = [histItem, ...prev.history.filter((h) => h.id !== item.id)].slice(0, 50);
      const prof = getLocalProfile();
      if (prof && !prof.isGuest && prof.username) {
        syncToFirebaseCloud(prev.favorites, newHist);
      } else {
        try {
          localStorage.setItem('ovilo_guest_history', JSON.stringify(newHist));
        } catch {}
      }
      return { ...prev, history: newHist };
    });
  };

  const handlePlayHistory = (hist: WatchHistoryItem) => {
    handlePlay(
      {
        id: hist.id,
        title: hist.title,
        poster_path: hist.poster_path,
        backdrop_path: hist.backdrop_path,
        overview: '',
        vote_average: 0,
        media_type: hist.media_type,
      },
      hist.season,
      hist.episode
    );
  };

  const handleClearHistory = () => {
    setUserData((prev) => {
      const prof = getLocalProfile();
      if (prof && !prof.isGuest && prof.username) {
        syncToFirebaseCloud(prev.favorites, []);
      } else {
        try {
          localStorage.removeItem('ovilo_guest_history');
        } catch {}
      }
      return { ...prev, history: [] };
    });
  };

  return (
    <div
      data-theme={theme}
      className={`win ${activeTab.startsWith('music') || playingMedia ? 'no-dock' : ''}`}
    >
      {/* 1. Left Navigation Sidebar (220px) matching showcase mockup */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleNavigateTab}
        history={userData.history}
        onPlayHistory={handlePlayHistory}
        favoritesCount={userData.favorites.length}
        onOpenSettings={() => handleNavigateTab('settings')}
        profile={userProfile}
      />

      {/* 2. Main Area: TopHeader + Content Canvas */}
      <div className="main">
        <TopHeader
          activeTab={activeTab}
          searchQuery={
            activeTab.startsWith('music')
              ? musicSearchQuery
              : (activeTab === 'movies' || activeTab === 'home' || activeTab === 'explore' || activeTab === 'favorites')
              ? moviesSearchQuery
              : activeTab === 'downloads'
              ? downloadsSearchQuery
              : ''
          }
          onSearchChange={(val) => {
            if (activeTab.startsWith('music')) {
              setMusicSearchQuery(val);
            } else if (activeTab === 'movies' || activeTab === 'home' || activeTab === 'explore' || activeTab === 'favorites') {
              setMoviesSearchQuery(val);
            } else if (activeTab === 'downloads') {
              setDownloadsSearchQuery(val);
            }
          }}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenSettings={() => handleNavigateTab('settings')}
          onNavigateTab={handleNavigateTab}
          profile={userProfile}
        />

        <div className="content no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab.startsWith('music') ? 'music' : activeTab}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: 0.21, delay: 0.09, ease: [0.05, 0.7, 0.1, 1] },
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.09, ease: 'linear' },
              }}
              className="w-full"
            >
              {/* TAB 1: DASHBOARD (Matching Sheet 1) */}
              {activeTab === 'dashboard' && (
                <ShowcaseDashboardView
                  history={userData.history}
                  favorites={userData.favorites}
                  profile={userProfile}
                  onNavigateTab={handleNavigateTab}
                  onPlayHistory={handlePlayHistory}
                  onPlayMedia={handlePlay}
                  onSelectMedia={setSelectedMedia}
                />
              )}

              {/* TAB 2: MOVIES & SERIES (Matching Sheet 2) */}
              {(activeTab === 'movies' || activeTab === 'home' || activeTab === 'explore' || activeTab === 'favorites') && (
                <ShowcaseMoviesView
                  trendingItems={trending}
                  favorites={userData.favorites}
                  history={userData.history}
                  onPlay={handlePlay}
                  onSelect={setSelectedMedia}
                  onToggleFavorite={handleToggleFavorite}
                  searchQuery={moviesSearchQuery}
                />
              )}

              {/* TAB 3: MUSIC PLAYER (Matching Sheet 7 & Sheet 8) */}
              {activeTab.startsWith('music') && (
                <ShowcaseMusicView
                  searchQuery={musicSearchQuery}
                  initialSubTab={
                    activeTab === 'music:nowplaying'
                      ? 'Now Playing'
                      : activeTab === 'music:favorites'
                      ? 'Favorites'
                      : activeTab === 'music:downloaded'
                      ? 'Downloaded'
                      : activeTab === 'music:chill'
                      ? 'Chill'
                      : activeTab === 'music:focus'
                      ? 'Focus'
                      : 'Hits'
                  }
                />
              )}

              {/* TAB 4: DOWNLOADS (YT-DLP & FTP POWER VIEW - Matching Sheet 4) */}
              {(activeTab === 'downloads' || activeTab === 'ytdlp' || activeTab === 'ftp') && (
                <DownloadsUnifiedView
                  initialSubTab={activeTab === 'ftp' ? 'ftp' : activeTab === 'ytdlp' ? 'ytdlp' : 'downloads'}
                  initialSearchQuery={ftpInitialQuery}
                  onClearInitialSearchQuery={() => setFtpInitialQuery('')}
                  onPlayDirectVideo={handlePlayDirectVideo}
                />
              )}

              {/* TAB 5: SETTINGS & PROFILE (Kino UI layout with real Cloudinary, Cloud Sync, Theme, Updates) */}
              {(activeTab === 'settings' || activeTab === 'support') && (
                <ShowcaseSettingsView
                  settings={userData.settings}
                  onUpdateSettings={(newSettings) =>
                    setUserData((prev) => ({ ...prev, settings: newSettings }))
                  }
                  history={userData.history}
                  favorites={userData.favorites}
                  onClearHistory={handleClearHistory}
                  onNavigateTab={handleNavigateTab}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Player Display Rules:
          1. Music page + playing -> Bottom player dock appears
          2. Now playing screen -> Bottom player dock goes away
          3. Other pages than music -> Bottom player NOT there, ONLY the notch */}
      {!playingMedia && activeTab.startsWith('music') && activeTab !== 'music:nowplaying' && musicSubTab !== 'Now Playing' && (isPlaying || Boolean(currentTrack)) && (
        <MusicPlayerDock />
      )}

      {/* Floating Dynamic Notch (Rule 3: Appears when music active outside music page) */}
      {!playingMedia && (isPlaying || Boolean(currentTrack)) && !activeTab.startsWith('music') && (
        <KinoNotch onOpenMusicSection={() => handleNavigateTab('music')} />
      )}

      {/* Media Details Modal */}
      <MediaDetailModal
        item={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        onPlay={handlePlay}
        isFavorite={selectedMedia ? favoriteIds.has(selectedMedia.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onSelectSimilar={(sim) => setSelectedMedia(sim)}
        onNavigateToFtp={handleNavigateToFtp}
      />

      {/* VidSrc Video Player Canvas View */}
      {playingMedia && (
        <VideoPlayerView
          item={playingMedia.item}
          season={playingMedia.season}
          episode={playingMedia.episode}
          directUrl={playingMedia.directUrl}
          onBack={() => setPlayingMedia(null)}
          onEpisodeChange={(newSeason, newEpisode) => {
            setPlayingMedia((prev) =>
              prev
                ? {
                    ...prev,
                    season: newSeason,
                    episode: newEpisode,
                  }
                : null
            );
          }}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={setSelectedMedia}
        onPlay={handlePlay}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        activeTab={activeTab}
      />

      {/* Time-Synced Lyrics Drawer / Modal */}
      <LyricsOverlay />

      {/* App Initial Startup Infinity Loader */}
      <AppStartupSplash isLoading={isAppLoading} />

      {/* Welcome Onboarding Modal for First Time Launch / Sign In */}
      <WelcomeOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={(profile, cloudData) => {
          setShowOnboarding(false);
          setUserProfile(profile);
          try {
            localStorage.setItem('ovilo_onboarding_completed', 'true');
          } catch {}

          // 1. Restore Theme Preference
          const targetTheme = cloudData?.theme || profile.theme;
          if (targetTheme && (targetTheme === 'dark' || targetTheme === 'light' || targetTheme === 'cobalt')) {
            setTheme(targetTheme);
          }

          // 2. Load account-specific library (or empty for fresh user)
          const newFavs = cloudData?.movieFavorites || cloudData?.favorites || [];
          const newHist = cloudData?.watchHistory || cloudData?.history || [];
          const newMusic = cloudData?.musicFavorites || [];

          setUserData((prev) => ({
            ...prev,
            favorites: newFavs,
            history: newHist,
          }));

          try {
            localStorage.setItem('ovilo_favorites', JSON.stringify(newFavs));
            localStorage.setItem('ovilo_watch_history', JSON.stringify(newHist));
          } catch {}

          setUserLibrary(newFavs, newHist);
          saveLocalMusicFavorites(newMusic);
          window.dispatchEvent(new Event('ovilo_music_favorites_updated'));
          window.dispatchEvent(new Event('ovilo_profile_updated'));
        }}
      />

      {/* Cloud Update Notification Modal */}
      <UpdateNotificationModal
        update={activeUpdate}
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        onRemindLater={handleRemindLater}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </ThemeProvider>
  );
};

export default App;
