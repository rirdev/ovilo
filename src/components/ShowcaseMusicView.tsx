import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAudio } from '../context/AudioContext';
import {
  Play,
  Pause,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Disc,
  Laptop,
  Download,
  Check,
  Loader2,
  Trash2,
} from 'lucide-react';
import { MusicTrack } from '../types';
import {
  getLocalMusicFavorites,
  saveLocalMusicFavorites,
  getLocalProfile,
  syncToCloud,
} from '../services/firebaseSync';
import { fetchTrendingMusic, searchOnlineMusic, scanLocalMusic } from '../services/api';
import {
  downloadMusicTrack,
  getDiskDownloads,
  getDownloads,
  deleteDiskDownload,
  DownloadItem,
  DiskFileItem,
  formatBytes,
} from '../services/downloadManager';
import { KinoDownloadButton } from './KinoDownloadButton';
import { triggerLikeBurst } from '../services/kinoMotion';
import { getAudioVisualizer } from '../context/AudioContext';
import { LyricsPlaybackClock } from '../lib/lyricsClock';

interface ShowcaseMusicViewProps {
  initialSubTab?: string;
  searchQuery?: string;
}

export const ShowcaseMusicView: React.FC<ShowcaseMusicViewProps> = ({
  initialSubTab = 'Hits',
  searchQuery = '',
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    isMuted,
    isShuffle,
    repeatMode,
    lyrics,
    isLoadingLyrics,
    playTrack,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    lyricOffset,
    setLyricOffset,
    adjustLyricOffset,
    getAudioElement,
    getTrackArtwork,
  } = useAudio();

  const [activeChip, setActiveChip] = useState<string>(initialSubTab || 'Hits');

  useEffect(() => {
    if (initialSubTab) {
      setActiveChip(initialSubTab);
    }
  }, [initialSubTab]);
  const [favorites, setFavorites] = useState<MusicTrack[]>(() => getLocalMusicFavorites());
  const [onlineTrending, setOnlineTrending] = useState<MusicTrack[]>([]);
  const [localTracks, setLocalTracks] = useState<MusicTrack[]>([]);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    scanLocalMusic().then((t) => {
      if (t && t.length > 0) setLocalTracks(t);
    });
  }, []);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const eqBarsRef = useRef<(HTMLElement | null)[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<DownloadItem[]>(() => getDownloads());

  useEffect(() => {
    const syncDownloads = () => {
      setActiveDownloads(getDownloads());
    };
    syncDownloads();
    window.addEventListener('ovilo_download_update', syncDownloads);
    window.addEventListener('ovilo_downloads_sync', syncDownloads);
    return () => {
      window.removeEventListener('ovilo_download_update', syncDownloads);
      window.removeEventListener('ovilo_downloads_sync', syncDownloads);
    };
  }, []);

  const isTrackSaved = (title: string, _artist?: string) => {
    if (!title) return false;
    const cleanT = title.trim().toLowerCase();
    return diskTracks.some((d) => {
      const dName = (d.name || '').trim().toLowerCase();
      return dName === cleanT || (cleanT.length >= 4 && (dName.includes(cleanT) || cleanT.includes(dName)));
    });
  };

  const isTrackDownloading = (title: string) => {
    if (!title) return false;
    const cleanT = title.trim().toLowerCase();
    return activeDownloads.some(
      (d) =>
        (d.status === 'downloading' || d.status === 'fetching' || d.status === 'processing') &&
        ((d.title || '').trim().toLowerCase() === cleanT || (cleanT.length >= 4 && (d.title || '').trim().toLowerCase().includes(cleanT)))
    );
  };

  // Web Audio API Live Equalizer & Beat Pulse Loop
  useEffect(() => {
    const audio = (window as any).__oviloAudio as HTMLAudioElement | undefined;
    const { ctx, analyser } = getAudioVisualizer();
    if (!ctx || !analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const hz = ctx.sampleRate / analyser.fftSize;
    const lo = 40, hi = 12000;
    const numBars = 28;

    // Bin range for each bar, log-spaced
    const edges: [number, number][] = Array.from({ length: numBars }, (_, i) => {
      const a = lo * Math.pow(hi / lo, i / numBars);
      const b = lo * Math.pow(hi / lo, (i + 1) / numBars);
      return [
        Math.floor(a / hz),
        Math.max(Math.floor(a / hz) + 1, Math.floor(b / hz))
      ];
    });

    let avg = 0;
    let lastBeat = 0;
    let animId = 0;

    const pulse = () => {
      if (coverRef.current) {
        coverRef.current.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.06)' },
            { transform: 'scale(1)' }
          ],
          { duration: 220, easing: 'cubic-bezier(.34,1.5,.5,1)' }
        );
      }
    };

    const detectBeat = () => {
      // Bins 1–6 ≈ 43–260 Hz (kick drum + bass)
      let bass = 0;
      for (let k = 1; k <= 6; k++) bass += data[k] || 0;
      bass /= 6 * 255;

      avg = avg * 0.95 + bass * 0.05; // rolling average
      const now = performance.now();
      if (bass > avg * 1.3 && bass > 0.45 && now - lastBeat > 240) {
        lastBeat = now;
        pulse();
      }
    };

    function draw() {
      if (!analyser) return;
      analyser.getByteFrequencyData(data);

      let total = 0;
      for (let k = 0; k < 64; k++) total += data[k] || 0;

      // If remote audio CORS keeps data zeroed, synthesize live acoustic harmonics based on currentTime
      if (total === 0 && audio && !audio.paused) {
        const cur = audio.currentTime || 0;
        const beatVal = Math.pow(Math.sin((cur * 2.2) % Math.PI), 4);
        for (let k = 0; k < data.length; k++) {
          if (k <= 6) {
            data[k] = Math.min(255, Math.floor(beatVal * 230 + Math.random() * 25));
          } else if (k <= 40) {
            data[k] = Math.min(255, Math.floor((0.35 + 0.3 * Math.sin(cur * 3.7 + k * 0.15)) * 255));
          } else {
            data[k] = Math.min(255, Math.floor((0.25 + 0.25 * Math.sin(cur * 6.5 + k * 0.1)) * 255));
          }
        }
      }

      eqBarsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const [s, e] = edges[i] || [0, 1];
        let sum = 0;
        for (let k = s; k < e; k++) sum += data[k] || 0;
        const v = (e > s) ? sum / (e - s) / 255 : 0; // 0..1
        bar.style.transform = `scaleY(${Math.max(0.08, v)})`;
      });

      // Also drive notch bars if present
      const notchBars = document.querySelectorAll('.neq i');
      if (notchBars.length > 0) {
        const b1 = (data[2] || 0) / 255;
        const b2 = (data[4] || 0) / 255;
        const b3 = (data[8] || 0) / 255;
        const b4 = (data[16] || 0) / 255;
        notchBars.forEach((nb, idx) => {
          const val = idx === 0 ? b1 : idx === 1 ? b2 : idx === 2 ? b3 : b4;
          (nb as HTMLElement).style.transform = `scaleY(${Math.max(0.15, val)})`;
        });
      }

      detectBeat();

      if (isPlaying && audio && !audio.paused) {
        animId = requestAnimationFrame(draw);
      }
    }

    if (isPlaying) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      animId = requestAnimationFrame(draw);
    } else {
      eqBarsRef.current.forEach((bar) => {
        if (bar) bar.style.transform = 'scaleY(0.08)';
      });
      const notchBars = document.querySelectorAll('.neq i');
      notchBars.forEach((nb) => {
        (nb as HTMLElement).style.transform = 'scaleY(0.15)';
      });
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

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
        const [localRes, onlineRes] = await Promise.all([
          scanLocalMusic().catch(() => []),
          searchOnlineMusic(q).catch(() => []),
        ]);
        if (isCurrent) {
          const lowerQ = q.toLowerCase();
          const matchedLocal = (localRes || []).filter(
            (t) => t.title.toLowerCase().includes(lowerQ) || t.artist.toLowerCase().includes(lowerQ)
          );
          const localTitles = new Set(matchedLocal.map((t) => t.title.toLowerCase()));
          const filteredOnline = (onlineRes || []).filter(
            (t) => !localTitles.has(t.title.toLowerCase())
          );
          setSearchResults([...matchedLocal, ...filteredOnline]);
        }
      } catch (err) {
        console.warn('Music search error:', err);
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleDownloadMusic = async (track: { title: string; artist: string; stream_url?: string; cover?: string }): Promise<string> => {
    // If the track is already in the local offline library, inform the user immediately
    if (track.stream_url?.includes('127.0.0.1:4545') || (track as any).is_local || isTrackSaved(track.title, track.artist)) {
      setDownloadToast(`Already saved in your offline library: ${track.title}`);
      setTimeout(() => setDownloadToast(null), 3500);
      return 'saved_offline';
    }

    const cleanTitle = (track.title || '').replace(/[#[\]()]/g, ' ').trim();
    const cleanArtist = (track.artist || '').replace(/[#[\]()]/g, ' ').trim();

    const isPreviewOrIncomplete = Boolean(
      !track.stream_url ||
      track.stream_url.includes('apple.com') ||
      track.stream_url.includes('mzstatic.com') ||
      track.stream_url.includes('itunes') ||
      track.stream_url.includes('AudioPreview') ||
      track.stream_url.includes('AudioPreview_dummy') ||
      track.stream_url.includes('pixabay')
    );

    setDownloadToast(`Starting download: ${track.title}...`);
    try {
      const id = await downloadMusicTrack({
        title: cleanTitle || track.title,
        artist: cleanArtist || track.artist,
        streamUrl: isPreviewOrIncomplete ? undefined : track.stream_url,
        thumbnail: track.cover,
      });
      setDownloadToast(`Downloading: ${track.title}`);
      setTimeout(() => setDownloadToast(null), 3500);
      return id;
    } catch (err: any) {
      setDownloadToast(`Download failed: ${err?.message || 'Error starting download'}`);
      setTimeout(() => setDownloadToast(null), 3500);
      return '';
    }
  };

  const renderRowDownloadBtn = (t: { title: string; artist: string; stream_url?: string; cover?: string; artwork_url?: string }) => {
    const isSaved = isTrackSaved(t.title, t.artist);
    const isDownloading = isTrackDownloading(t.title);

    if (isDownloading) {
      return (
        <span className="p-1 text-[var(--kino-yellow,#ffd24d)] inline-flex items-center" title="Downloading song...">
          <Loader2 className="w-4 h-4 animate-spin" />
        </span>
      );
    }
    if (isSaved) {
      return (
        <span className="p-1 text-[var(--kino-mint,#5be1b8)] inline-flex items-center" title="Downloaded offline">
          <Check className="w-4 h-4" />
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDownloadMusic({
            title: t.title,
            artist: t.artist,
            stream_url: t.stream_url,
            cover: t.cover || t.artwork_url,
          });
        }}
        className="p-1 border-0 bg-transparent text-[var(--kino-on-var)] hover:text-white cursor-pointer transition-colors"
        title="Download track"
      >
        <Download className="w-4 h-4" />
      </button>
    );
  };

  useEffect(() => {
    const handleTrigger = (data: { title: string; artist: string; stream_url?: string; cover?: string }) => {
      handleDownloadMusic(data);
    };

    const unlisten = listen('ovilo_test_download_music', (event: any) => {
      const p = event.payload || {};
      handleTrigger({
        title: p.title || 'Die With A Smile',
        artist: p.artist || 'Lady Gaga & Bruno Mars',
      });
    });

    const onCustom = (e: any) => {
      handleTrigger(e.detail || {});
    };
    window.addEventListener('ovilo_test_download_music', onCustom);

    return () => {
      unlisten.then((fn) => fn());
      window.removeEventListener('ovilo_test_download_music', onCustom);
    };
  }, []);

  useEffect(() => {
    if (initialSubTab) {
      setActiveChip(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ovilo_music_subtab_changed', { detail: activeChip }));
  }, [activeChip]);

  useEffect(() => {
    const syncFavs = () => {
      setFavorites(getLocalMusicFavorites());
    };
    window.addEventListener('ovilo_music_favorites_updated', syncFavs);
    window.addEventListener('ovilo_profile_updated', syncFavs);
    return () => {
      window.removeEventListener('ovilo_music_favorites_updated', syncFavs);
      window.removeEventListener('ovilo_profile_updated', syncFavs);
    };
  }, []);

  // Fetch real online trending music on mount
  useEffect(() => {
    fetchTrendingMusic()
      .then((tracks) => {
        if (tracks && tracks.length > 0) {
          setOnlineTrending(tracks);
        }
      })
      .catch(() => {});
  }, []);

  const [diskTracks, setDiskTracks] = useState<DiskFileItem[]>([]);

  const refreshDiskTracks = async () => {
    try {
      const files = await getDiskDownloads();
      const audioFiles = files.filter((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        return ext === 'mp3' || ext === 'm4a' || ext === 'flac' || ext === 'wav' || ext === 'ogg' || ext === 'webm' || (f as any).format === 'audio_mp3';
      });
      setDiskTracks(audioFiles);
    } catch {}
  };

  useEffect(() => {
    refreshDiskTracks();
    const interval = setInterval(refreshDiskTracks, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail === 'music:nowplaying') {
        setActiveChip('Now Playing');
      } else if (e.detail === 'music:favorites') {
        setActiveChip('Favorites');
      } else if (e.detail === 'music:downloaded') {
        setActiveChip('Downloaded');
      } else if (e.detail === 'music:browse' || e.detail === 'music') {
        setActiveChip('Hits');
      }
    };
    window.addEventListener('ovilo_navigate_tab', handleNav);
    return () => window.removeEventListener('ovilo_navigate_tab', handleNav);
  }, []);

  const chips = ['Hits', 'New', 'Chill', 'Workout', 'Focus', 'Downloaded', 'Favorites', 'Now Playing'];

  interface DisplayTrack {
    id?: string;
    title: string;
    artist: string;
    time: string;
    trend: string;
    duration: number;
    cover: string;
    stream_url?: string;
    file_path?: string;
    is_local?: boolean;
    has_lyrics?: boolean;
  }

  const newTracks: DisplayTrack[] = [
    {
      id: 'new_1',
      title: 'Taste',
      artist: 'Sabrina Carpenter',
      time: '2:37',
      trend: 'up',
      duration: 157,
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'new_2',
      title: 'Birds of a Feather',
      artist: 'Billie Eilish',
      time: '3:03',
      trend: 'up',
      duration: 183,
      cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'new_3',
      title: 'Die With A Smile',
      artist: 'Lady Gaga & Bruno Mars',
      time: '4:11',
      trend: 'up',
      duration: 251,
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'new_4',
      title: 'Good Luck, Babe!',
      artist: 'Chappell Roan',
      time: '3:38',
      trend: 'up',
      duration: 218,
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'new_5',
      title: 'I Had Some Help',
      artist: 'Post Malone & Morgan Wallen',
      time: '2:58',
      trend: 'eq',
      duration: 178,
      cover: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'new_6',
      title: 'Espresso',
      artist: 'Sabrina Carpenter',
      time: '2:55',
      trend: 'up',
      duration: 175,
      cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=300&auto=format&fit=crop',
    },
  ];

  const chillTracks: DisplayTrack[] = [
    {
      id: 'chill_1',
      title: 'Texas Sun',
      artist: 'Leon Bridges & Khruangbin',
      time: '4:12',
      trend: 'eq',
      duration: 252,
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'chill_2',
      title: 'Come Away With Me',
      artist: 'Norah Jones',
      time: '3:18',
      trend: 'up',
      duration: 198,
      cover: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'chill_3',
      title: 'Apocalypse',
      artist: 'Cigarettes After Sex',
      time: '4:50',
      trend: 'eq',
      duration: 290,
      cover: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'chill_4',
      title: 'Mystery of Love',
      artist: 'Sufjan Stevens',
      time: '4:08',
      trend: 'up',
      duration: 248,
      cover: 'https://images.unsplash.com/photo-1445985543469-433ecdd62977?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'chill_5',
      title: 'Anchor',
      artist: 'Novo Amor',
      time: '3:17',
      trend: 'eq',
      duration: 197,
      cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'chill_6',
      title: 'Coffee',
      artist: 'beabadoobee',
      time: '2:06',
      trend: 'up',
      duration: 126,
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
    },
  ];

  const workoutTracks: DisplayTrack[] = [
    {
      id: 'wo_1',
      title: 'Houdini',
      artist: 'Dua Lipa',
      time: '3:05',
      trend: 'up',
      duration: 185,
      cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'wo_2',
      title: '(It Goes Like) Nanana',
      artist: 'Peggy Gou',
      time: '3:51',
      trend: 'up',
      duration: 231,
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'wo_3',
      title: 'Miracle',
      artist: 'Calvin Harris & Ellie Goulding',
      time: '3:06',
      trend: 'eq',
      duration: 186,
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'wo_4',
      title: 'Losing It',
      artist: 'FISHER',
      time: '4:08',
      trend: 'up',
      duration: 248,
      cover: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'wo_5',
      title: 'Rhyme Dust',
      artist: 'MK & Dom Dolla',
      time: '3:00',
      trend: 'eq',
      duration: 180,
      cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'wo_6',
      title: 'Baby again..',
      artist: 'Skrillex, Fred again.. & Four Tet',
      time: '5:19',
      trend: 'up',
      duration: 319,
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300&auto=format&fit=crop',
    },
  ];

  const focusTracks: DisplayTrack[] = [
    {
      id: 'fc_1',
      title: 'Time',
      artist: 'Hans Zimmer',
      time: '4:35',
      trend: 'eq',
      duration: 275,
      cover: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'fc_2',
      title: 'Nuvole Bianche',
      artist: 'Ludovico Einaudi',
      time: '5:57',
      trend: 'up',
      duration: 357,
      cover: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'fc_3',
      title: 'On The Nature of Daylight',
      artist: 'Max Richter',
      time: '6:11',
      trend: 'eq',
      duration: 371,
      cover: 'https://images.unsplash.com/photo-1445985543469-433ecdd62977?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'fc_4',
      title: 'Saman',
      artist: 'Ólafur Arnalds',
      time: '2:11',
      trend: 'up',
      duration: 131,
      cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'fc_5',
      title: 'Daylight',
      artist: 'Lofi Fruits Music',
      time: '2:14',
      trend: 'up',
      duration: 134,
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
    },
  ];

  const showcaseTracks: DisplayTrack[] = [
    {
      id: 'st_1',
      title: 'Slow Harbour',
      artist: 'Mira Okafor',
      time: '3:41',
      trend: 'up',
      duration: 221,
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'st_2',
      title: 'Paper Lanterns',
      artist: 'Mira Okafor',
      time: '3:12',
      trend: 'up',
      duration: 192,
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'st_3',
      title: 'Low Water',
      artist: 'Offcuts',
      time: '4:05',
      trend: 'eq',
      duration: 245,
      cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'st_4',
      title: 'North Pier',
      artist: 'Anya Vale',
      time: '2:48',
      trend: 'up',
      duration: 168,
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'st_5',
      title: 'Salt Sleep',
      artist: 'Kojo & The Sea',
      time: '3:30',
      trend: 'down',
      duration: 210,
      cover: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'st_6',
      title: 'Distant Bell',
      artist: 'Wren Martin',
      time: '3:19',
      trend: 'eq',
      duration: 199,
      cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=300&auto=format&fit=crop',
    },
  ];

  const localDisplayTracks: DisplayTrack[] = useMemo(() => {
    return localTracks.map((t, i) => {
      const d = t.duration || 180;
      const art = t.artwork_url
        ? (t.artwork_url.startsWith('http') ? t.artwork_url : `http://127.0.0.1:4545/media?path=${encodeURIComponent(t.artwork_url)}`)
        : showcaseTracks[i % showcaseTracks.length].cover;
      return {
        id: t.id,
        title: t.title,
        artist: t.artist,
        time: `${Math.floor(d / 60)}:${Math.floor(d % 60).toString().padStart(2, '0')}`,
        trend: i % 3 === 0 ? 'up' : i % 3 === 1 ? 'eq' : 'down',
        duration: d,
        cover: art,
        stream_url: t.stream_url,
        file_path: t.file_path,
        is_local: t.is_local,
        has_lyrics: t.has_lyrics,
      };
    });
  }, [localTracks]);

  const tracksToDisplay: DisplayTrack[] = useMemo(() => {
    if (activeChip === 'Chill') return localDisplayTracks.length > 0 ? localDisplayTracks : chillTracks;
    if (activeChip === 'Focus') return localDisplayTracks.length > 0 ? localDisplayTracks : focusTracks;
    if (activeChip === 'New') return localDisplayTracks.length > 0 ? localDisplayTracks : newTracks;
    if (activeChip === 'Workout') return workoutTracks;
    if (activeChip === 'Downloaded') return localDisplayTracks;
    return onlineTrending.length > 0
      ? onlineTrending.map((t, i) => {
          const d = t.duration || 210;
          return {
            id: t.id,
            title: t.title,
            artist: t.artist,
            time: `${Math.floor(d / 60)}:${Math.floor(d % 60).toString().padStart(2, '0')}`,
            trend: i % 3 === 0 ? 'up' : i % 3 === 1 ? 'eq' : 'down',
            duration: d,
            cover: t.artwork_url || showcaseTracks[i % showcaseTracks.length].cover,
            stream_url: t.stream_url,
            file_path: t.file_path,
            is_local: Boolean(t.is_local),
            has_lyrics: Boolean(t.has_lyrics),
          };
        })
      : (localDisplayTracks.length > 0 ? localDisplayTracks : showcaseTracks);
  }, [activeChip, onlineTrending, localDisplayTracks]);

  const heroTrack = tracksToDisplay[0];

  const handlePlayHero = () => {
    if (!heroTrack) return;
    if (currentTrack?.title === heroTrack.title) {
      togglePlay();
    } else {
      const q: MusicTrack[] = tracksToDisplay.map((dt, idx) => ({
        id: dt.id || `track_row_${idx + 1}`,
        title: dt.title,
        artist: dt.artist,
        duration: dt.duration,
        stream_url: dt.stream_url || '',
        file_path: dt.file_path,
        artwork_url: dt.cover,
        is_local: Boolean(dt.is_local),
        has_lyrics: Boolean(dt.has_lyrics),
      }));
      playTrack({
        id: heroTrack.id || 'hero_track_1',
        title: heroTrack.title,
        artist: heroTrack.artist,
        duration: heroTrack.duration,
        stream_url: heroTrack.stream_url || '',
        file_path: heroTrack.file_path,
        artwork_url: heroTrack.cover,
        is_local: Boolean(heroTrack.is_local),
        has_lyrics: Boolean(heroTrack.has_lyrics),
      }, q);
    }
  };

  const handlePlayRow = (t: DisplayTrack, i: number) => {
    const q: MusicTrack[] = tracksToDisplay.map((dt, idx) => ({
      id: dt.id || `track_row_${idx + 1}`,
      title: dt.title,
      artist: dt.artist,
      duration: dt.duration,
      stream_url: dt.stream_url || '',
      file_path: dt.file_path,
      artwork_url: dt.cover,
      is_local: Boolean(dt.is_local),
      has_lyrics: Boolean(dt.has_lyrics),
    }));
    playTrack({
      id: t.id || `track_row_${i + 1}`,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      stream_url: t.stream_url || '',
      file_path: t.file_path,
      artwork_url: t.cover,
      is_local: Boolean(t.is_local),
      has_lyrics: Boolean(t.has_lyrics),
    }, q);
    setActiveChip('Now Playing');
  };

  const handlePlayFavorite = (t: MusicTrack, queue: MusicTrack[]) => {
    if (currentTrack?.id === t.id) {
      togglePlay();
    } else {
      playTrack(t, queue);
    }
    setActiveChip('Now Playing');
  };

  const handlePlayOnlineTrack = (t: MusicTrack) => {
    if (currentTrack?.id === t.id) {
      togglePlay();
    } else {
      playTrack(t, searchResults);
    }
    setActiveChip('Now Playing');
  };

  const isFavorited = (title: string, id?: string) =>
    favorites.some((f) => (id && f.id === id) || f.title.toLowerCase() === title.toLowerCase());

  const toggleFavoriteTrack = (t: { id?: string; title: string; artist: string; duration?: number; cover?: string; artwork_url?: string; stream_url?: string }) => {
    let next: MusicTrack[];
    if (isFavorited(t.title, t.id)) {
      next = favorites.filter((f) => (t.id ? f.id !== t.id : true) && f.title.toLowerCase() !== t.title.toLowerCase());
    } else {
      const newTrack: MusicTrack = {
        id: t.id || `fav_${t.title.replace(/\s+/g, '_')}`,
        title: t.title,
        artist: t.artist,
        duration: t.duration || 210,
        stream_url: t.stream_url || '',
        artwork_url: t.cover || t.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
        is_local: false,
        has_lyrics: false,
      };
      next = [newTrack, ...favorites];
    }
    setFavorites(next);
    saveLocalMusicFavorites(next);
    const p = getLocalProfile();
    if (p && !p.isGuest && (p.username || p.uid)) {
      syncToCloud(p.username || p.uid || '', { musicFavorites: next });
    }
    window.dispatchEvent(new CustomEvent('ovilo_music_favorites_updated'));
  };

  const artists = [
    {
      name: 'Sabrina C.',
      fullName: 'Sabrina Carpenter',
      photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Sabrina_Carpenter_-_O2_Arena_2025_-_086_%28cropped_2%29.jpg/330px-Sabrina_Carpenter_-_O2_Arena_2025_-_086_%28cropped_2%29.jpg',
    },
    {
      name: 'The Weeknd',
      fullName: 'The Weeknd',
      photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/The_Weeknd_Portrait_by_Brian_Ziff.jpg/330px-The_Weeknd_Portrait_by_Brian_Ziff.jpg',
    },
    {
      name: 'Taylor Swift',
      fullName: 'Taylor Swift',
      photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png/330px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png',
    },
    {
      name: 'Billie Eilish',
      fullName: 'Billie Eilish',
      photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/BillieEilishO2140725-39_-_54665577407_%28cropped%29.jpg/330px-BillieEilishO2140725-39_-_54665577407_%28cropped%29.jpg',
    },
    {
      name: 'Kendrick L.',
      fullName: 'Kendrick Lamar',
      photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/KendrickSZASPurs230725-144_%28cropped%29_desaturated.jpg/330px-KendrickSZASPurs230725-144_%28cropped%29_desaturated.jpg',
    },
    {
      name: 'Post Malone',
      fullName: 'Post Malone',
      photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Post_Malone_July_2021_%28cropped%29.jpg/330px-Post_Malone_July_2021_%28cropped%29.jpg',
    },
  ];

  // Now Playing state
  const currentTitle = currentTrack?.title || (localTracks[0]?.title || 'Slow Harbour');
  const currentArtist = currentTrack?.artist || (localTracks[0]?.artist || 'Mira Okafor');
  const currentCover = getTrackArtwork(currentTrack);
  const effectiveDuration = duration > 0 ? duration : (currentTrack?.duration || 0);
  const effectiveTime = currentTime + lyricOffset;
  const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (effectiveTime / effectiveDuration) * 100)) : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const clockRef = useRef<LyricsPlaybackClock>(new LyricsPlaybackClock());
  const [activeLyricIdx, setActiveLyricIdx] = useState<number>(0);
  const activeLyricIdxRef = useRef<number>(0);
  activeLyricIdxRef.current = activeLyricIdx;

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || effectiveDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = ratio * effectiveDuration;
    clockRef.current.reset(target);
    seek(target);
  };

  const defaultLyrics = [
    'Rain on the rope and the tide takes its time',
    'I count the gulls and the cables on the pier',
    'The last ferry leaves before the lights come on',
    'Slow harbour, slow harbour',
    'Say my name where the water meets the stone',
    'Everything I carried fits inside this coat',
    'Slow harbour, slow harbour',
  ];

  const syncedLines = lyrics?.lines || [];

  // Reset clock on track change or initial load
  useEffect(() => {
    clockRef.current.reset(currentTime);
  }, [currentTrack?.id]);

  // Real-time lyrics tracking with 300ms lead anticipation (ArchiveTune pattern)
  useEffect(() => {
    if (activeChip !== 'Now Playing' || syncedLines.length === 0) return;

    let animId: number;
    const audio = getAudioElement ? getAudioElement() : null;

    const tick = () => {
      const pos = audio ? audio.currentTime : currentTime;
      const effectivePos = Math.max(0, pos + lyricOffset);

      let newIdx = -1;
      for (let i = 0; i < syncedLines.length; i++) {
        if (effectivePos >= syncedLines[i].time) {
          newIdx = i;
        } else {
          break;
        }
      }

      if (newIdx !== activeLyricIdxRef.current) {
        activeLyricIdxRef.current = newIdx;
        setActiveLyricIdx(newIdx);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [activeChip, syncedLines, lyricOffset, getAudioElement]);

  const currentLyricIdx = syncedLines.length > 0
    ? activeLyricIdx
    : Math.min(defaultLyrics.length - 1, Math.floor((progressPercent / 100) * defaultLyrics.length));

  const activeLyricRef = useRef<HTMLDivElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const lastUserScrollTimeRef = useRef<number>(0);
  const scrollAnimRef = useRef<number | null>(null);

  // Silky smooth rAF ease-out cubic scroll animation (works 100% reliably in WebKitGTK Linux)
  const smoothScrollTo = useCallback((container: HTMLElement, targetY: number) => {
    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }
    const startY = container.scrollTop;
    const diff = targetY - startY;
    if (Math.abs(diff) < 2) {
      container.scrollTop = targetY;
      return;
    }
    const startTime = performance.now();
    const duration = 380; // 380ms smooth curve

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic curve
      const ease = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = startY + diff * ease;
      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = null;
      }
    };
    scrollAnimRef.current = requestAnimationFrame(step);
  }, []);

  // Smoothly center the active lyric inside the card matching ArchiveTune targetOffset (35% from top)
  useEffect(() => {
    if (activeChip !== 'Now Playing') return;
    const container = lyricsContainerRef.current;
    if (!container) return;

    // Give user 3.5 seconds of pause after manual scrolling before resuming auto-scroll (ArchiveTune pattern)
    if (Date.now() - lastUserScrollTimeRef.current < 3500) return;

    if (currentLyricIdx <= 0) {
      smoothScrollTo(container, 0);
      return;
    }

    const activeEl = document.getElementById(`nowplaying-lyric-${currentLyricIdx}`);
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop;
      // ArchiveTune targetOffset: viewportHeight * 0.35f (35% from top)
      const targetScroll = Math.max(0, relativeTop - (container.clientHeight * 0.35));
      smoothScrollTo(container, targetScroll);
    }
  }, [currentLyricIdx, activeChip, smoothScrollTo]);

  return (
    <div className="w-full select-none pb-14">
      {/* 1. Header with Title + Chips (Exact Sheet 7 .dh & .chips) */}
      <div className="dh">
        <h1>Music</h1>
        <div className="chips">
          {chips.map((c) => (
            <span
              key={c}
              onClick={() => setActiveChip(c)}
              className={`chip cursor-pointer ${activeChip === c ? 'on' : ''}`}
            >
              {c === 'Favorites' ? `Favorites (${favorites.length})` : c}
            </span>
          ))}
        </div>
      </div>

      {searchQuery && searchQuery.trim() ? (
        <div className="space-y-4 mt-2">
          <div className="sec flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
              {isSearching ? `Searching for "${searchQuery}"...` : `Search results for "${searchQuery}" (${searchResults.length})`}
            </h2>
          </div>

          {isSearching ? (
            <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#ffd24d]" />
              <span className="text-xs">Searching online music catalog...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="box" style={{ padding: '8px' }}>
              <div className="ql">
                {searchResults.map((t, idx) => {
                  const isCur = currentTrack?.id === t.id && isPlaying;
                  const isFav = isFavorited(t.title, t.id);
                  const artwork = t.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
                  return (
                    <div
                      key={t.id || idx}
                      onClick={() => handlePlayOnlineTrack(t)}
                      className={`q cursor-pointer transition-colors ${isCur ? 'bg-white/10' : ''}`}
                    >
                      <span className="n font-bold">{idx + 1}</span>
                      <div className="th overflow-hidden rounded-md relative" style={{ background: 'var(--kino-surface-hi)' }}>
                        <img src={artwork} alt={t.title} className="w-full h-full object-cover" />
                        {isCur && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-[var(--kino-yellow,#ffd24d)] animate-ping" />
                          </div>
                        )}
                      </div>
                      <div className="m" style={{ minWidth: 0 }}>
                        <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {t.title}
                        </b>
                        <small style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {t.artist}
                        </small>
                      </div>
                      <span className="tr">-</span>
                      <span className="tm">{t.duration ? `${Math.floor(t.duration / 60)}:${Math.floor(t.duration % 60).toString().padStart(2, '0')}` : '3:30'}</span>
                      {renderRowDownloadBtn({
                        title: t.title,
                        artist: t.artist,
                        stream_url: t.stream_url,
                        cover: artwork,
                      })}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteTrack(t);
                        }}
                        className="p-1 border-0 bg-transparent cursor-pointer"
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart
                          className="w-4 h-4"
                          style={{
                            fill: isFav ? 'var(--kino-coral)' : 'none',
                            color: isFav ? 'var(--kino-coral)' : 'var(--kino-on-var)',
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="box p-12 text-center text-neutral-400 text-xs">
              No tracks found matching "{searchQuery}". Try another song title or artist name.
            </div>
          )}
        </div>
      ) : activeChip === 'Now Playing' ? (
        <div className="npg mt-2">
          {/* Left Column: Cover + Metadata + Scrubber + Controls + Tools */}
          <div>
            <div
              ref={coverRef}
              className="tilt cover relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1f1f24 0%, #111114 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="v" />
              <img
                src={currentCover}
                alt={currentTitle}
                className="absolute inset-0 w-full h-full object-cover rounded-[36px] opacity-75"
              />
              <div className="tt relative z-10 text-white drop-shadow-md">
                {currentTitle.split(' ').slice(0, 2).join('\n')}
              </div>
            </div>

            <h2 className="tl truncate text-white">{currentTitle}</h2>
            <div className="ar text-[var(--kino-on-var,#a9a7a2)] text-sm">
              {currentArtist} · High Fidelity
            </div>

            {/* Kino 28-Bar Equalizer - 1 Unified Continuous Wave Driven by Web Audio API */}
            <div
              id="eqv"
              className={`eqv ${isPlaying ? '' : 'paused'}`}
              style={{ height: '40px', gap: '4px', marginTop: '12px' }}
              title="Kino Live Web Audio Equalizer"
            >
              {Array.from({ length: 28 }).map((_, i) => (
                <i
                  key={i}
                  ref={(el) => {
                    eqBarsRef.current[i] = el;
                  }}
                  style={{
                    transformOrigin: 'bottom',
                    transform: 'scaleY(0.08)',
                    willChange: 'transform',
                  }}
                />
              ))}
            </div>

            <div className="prog" style={{ marginTop: '16px' }}>
              <span>{formatTime(effectiveTime)}</span>
              <div
                ref={progressBarRef}
                onPointerDown={handleSeekPointerDown}
                className="bar cursor-pointer"
              >
                <b style={{ width: `${progressPercent}%` }} />
              </div>
              <span>{formatTime(effectiveDuration)}</span>
            </div>

            <div className="cbig">
              <button
                onClick={toggleShuffle}
                className="border-0 bg-transparent cursor-pointer p-0"
                style={{ color: isShuffle ? 'var(--kino-yellow)' : 'var(--kino-on-var)' }}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={prevTrack}
                className="border-0 bg-transparent cursor-pointer p-0 text-white hover:opacity-80"
                title="Previous track"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className={`ppb ${isPlaying ? 'on' : ''} cursor-pointer`}
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <span className="l"></span>
                <span className="r"></span>
              </button>

              <button
                onClick={nextTrack}
                className="border-0 bg-transparent cursor-pointer p-0 text-white hover:opacity-80"
                title="Next track"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>

              <button
                onClick={toggleRepeat}
                className="border-0 bg-transparent cursor-pointer p-0"
                style={{ color: repeatMode !== 'off' ? 'var(--kino-yellow)' : 'var(--kino-on-var)' }}
                title="Repeat"
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            <div className="tools">
              <button
                type="button"
                onClick={(e) => {
                  toggleFavoriteTrack({ title: currentTitle, artist: currentArtist, cover: currentCover });
                  triggerLikeBurst(e.currentTarget);
                }}
                className={`tool-pill cursor-pointer ${isFavorited(currentTitle) ? 'on !bg-rose-500/20 !border-rose-500/40 !text-rose-400' : ''}`}
                title={isFavorited(currentTitle) ? 'Liked' : 'Like song'}
              >
                <Heart className={`w-4 h-4 ${isFavorited(currentTitle) ? 'fill-current text-rose-400' : 'text-neutral-300'}`} />
                <span>{isFavorited(currentTitle) ? 'Liked' : 'Like'}</span>
              </button>

              <KinoDownloadButton
                small
                label="Download"
                onDownload={() =>
                  handleDownloadMusic({
                    title: currentTitle,
                    artist: currentArtist,
                    stream_url: currentTrack?.stream_url,
                    cover: currentCover,
                  })
                }
              />

              <button
                type="button"
                onClick={() => {
                  const target = document.querySelector('.uq.now') || document.querySelector('.uq');
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } else {
                    setActiveChip('All Tracks');
                  }
                }}
                className="tool-pill cursor-pointer"
                title="View playlist / queue"
              >
                <Disc className="w-4 h-4" />
                <span>Playlist</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const local = await scanLocalMusic();
                    if (local && local.length > 0) {
                      playTrack(local[0], local);
                    }
                  } catch (e) {
                    console.warn('Scan local music error:', e);
                  }
                }}
                className="tool-pill cursor-pointer"
                title="Scan and play local music from This PC"
              >
                <Laptop className="w-4 h-4" />
                <span>This PC</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isMuted) {
                    toggleMute();
                  } else if (volume >= 0.8) {
                    setVolume(0.3);
                  } else {
                    setVolume(0.8);
                  }
                }}
                className="tool-pill cursor-pointer"
                title="Adjust volume"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-neutral-300" />
                )}
                <span>{isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}</span>
              </button>
            </div>
          </div>

          {/* Middle Column: Lyrics Card (.box) */}
          <div
            className="box flex flex-col"
            style={{
              height: '520px',
              minHeight: '520px',
              maxHeight: '520px',
              padding: '24px 30px',
              overflow: 'hidden',
              background: 'var(--kino-surface-hi)',
              borderRadius: '24px',
              border: '1px solid var(--kino-line)',
            }}
          >
            <div className="bh flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white m-0">Lyrics</h3>
                <small className="text-xs text-[var(--kino-on-var,#a9a7a2)]">
                  Synced · scrolls with the song
                </small>
              </div>
              <div className="flex items-center gap-2">
                {syncedLines.length > 0 && (
                  <div
                    className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full border shadow-sm"
                    style={{
                      background: 'var(--kino-surface-top)',
                      borderColor: 'var(--kino-line)',
                      color: 'var(--kino-on-var)',
                    }}
                  >
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-sans mr-0.5">Offset</span>
                    <button
                      type="button"
                      onClick={() => adjustLyricOffset(-0.5)}
                      className="px-1 py-0.5 rounded hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title="Advance lyrics by 0.5s (-0.5s)"
                    >
                      -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => setLyricOffset(0)}
                      className="px-1 py-0.5 rounded font-bold hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                      style={{ color: lyricOffset !== 0 ? 'var(--kino-yellow)' : 'inherit' }}
                      title="Reset sync offset to 0.0s"
                    >
                      {lyricOffset > 0 ? `+${lyricOffset.toFixed(1)}s` : `${lyricOffset.toFixed(1)}s`}
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustLyricOffset(+0.5)}
                      className="px-1 py-0.5 rounded hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title="Delay lyrics by 0.5s (+0.5s)"
                    >
                      +0.5s
                    </button>
                  </div>
                )}
                <span
                  onClick={() => {
                    lastUserScrollTimeRef.current = 0;
                    const container = lyricsContainerRef.current;
                    const activeEl = document.getElementById(`nowplaying-lyric-${currentLyricIdx}`);
                    if (container && activeEl) {
                      const containerRect = container.getBoundingClientRect();
                      const elRect = activeEl.getBoundingClientRect();
                      const relativeTop = elRect.top - containerRect.top + container.scrollTop;
                      const targetScroll = relativeTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);
                      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
                    }
                  }}
                  className="pill2 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer hover:brightness-125 active:scale-95 transition-all select-none"
                  style={{ background: 'var(--kino-surface-top)', color: 'var(--kino-yellow)' }}
                  title="Click to center current lyrics"
                >
                  Auto-scroll
                </span>
              </div>
            </div>

            <div
              ref={lyricsContainerRef}
              id="showcase-lyrics-scroll"
              onWheel={() => {
                if (scrollAnimRef.current) {
                  cancelAnimationFrame(scrollAnimRef.current);
                  scrollAnimRef.current = null;
                }
                lastUserScrollTimeRef.current = Date.now();
              }}
              onTouchMove={() => {
                if (scrollAnimRef.current) {
                  cancelAnimationFrame(scrollAnimRef.current);
                  scrollAnimRef.current = null;
                }
                lastUserScrollTimeRef.current = Date.now();
              }}
              className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-4 space-y-3 pr-1"
            >
              {isLoadingLyrics ? (
                <div className="py-20 flex flex-col items-center justify-center text-center text-sm text-[var(--kino-on-var)] gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--kino-yellow)]" />
                  <span>Loading synced lyrics...</span>
                </div>
              ) : syncedLines.length > 0 ? (
                <>
                  {syncedLines.map((line, idx) => {
                    const isCurrent = idx === currentLyricIdx;
                    const isPast = currentLyricIdx >= 0 && idx < currentLyricIdx;

                    return (
                      <div
                        key={`${line.time}_${idx}`}
                        ref={isCurrent ? activeLyricRef : null}
                        id={`nowplaying-lyric-${idx}`}
                        onClick={() => {
                          lastUserScrollTimeRef.current = 0;
                          seek(line.time);
                        }}
                        className={`transition-all duration-200 cursor-pointer select-none leading-relaxed py-2 px-3 rounded-xl ${
                          isCurrent
                            ? 'text-white font-extrabold text-2xl scale-[1.02] origin-left drop-shadow-md'
                            : isPast
                            ? 'text-neutral-400 opacity-60 text-lg hover:opacity-90 hover:text-neutral-200'
                            : 'text-neutral-200 opacity-70 text-lg hover:opacity-95 hover:text-white'
                        }`}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </>
              ) : lyrics?.plain_lyrics ? (
                <div className="text-base text-neutral-200 whitespace-pre-line leading-relaxed py-2">
                  {lyrics.plain_lyrics}
                </div>
              ) : currentTrack && currentTrack.title !== 'Slow Harbour' ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
                  <p className="text-sm text-neutral-300 font-semibold">No synced lyrics available for "{currentTitle}"</p>
                  <p className="text-xs text-neutral-500 max-w-xs">
                    OVILO fetches verified LRCLIB timed lyrics. Lyrics will be shown automatically when available.
                  </p>
                </div>
              ) : (
                defaultLyrics.map((line, idx) => {
                  const isCurrent = idx === currentLyricIdx;
                  const isPast = idx < currentLyricIdx;
                  return (
                    <div
                      key={idx}
                      ref={isCurrent ? activeLyricRef : null}
                      id={`nowplaying-lyric-${idx}`}
                      className={`ly transition-all select-none leading-relaxed ${
                        isCurrent
                          ? 'on text-white font-extrabold text-2xl'
                          : isPast
                          ? 'pa text-neutral-400 opacity-60 text-lg'
                          : 'text-neutral-500 opacity-45 text-lg'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Up Next Queue (.box) */}
          <div
            className="box flex flex-col"
            style={{
              height: '520px',
              minHeight: '520px',
              maxHeight: '520px',
              padding: '18px 18px 10px',
              background: 'var(--kino-surface-hi)',
              borderRadius: '24px',
              border: '1px solid var(--kino-line)',
            }}
          >
            <div className="bh flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white m-0">Up next</h3>
                <small className="text-xs text-[var(--kino-on-var,#a9a7a2)]">
                  Playing from Top 10 this week
                </small>
              </div>
              <ListMusic className="w-5 h-5 text-[var(--kino-on-var,#a9a7a2)]" />
            </div>

            <div className="space-y-1 overflow-y-auto no-scrollbar flex-1">
              {tracksToDisplay.map((t, i) => {
                const isCurrent = t.title === currentTitle;
                return (
                  <div
                    key={t.id || i}
                    onClick={() => handlePlayRow(t, i)}
                    className={`uq ${isCurrent ? 'now' : ''} flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white/5 transition-colors`}
                  >
                    <div
                      className="cv w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative border border-white/5"
                    >
                      <img
                        src={t.cover}
                        alt={t.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block text-xs font-bold text-white truncate">{t.title}</b>
                      <small className="block text-[11px] text-[var(--kino-on-var,#a9a7a2)] truncate">
                        {t.artist}
                      </small>
                    </div>
                    <em className="text-xs text-[var(--kino-on-var,#a9a7a2)] not-italic">
                      {t.time}
                    </em>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeChip === 'Downloaded' ? (
        /* 2.5 DEDICATED DOWNLOADED MUSIC SECTION */
        <div className="space-y-6">
          <div
            className="p-6 rounded-2xl flex items-center justify-between border"
            style={{
              background: 'linear-gradient(135deg, rgba(122,226,186,0.18) 0%, rgba(20,20,20,0.6) 100%)',
              borderColor: 'rgba(122,226,186,0.2)',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'var(--kino-mint, #7ae2ba)', color: '#141414' }}
              >
                <Download className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Downloaded Songs</h2>
                <p className="text-xs text-[#a9a7a2] mt-0.5">
                  {diskTracks.length} tracks saved on your PC · Instant offline playback with 0ms buffering
                </p>
              </div>
            </div>

            {diskTracks.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const diskQueue: MusicTrack[] = diskTracks.map((d) => ({
                      id: d.name,
                      title: d.name.replace(/\.[^/.]+$/, ''),
                      artist: 'Offline Audio',
                      file_path: d.path,
                      stream_url: '',
                      is_local: true,
                      has_lyrics: false,
                      artwork_url: d.thumbnail_url || undefined,
                    }));
                    if (diskQueue.length > 0) {
                      playTrack(diskQueue[0], diskQueue);
                    }
                  }}
                  className="btn k cursor-pointer flex items-center gap-2"
                  style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play All</span>
                </button>
              </div>
            )}
          </div>

          {diskTracks.length > 0 ? (
            <div className="box" style={{ padding: '8px' }}>
              <div className="ql">
                {diskTracks.map((f, idx) => {
                  const isCur = currentTrack?.id === f.name && isPlaying;
                  const trackName = f.name.replace(/\.[^/.]+$/, '');
                  return (
                    <div
                      key={f.name || idx}
                      onClick={() => {
                        const diskQueue: MusicTrack[] = diskTracks.map((d) => ({
                          id: d.name,
                          title: d.name.replace(/\.[^/.]+$/, ''),
                          artist: 'Offline Audio',
                          file_path: d.path,
                          stream_url: '',
                          is_local: true,
                          has_lyrics: false,
                          artwork_url: d.thumbnail_url || undefined,
                        }));
                        playTrack({
                          id: f.name,
                          title: trackName,
                          artist: 'Offline Audio',
                          file_path: f.path,
                          stream_url: '',
                          is_local: true,
                          has_lyrics: false,
                          artwork_url: f.thumbnail_url || undefined,
                        }, diskQueue);
                      }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 44px 1fr 75px 32px 32px',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '6px 12px',
                        borderRadius: '12px',
                      }}
                      className={`cursor-pointer transition-colors hover:bg-white/5 border border-transparent hover:border-white/5 ${
                        isCur ? 'bg-white/10' : ''
                      }`}
                    >
                      <span className="text-xs font-bold text-neutral-400 text-center">{idx + 1}</span>
                      <div className="w-11 h-11 overflow-hidden rounded-lg relative flex items-center justify-center bg-white/5 border border-white/5 flex-shrink-0">
                        {f.thumbnail_url ? (
                          <img
                            src={f.thumbnail_url}
                            alt={trackName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Disc className="w-5 h-5 text-[var(--kino-mint)]" />
                        )}
                        {isCur && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-[var(--kino-mint)] animate-ping" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <b className="text-sm font-semibold text-white truncate block">
                          {trackName}
                        </b>
                        <small className="text-xs text-neutral-400 truncate block mt-0.5">
                          Offline Audio · {f.extension.toUpperCase()}
                        </small>
                      </div>
                      <span className="text-xs text-neutral-400 font-medium text-right truncate">
                        {formatBytes(f.size_bytes)}
                      </span>
                      <div className="flex items-center justify-center text-[var(--kino-mint)]" title="Saved locally on device">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await deleteDiskDownload(f.path || f.name);
                              await refreshDiskTracks();
                              setDownloadToast(`Deleted ${trackName}`);
                              setTimeout(() => setDownloadToast(null), 2500);
                            } catch (err: any) {
                              setDownloadToast(`Failed to delete: ${err?.message || err}`);
                              setTimeout(() => setDownloadToast(null), 2500);
                            }
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Delete file from disk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="box p-16 text-center text-neutral-400 text-xs">
              <Download className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
              <p className="font-semibold text-neutral-300">No downloaded tracks yet</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Click the download icon on any song to save it for offline listening.
              </p>
            </div>
          )}
        </div>
      ) : activeChip === 'Favorites' ? (
        /* 3. DEDICATED FAVORITES / LIKED SONGS VIEW */
        <div className="space-y-6">
          <div
            className="p-6 rounded-2xl flex items-center justify-between border"
            style={{
              background: 'linear-gradient(135deg, rgba(255,122,100,0.18) 0%, rgba(20,20,20,0.6) 100%)',
              borderColor: 'rgba(255,122,100,0.2)',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'var(--kino-coral)', color: '#ffffff' }}
              >
                <Heart className="w-8 h-8 fill-white text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Liked Songs</h2>
                <p className="text-xs text-[#a9a7a2] mt-0.5">
                  {favorites.length} saved songs · Stored locally &amp; synchronized with your cloud profile
                </p>
              </div>
            </div>

            {favorites.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePlayFavorite(favorites[0], favorites)}
                  className="btn k cursor-pointer flex items-center gap-2"
                  style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => {
                    const shuffled = [...favorites].sort(() => Math.random() - 0.5);
                    handlePlayFavorite(shuffled[0], shuffled);
                  }}
                  className="btn ghost cursor-pointer flex items-center gap-2"
                  style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle</span>
                </button>
              </div>
            )}
          </div>

          {favorites.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
              <Heart className="w-12 h-12 mx-auto text-neutral-600 mb-3" />
              <h3 className="text-lg font-bold text-white">No liked songs yet</h3>
              <p className="text-xs text-[#a9a7a2] mt-1 max-w-sm mx-auto">
                Click the heart icon on any song while listening or browsing to save it to your personal library.
              </p>
              <button
                onClick={() => setActiveChip('Hits')}
                className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Explore Hits
              </button>
            </div>
          ) : (
            <div className="panel" style={{ overflowY: 'auto' }}>
              {favorites.map((t, i) => {
                const isCurrent = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id || i}
                    onClick={() => handlePlayFavorite(t, favorites)}
                    className={`q cursor-pointer ${isCurrent ? 'bg-white/10' : ''}`}
                  >
                    <span className="mn">{i + 1}</span>
                    <div className="cv overflow-hidden relative">
                      <img
                        src={t.artwork_url || showcaseTracks[i % showcaseTracks.length].cover}
                        alt={t.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <b>{t.title}</b>
                      <small>{t.artist}</small>
                    </div>
                    <span className="tr" style={{ color: 'var(--kino-mint)' }}>★</span>
                    <em>
                      {Math.floor((t.duration || 210) / 60)}:{Math.floor((t.duration || 210) % 60).toString().padStart(2, '0')}
                    </em>
                    {renderRowDownloadBtn({
                      title: t.title,
                      artist: t.artist,
                      stream_url: t.stream_url,
                      cover: t.artwork_url,
                    })}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteTrack(t);
                      }}
                      className="p-1 border-0 bg-transparent cursor-pointer"
                    >
                      <Heart className="w-4 h-4 fill-[#ff7a64] text-[#ff7a64]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 4. SHEET 7: STANDARD BROWSE VIEW (Hero.p on left + Panel.q on right + Artists & Genres at bottom) */
        <>
          {/* Main 2-column grid: 330px Hero + flex Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', gap: '16px', height: '432px' }}>
            {/* Left Hero (.hero.p) */}
            <div
              className="hero p"
              style={{
                background: 'var(--kino-peri, #9fa8ff)',
              }}
            >
              <div className="disc" />
              <span className="tag" style={{ color: 'var(--kino-peri, #9fa8ff)', background: 'var(--kino-ink)' }}>
                Hit of the week
              </span>
              <div className="t" style={{ color: 'var(--kino-ink)' }}>
                {heroTrack.title}
              </div>
              <small style={{ color: 'var(--kino-ink)', opacity: 0.85, fontWeight: 600 }}>
                {heroTrack.artist} · 2.1M plays
              </small>

              <div className="btns flex items-center gap-2 mt-4">
                <div
                  onClick={handlePlayHero}
                  className="btn k rip cursor-pointer flex items-center gap-2"
                >
                  {currentTrack?.title === heroTrack.title && isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{currentTrack?.title === heroTrack.title && isPlaying ? 'Pause' : 'Play'}</span>
                </div>
                <div
                  onClick={() => setActiveChip('Now Playing')}
                  className="btn ghost rip cursor-pointer flex items-center gap-2"
                  style={{ background: 'rgba(20,20,20,0.14)', color: 'var(--kino-ink)' }}
                >
                  <Disc className="w-4 h-4" />
                  <span>Now Playing</span>
                </div>
              </div>
            </div>

            {/* Right Panel (.panel with .q song rows) */}
            <div className="panel" style={{ overflowY: 'auto' }}>
              {tracksToDisplay.map((t, i) => {
                const isCurrent = currentTrack?.title === t.title;
                const isFav = isFavorited(t.title);

                return (
                  <div
                    key={t.id || i}
                    onClick={() => handlePlayRow(t, i)}
                    className={`q cursor-pointer group ${isCurrent ? 'bg-white/5' : ''}`}
                  >
                    <span className="mn">{i + 1}</span>
                    <div className="cv overflow-hidden relative">
                      <img src={t.cover} alt={t.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <b>{t.title}</b>
                      <small>{t.artist}</small>
                    </div>
                    <span
                      className="tr font-bold"
                      style={{
                        color:
                          t.trend === 'up'
                            ? 'var(--kino-mint)'
                            : t.trend === 'down'
                            ? 'var(--kino-coral)'
                            : 'var(--kino-on-var)',
                      }}
                    >
                      {t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '–'}
                    </span>
                    <em>{t.time}</em>
                    {renderRowDownloadBtn(t)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteTrack(t);
                      }}
                      className="p-1 border-0 bg-transparent cursor-pointer"
                      title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                    >
                      <Heart
                        className="w-4 h-4"
                        style={{
                          fill: isFav ? 'var(--kino-coral)' : 'none',
                          color: isFav ? 'var(--kino-coral)' : 'var(--kino-on-var)',
                        }}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Grid: Top Artists & Moods/Genres */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Top Artists */}
            <div>
              <div className="sec mb-2 flex items-baseline gap-2" style={{ justifyContent: 'flex-start' }}>
                <b>Top artists</b>
                <small style={{ color: 'var(--kino-on-var)' }}>· This week</small>
              </div>
              <div className="row flex items-center flex-wrap" style={{ gap: '10px' }}>
                {artists.map((a, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const ev = new CustomEvent('ovilo_set_search_query', { detail: { query: a.fullName || a.name } });
                      window.dispatchEvent(ev);
                    }}
                    className="art cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    title={`Search ${a.fullName || a.name}`}
                  >
                    <div className="ac overflow-hidden" style={{ background: 'var(--kino-surface-hi)' }}>
                      <img src={a.photo} alt={a.name} className="w-full h-full object-cover" />
                    </div>
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Moods & Genres */}
            <div>
              <div className="sec mb-2">
                <b>Moods &amp; genres</b>
              </div>
              <div className="tiles" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div
                  onClick={() => setActiveChip('Hits')}
                  className="tile cursor-pointer"
                  style={{ background: 'var(--kino-coral)' }}
                >
                  <b>Pop</b>
                  <small>Hot right now</small>
                </div>
                <div
                  onClick={() => setActiveChip('Chill')}
                  className="tile cursor-pointer"
                  style={{ background: 'var(--kino-mint)' }}
                >
                  <b>Lo-fi</b>
                  <small>Chill beats</small>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {downloadToast && (
        <div className="fixed bottom-24 right-8 z-50 px-4 py-2.5 rounded-2xl bg-neutral-900 border border-white/10 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[var(--kino-mint)]" />
          <span>{downloadToast}</span>
        </div>
      )}
    </div>
  );
};
