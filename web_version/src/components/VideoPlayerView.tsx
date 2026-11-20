import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Server,
  SkipForward,
  SkipBack,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  Check,
  Zap,
  AlertCircle,
  Calendar,
  X,
  WifiOff,
  ExternalLink,
  Play,
  Pause,
  Tv,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { MediaItem, StreamSource } from '../types';
import { getVideoSources, addWatchHistory, getBackdropUrl } from '../services/api';
import { fetchBdixData } from '../services/bdixApi';
import { extractAndApplyThemeFromImage } from '../services/themeManager';
import { isTauri, openExternalUrl } from '../services/platform';
import { useAudio } from '../context/AudioContext';

interface VideoPlayerViewProps {
  item: MediaItem;
  season?: number;
  episode?: number;
  directUrl?: string;
  onBack: () => void;
  onEpisodeChange?: (season: number, episode: number) => void;
}

const isDirectVideo = (url?: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.mkv') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.avi') ||
    lower.endsWith('.mov') ||
    lower.includes('/dhaka-flix') ||
    lower.includes('circleftp.net') ||
    lower.includes('/file/') ||
    lower.includes('/ftp')
  );
};

const isMkvStream = (url?: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.mkv') || lower.includes('.mkv?') || lower.includes('.mkv');
};

const getEffectiveVideoUrl = (sourceUrl: string, startSec = 0, audioTrack = 0, timestamp = 0) => {
  if (isMkvStream(sourceUrl) && isTauri()) {
    const roundedStart = Math.max(0, Math.floor(startSec));
    return `http://127.0.0.1:4545/mkv_stream?url=${encodeURIComponent(sourceUrl)}&start=${roundedStart}&audio=${audioTrack}&t=${timestamp}`;
  }
  return sourceUrl;
};

interface MkvAudioTrackInfo {
  stream_index: number;
  audio_index: number;
  language: string;
  label: string;
}

interface MkvStreamMeta {
  duration: number;
  duration_str: string;
  audio_tracks: MkvAudioTrackInfo[];
}

const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
  }
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  item,
  season = 1,
  episode = 1,
  directUrl,
  onBack,
  onEpisodeChange,
}) => {
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<StreamSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const [autoFailover, setAutoFailover] = useState(true);
  const [showFailoverPrompt, setShowFailoverPrompt] = useState(false);
  const [serverToast, setServerToast] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [isExternalLaunching, setIsExternalLaunching] = useState(false);

  // In-App MKV Player Timeline & Audio State
  const [mkvAudioTrack, setMkvAudioTrack] = useState(0);
  const [mkvSeekTime, setMkvSeekTime] = useState(0);
  const [currentPlaySec, setCurrentPlaySec] = useState(0);
  const [seekTimestamp, setSeekTimestamp] = useState<number>(Date.now());
  const [isSeekingStream, setIsSeekingStream] = useState(false);
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mkvTotalDuration, setMkvTotalDuration] = useState(
    (item as any).runtime ? (item as any).runtime * 60 : 7000
  );
  const [mkvAudioTracks, setMkvAudioTracks] = useState<MkvAudioTrackInfo[]>([]);
  const [isPlayingMkv, setIsPlayingMkv] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [hoverSeekSec, setHoverSeekSec] = useState<number | null>(null);
  const [hoverPosPercent, setHoverPosPercent] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Fullscreen & Idle auto-hide controls state
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      // Auto-hide controls after 4.5 seconds of idle mouse movement if playing
      setShowControls(false);
    }, 4500);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      resetControlsTimeout();
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isTv = item.media_type === 'tv' || (!item.title && Boolean(item.name));
  const title = item.title || item.name || 'Now Playing';

  // Check if title is an unreleased / upcoming release
  const releaseDateStr = item.release_date || (item as unknown as { first_air_date?: string }).first_air_date;
  const isUpcoming = Boolean(
    releaseDateStr && new Date(releaseDateStr).getTime() > Date.now()
  );

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSwitchTimeRef = useRef<number>(0);
  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setServerToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setServerToast(null);
    }, 3200);
  };

  const { pause, isPlaying } = useAudio();

  // Pause background music immediately when watching video
  useEffect(() => {
    if (isPlaying) {
      pause();
    }
  }, []);

  // Load streaming sources and extract dynamic theme
  useEffect(() => {
    let isMounted = true;
    const poster = item.poster_path ? getBackdropUrl(item.poster_path) : (item.backdrop_path ? getBackdropUrl(item.backdrop_path) : '');
    if (poster) {
      extractAndApplyThemeFromImage(poster);
    }
    const loadSources = async () => {
      setLoading(true);
      setShowFailoverPrompt(false);
      setVideoError(false);

      let available: StreamSource[] = [];

      // 1. Direct custom stream URL (e.g. from BDIX FTP directly)
      if (directUrl) {
        available.push({
          name: 'High-Speed BDIX (Direct Gigabit)',
          key: 'bdix_direct',
          url: directUrl,
          badge: 'Direct Stream',
        });
      }

      // 2. Load web streaming sources (VidSrc, VidLink, SuperEmbed, etc.)
      let remoteSources: StreamSource[] = [];
      if (item.id && item.id > 0) {
        const mediaType = isTv ? 'tv' : 'movie';
        remoteSources = await getVideoSources(mediaType, item.id, undefined, season, episode);
      }

      // 3. Auto-discover BDIX FTP mirrors if watching a movie title
      let bdixMirrors: StreamSource[] = [];
      if (!directUrl && item.title) {
        try {
          const bdixRes = await fetchBdixData({ q: item.title, limit: 3 });
          if (bdixRes?.packages) {
            for (const pkg of bdixRes.packages) {
              const vFile = pkg.files?.find(
                (f) =>
                  f.url &&
                  (f.extension === 'mkv' ||
                    f.extension === 'mp4' ||
                    f.url.toLowerCase().endsWith('.mkv') ||
                    f.url.toLowerCase().endsWith('.mp4'))
              );
              if (vFile && vFile.url) {
                bdixMirrors.push({
                  name: `High-Speed BDIX (${pkg.source === 'server1' ? 'Server 1' : 'Server 2'})`,
                  key: `bdix_ftp_${pkg.id}`,
                  url: vFile.url,
                  badge: 'Direct Gigabit',
                });
                break;
              }
            }
          }
        } catch (e) {
          console.warn('BDIX stream auto-discover error:', e);
        }
      }

      // If user came specifically with a direct URL (e.g. from Downloads/FTP tab), prioritize it.
      // Otherwise, prioritize web streams so in-app webview player plays smoothly without codec issues,
      // and keep high-speed BDIX mirrors easily selectable in the server menu!
      if (directUrl) {
        available = [...available, ...remoteSources, ...bdixMirrors];
      } else {
        available = [...remoteSources, ...bdixMirrors];
      }

      if (isMounted) {
        setSources(available);
        if (available.length > 0) {
          setSelectedSource(available[0]);
        }
        setLoading(false);
      }
    };

    loadSources();

    // Record into watch history
    addWatchHistory({
      id: item.id,
      title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      media_type: isTv ? 'tv' : 'movie',
      season: isTv ? season : undefined,
      episode: isTv ? episode : undefined,
      last_watched_timestamp: Date.now(),
    }).catch(console.error);

    return () => {
      isMounted = false;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [item.id, isTv, season, episode, title, item.poster_path, item.backdrop_path]);

  // Failover watchdog timer: show failover prompt after 6 seconds if buffering or error
  useEffect(() => {
    setShowFailoverPrompt(false);
    const timer = setTimeout(() => {
      setShowFailoverPrompt(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [iframeKey, selectedSource?.key]);

  // Keep failover prompt accessible for 25s so user can easily change server
  useEffect(() => {
    if (showFailoverPrompt) {
      const dismissTimer = setTimeout(() => {
        setShowFailoverPrompt(false);
      }, 25000);
      return () => clearTimeout(dismissTimer);
    }
  }, [showFailoverPrompt]);

  // Listen for iframe postMessage playback errors and auto-failover
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      try {
        const raw = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
        const lower = raw.toLowerCase();
        if (
          lower.includes('playback error') ||
          lower.includes('playback_error') ||
          lower.includes('video playback error') ||
          lower.includes('media_err') ||
          lower.includes('error_code') ||
          lower.includes('source_error')
        ) {
          setShowFailoverPrompt(true);
          showToast(`Playback issue on ${selectedSource?.name || 'server'}`);
          if (autoFailover) {
            handleSwitchServer(1);
          }
        }
      } catch {}
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [sources, selectedSource, autoFailover]);

  const handleOpenInExternalPlayer = async () => {
    if (!selectedSource?.url) return;
    setIsExternalLaunching(true);
    try {
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('play_in_external_player', {
          url: selectedSource.url,
          title: `${title} - Ovilo Stream`,
        });
        showToast('Opened in External Player (MPV/VLC)');
        return;
      }
      await openExternalUrl(selectedSource.url);
      showToast('Stream link opened');
    } catch (err) {
      console.error('Failed to launch external player:', err);
      try {
        await openExternalUrl(selectedSource.url);
        showToast('Stream link opened');
      } catch (e) {
        showToast('Error opening player');
      }
    } finally {
      setIsExternalLaunching(false);
    }
  };

  // Fetch metadata (exact duration & audio tracks) for MKV streams
  useEffect(() => {
    if (!selectedSource?.url || !isMkvStream(selectedSource.url)) return;

    let isMounted = true;
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const meta = await invoke<MkvStreamMeta>('probe_mkv_meta', { url: selectedSource.url });
        if (isMounted && meta) {
          if (meta.duration > 0) {
            setMkvTotalDuration(meta.duration);
          }
          if (meta.audio_tracks && meta.audio_tracks.length > 0) {
            setMkvAudioTracks(meta.audio_tracks);
          }
        }
      } catch (e) {
        console.warn('probe_mkv_meta error:', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedSource?.url]);

  const handleSeekTo = (targetSeconds: number) => {
    const clamped = Math.max(0, Math.min(mkvTotalDuration, Math.floor(targetSeconds)));
    // Immediate UI feedback so scrubber thumb and timestamp jump with zero delay
    setCurrentPlaySec(clamped);

    if (selectedSource?.url && !isMkvStream(selectedSource.url)) {
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
      return;
    }

    setIsSeekingStream(true);

    if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = setTimeout(() => {
      setMkvSeekTime(clamped);
      setSeekTimestamp(Date.now());
      showToast(`Jumped to ${formatTime(clamped)}`);
    }, 180);
  };

  const handleMkvJump = (offsetSeconds: number) => {
    handleSeekTo(currentPlaySec + offsetSeconds);
  };

  const handleAudioTrackChange = (newTrack: number) => {
    const resumeTime = Math.max(0, Math.floor(currentPlaySec));
    setIsSeekingStream(true);
    setMkvAudioTrack(newTrack);
    setMkvSeekTime(resumeTime);
    setCurrentPlaySec(resumeTime);
    setSeekTimestamp(Date.now());
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    const trackLabel = mkvAudioTracks.find((t) => t.audio_index === newTrack)?.label || `Track ${newTrack + 1}`;
    showToast(`Switched Audio: ${trackLabel}`);
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlayingMkv(true);
    } else {
      videoRef.current.pause();
      setIsPlayingMkv(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const elem = videoContainerRef.current;
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || mkvTotalDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const targetSeconds = Math.floor(ratio * mkvTotalDuration);
    handleSeekTo(targetSeconds);
  };

  const handleProgressBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || mkvTotalDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const targetSeconds = Math.floor(ratio * mkvTotalDuration);
    setHoverSeekSec(targetSeconds);
    setHoverPosPercent(Math.min(96, Math.max(4, ratio * 100)));
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    if (isSeekingStream) return;
    if (selectedSource?.url && isMkvStream(selectedSource.url)) {
      const current = mkvSeekTime + (videoRef.current.currentTime || 0);
      setCurrentPlaySec(current);
    } else {
      setCurrentPlaySec(videoRef.current.currentTime || 0);
    }
  };

  // Switch server function with debounce cooldown to prevent iframe destruction storm
  const handleSwitchServer = (direction = 1) => {
    if (sources.length === 0) return;
    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 450) return;
    lastSwitchTimeRef.current = now;

    const currentIndex = sources.findIndex((s) => s.key === selectedSource?.key);
    const nextIndex = (currentIndex + direction + sources.length) % sources.length;
    const next = sources[nextIndex];
    setVideoError(false);
    setMkvSeekTime(0);
    setMkvAudioTrack(0);
    setCurrentPlaySec(0);
    setSelectedSource(next);
    setIframeKey((prev) => prev + 1);
    setLoading(false);
    setShowFailoverPrompt(false);
    showToast(`Switched to ${next.name}`);
  };

  const handleSelectServer = (source: StreamSource) => {
    if (source.key === selectedSource?.key) {
      setIsServerMenuOpen(false);
      return;
    }
    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 450) return;
    lastSwitchTimeRef.current = now;

    setVideoError(false);
    setMkvSeekTime(0);
    setMkvAudioTrack(0);
    setCurrentPlaySec(0);
    setSelectedSource(source);
    setIframeKey((prev) => prev + 1);
    setIsServerMenuOpen(false);
    setLoading(false);
    setShowFailoverPrompt(false);
    showToast(`Switched to ${source.name}`);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetControlsTimeout();
      if (e.key === 'Escape') {
        onBack();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleMkvJump(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleMkvJump(-10);
      } else if (e.key === 's' || e.key === 'S') {
        handleSwitchServer(1);
      } else if (e.key === 'r' || e.key === 'R') {
        setIframeKey((prev) => prev + 1);
        showToast('Reloading streaming server...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sources, selectedSource, mkvSeekTime, currentPlaySec, mkvTotalDuration, onBack]);

  const handleNextEpisode = () => {
    if (onEpisodeChange) {
      onEpisodeChange(season, episode + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (onEpisodeChange && episode > 1) {
      onEpisodeChange(season, episode - 1);
    }
  };

  const handleReload = () => {
    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 450) return;
    lastSwitchTimeRef.current = now;
    setIframeKey((prev) => prev + 1);
    showToast('Reloading player...');
  };

  const getNextServerName = () => {
    if (sources.length <= 1) return null;
    const currentIndex = sources.findIndex((s) => s.key === selectedSource?.key);
    const nextIndex = (currentIndex + 1) % sources.length;
    return sources[nextIndex].name;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] keep-dark flex flex-col select-none overflow-hidden">
      {/* Ambient glowing backdrop behind player */}
      <div className="absolute inset-0 pointer-events-none opacity-20 filter blur-3xl scale-110">
        <img
          src={getBackdropUrl(item.backdrop_path, 'w1280')}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Top Navigation & Status Bar */}
      <header className="relative z-10 flex items-center justify-between px-3 sm:px-6 h-16 border-b border-[#242424] bg-[#151515]/95 backdrop-blur-md">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline text-xs font-semibold">Back</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[180px] sm:max-w-md">
                {title}
              </h3>
              {isTv && (
                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[#ffd24d] text-black flex-shrink-0 shadow-sm">
                  S{season} : E{episode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right: Server Switcher Dropdown, Next Server Quick Pill, Reload */}
        <div className="flex items-center gap-2">
          {/* Offline indicator if disconnected */}
          {!isOnline && (
            <div
              title="Internet disconnected: Streaming servers are offline"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline • Local Media Only</span>
            </div>
          )}

          {/* Ad-block Shield Indicator */}
          <div
            title="OVILO Ad Shield & Safe Sandbox Active: Pop-ups, spam tabs, and rogue redirects are blocked"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium cursor-help"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ad Shield Active</span>
          </div>

          {/* External Player Button (MPV / VLC) */}
          {selectedSource && (
            <button
              onClick={handleOpenInExternalPlayer}
              disabled={isExternalLaunching}
              title="Watch in external player (VLC / MPV) for 5.1 surround sound & MKV container support"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#ffd24d]" />
              <span className="hidden md:inline">Watch in</span>
              <span>MPV / VLC</span>
            </button>
          )}

          {/* Quick Auto-Failover Switcher Button */}
          <button
            onClick={() => handleSwitchServer(1)}
            title="Switch to next streaming server (Hotkey: S)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ffd24d] hover:bg-[#ffe066] text-black font-extrabold text-xs shadow-md shadow-[#ffd24d]/20 transition-all cursor-pointer active:scale-95 border-0"
          >
            <Zap className="w-3.5 h-3.5 fill-black text-black" />
            <span className="font-extrabold text-black">Next Server</span>
            {getNextServerName() && (
              <span className="hidden md:inline font-bold text-[11px] text-black/75">
                ({getNextServerName()})
              </span>
            )}
          </button>

          {/* Custom Dark Server Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-white border border-white/10 transition-all text-xs font-semibold cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-[#ffd24d]" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate text-white">
                {selectedSource ? selectedSource.name : 'Select Server'}
              </span>
              {selectedSource?.badge && (
                <span className="hidden xl:inline px-1.5 py-0.5 rounded text-[10px] bg-white/15 text-neutral-200 font-bold border border-white/20">
                  {selectedSource.badge}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isServerMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isServerMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsServerMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 py-2 bg-[#1c1c1c] border border-white/15 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Streaming Servers ({sources.length})
                    </span>
                    <button
                      onClick={() => setAutoFailover(!autoFailover)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        autoFailover
                          ? 'bg-[#ffd24d] text-black border border-[#ffd24d]'
                          : 'bg-white/10 text-neutral-400 border border-white/10'
                      }`}
                    >
                      Auto-Failover: {autoFailover ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {sources.map((s, idx) => {
                      const isSelected = selectedSource?.key === s.key;
                      return (
                        <button
                          key={s.key}
                          onClick={() => handleSelectServer(s)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#ffd24d] text-black font-extrabold'
                              : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className={`text-[11px] font-mono w-4 ${isSelected ? 'text-black/80 font-bold' : 'text-neutral-500'}`}>
                              #{idx + 1}
                            </span>
                            <span className="truncate">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isSelected
                                ? 'bg-black/20 text-black'
                                : 'bg-white/10 text-neutral-300 border border-white/5'
                            }`}>
                              {s.badge}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* External Player Launcher (VLC / System) */}
          {selectedSource?.url && (
            <button
              onClick={async () => {
                try {
                  const { openUrl } = await import('@tauri-apps/plugin-opener');
                  await openUrl(selectedSource.url);
                } catch {
                  window.open(selectedSource.url, '_blank');
                }
              }}
              title="Open stream in VLC, MPV or external player"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#ffd24d]" />
              <span className="hidden xl:inline text-xs">Open in VLC</span>
            </button>
          )}

          {/* Reload stream button */}
          <button
            onClick={handleReload}
            title="Reload Player Stream (Hotkey: R)"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Server Switch Toast Notification */}
      {serverToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-[#222222]/90 border border-white/10 text-white text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <Zap className="w-3.5 h-3.5 text-[#DCFF7D]" />
          <span>{serverToast}</span>
        </div>
      )}

      {/* Upcoming / Unreleased Movie Notice Banner */}
      {isUpcoming && (
        <div className="relative z-20 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>
              <strong>Upcoming Release ({releaseDateStr}):</strong> This title is not yet available in theaters or digital distribution. Streaming servers will activate once officially released.
            </span>
          </div>
          <button
            onClick={() => handleSwitchServer(1)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[11px] transition-colors cursor-pointer flex-shrink-0 ml-3"
          >
            Check Feeds
          </button>
        </div>
      )}

      {/* Main Video Player Canvas */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        {!isOnline ? (
          <div className="flex flex-col items-center gap-3.5 text-center p-8 max-w-md animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <WifiOff className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">No Internet Connection</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Online streaming servers require an active internet connection. Connect to Wi-Fi/Ethernet to resume streaming, or enjoy your local media in Downloads and Music.
            </p>
            <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Offline • Local Media Only</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-[#ffd24d] border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-neutral-300">
              Connecting to streaming server...
            </p>
          </div>
        ) : selectedSource ? (
          isDirectVideo(selectedSource.url) ? (
            videoError ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0d0d0f] select-none">
                {/* Ambient glow backdrop */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-[#111115] to-black/70 pointer-events-none" />

                <div className="relative z-10 max-w-lg p-8 rounded-3xl bg-[#17171c]/95 border border-white/15 shadow-2xl backdrop-blur-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-2xl bg-[#ffd24d]/10 border border-[#ffd24d]/30 flex items-center justify-center mb-5 text-[#ffd24d] shadow-lg shadow-[#ffd24d]/10">
                    <Tv className="w-8 h-8" />
                  </div>

                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#ffd24d]/20 text-[#ffd24d] border border-[#ffd24d]/30 mb-3">
                    MKV Codec Fallback
                  </span>

                  <h3 className="text-xl font-bold text-white mb-2 max-w-sm line-clamp-2">
                    {title}
                  </h3>

                  <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                    In-app MKV engine encountered an error on this stream. You can watch in an external player like VLC/MPV or switch to a web streaming server.
                  </p>

                  <div className="w-full flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={handleOpenInExternalPlayer}
                      disabled={isExternalLaunching}
                      className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-[#ffd24d] hover:bg-[#ffe066] active:scale-95 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#ffd24d]/20 transition-all cursor-pointer border-0"
                    >
                      <Play className="w-4 h-4 fill-black text-black" />
                      <span>{isExternalLaunching ? 'Opening Player...' : 'Watch in MPV / VLC'}</span>
                    </button>

                    {sources.length > 1 && (
                      <button
                        onClick={() => handleSwitchServer(1)}
                        className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#ffd24d]" />
                        <span>Web Stream</span>
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-[11px] text-neutral-400">
                    <span>Direct Gigabit Stream</span>
                    <span>•</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSource.url);
                        showToast('Stream link copied to clipboard!');
                      }}
                      className="hover:text-white underline cursor-pointer bg-transparent border-0 p-0 text-[11px] text-neutral-400"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                ref={videoContainerRef}
                onMouseMove={resetControlsTimeout}
                onClick={resetControlsTimeout}
                className={`relative w-full h-full flex flex-col items-center justify-center bg-black group transition-all duration-300 ${
                  !showControls && isPlayingMkv ? 'cursor-none' : ''
                }`}
              >
                <video
                  ref={videoRef}
                  key={selectedSource.key || selectedSource.url}
                  src={getEffectiveVideoUrl(selectedSource.url, mkvSeekTime, mkvAudioTrack, seekTimestamp)}
                  controls={!isMkvStream(selectedSource.url)}
                  autoPlay
                  playsInline
                  className="w-full h-full max-h-full object-contain bg-black cursor-pointer"
                  onClick={togglePlayPause}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlayingMkv(true)}
                  onPause={() => setIsPlayingMkv(false)}
                  onWaiting={() => {
                    if (isMkvStream(selectedSource.url)) {
                      setIsSeekingStream(true);
                    }
                  }}
                  onCanPlay={() => {
                    setIsSeekingStream(false);
                    setLoading(false);
                    setShowFailoverPrompt(false);
                    setVideoError(false);
                    if (videoRef.current && isPlayingMkv) {
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  onPlaying={() => {
                    setIsSeekingStream(false);
                    setIsPlayingMkv(true);
                  }}
                  onLoadedData={() => {
                    setIsSeekingStream(false);
                    setLoading(false);
                    setShowFailoverPrompt(false);
                    setVideoError(false);
                  }}
                  onError={(e) => {
                    console.warn('Video playback error:', e);
                    setIsSeekingStream(false);
                    setLoading(false);
                    setVideoError(true);
                  }}
                />

                {/* Seeking / Buffering overlay */}
                {isSeekingStream && isMkvStream(selectedSource.url) && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] pointer-events-none animate-in fade-in duration-150">
                    <div className="w-12 h-12 rounded-full border-3 border-[#ffd24d] border-t-transparent animate-spin mb-3 shadow-lg" />
                    <span className="text-xs font-bold text-white bg-black/80 px-3.5 py-1.5 rounded-full border border-white/10 shadow-xl">
                      Fast forwarding to {formatTime(currentPlaySec)}...
                    </span>
                  </div>
                )}

                {/* Top Badge: In-App MKV Player */}
                {isMkvStream(selectedSource.url) && (
                  <div
                    className={`absolute top-4 left-4 z-30 flex items-center gap-2 transition-all duration-300 ${
                      showControls || !isPlayingMkv
                        ? 'opacity-100 pointer-events-auto translate-y-0'
                        : 'opacity-0 pointer-events-none -translate-y-3'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/80 border border-[#ffd24d]/40 text-[#ffd24d] text-xs font-bold shadow-lg backdrop-blur-md">
                      <Tv className="w-3.5 h-3.5" />
                      <span>MKV In-App Player</span>
                    </div>
                  </div>
                )}

                {/* Bottom Full Interactive Timeline Scrubber & Player Controls */}
                {isMkvStream(selectedSource.url) && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col gap-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 pb-3 px-4 select-none transition-all duration-300 ${
                      showControls || !isPlayingMkv
                        ? 'opacity-100 pointer-events-auto translate-y-0'
                        : 'opacity-0 pointer-events-none translate-y-3'
                    }`}
                  >
                    {/* 1. Scrubber / Progress Bar */}
                    <div
                      ref={progressBarRef}
                      onClick={handleProgressBarClick}
                      onMouseMove={handleProgressBarHover}
                      onMouseLeave={() => setHoverSeekSec(null)}
                      className="relative w-full h-3 flex items-center cursor-pointer group/bar"
                    >
                      {/* Background Track */}
                      <div className="w-full h-1.5 rounded-full bg-white/20 group-hover/bar:h-2.5 transition-all overflow-hidden relative">
                        {/* Buffered progress indicator */}
                        <div
                          className="absolute top-0 left-0 h-full bg-white/30"
                          style={{ width: `${Math.min(100, ((currentPlaySec + 60) / mkvTotalDuration) * 100)}%` }}
                        />
                        {/* Played progress */}
                        <div
                          className="absolute top-0 left-0 h-full bg-[#ffd24d]"
                          style={{ width: `${Math.min(100, (currentPlaySec / mkvTotalDuration) * 100)}%` }}
                        />
                      </div>

                      {/* Scrubber Thumb Knob */}
                      <div
                        className="absolute w-4 h-4 rounded-full bg-[#ffd24d] shadow-lg shadow-[#ffd24d]/50 -translate-x-1/2 scale-0 group-hover/bar:scale-100 transition-transform pointer-events-none"
                        style={{ left: `${Math.min(100, (currentPlaySec / mkvTotalDuration) * 100)}%` }}
                      />

                      {/* Hover Time Tooltip */}
                      {hoverSeekSec !== null && (
                        <div
                          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/20 text-white text-[11px] font-mono font-bold pointer-events-none"
                          style={{ left: `${hoverPosPercent}%` }}
                        >
                          {formatTime(hoverSeekSec)}
                        </div>
                      )}
                    </div>

                    {/* 2. Controls & Fast-Forward / Rewind Buttons */}
                    <div className="flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Play/Pause */}
                        <button
                          onClick={togglePlayPause}
                          className="p-1.5 rounded-xl hover:bg-white/15 text-white transition-colors cursor-pointer border-0 bg-transparent"
                          title={isPlayingMkv ? "Pause (Space)" : "Play (Space)"}
                        >
                          {isPlayingMkv ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                        </button>

                        {/* Rewind / Fast-forward buttons */}
                        <button
                          onClick={() => handleMkvJump(-10)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white font-bold text-xs transition-colors cursor-pointer border-0"
                          title="Rewind 10s (Left Arrow)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>-10s</span>
                        </button>

                        <button
                          onClick={() => handleMkvJump(10)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white font-bold text-xs transition-colors cursor-pointer border-0"
                          title="Forward 10s (Right Arrow)"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>+10s</span>
                        </button>

                        <button
                          onClick={() => handleMkvJump(60)}
                          className="hidden sm:inline-block px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white font-bold text-xs transition-colors cursor-pointer border-0"
                          title="Forward 1 minute"
                        >
                          +1m
                        </button>

                        <button
                          onClick={() => handleMkvJump(300)}
                          className="hidden md:inline-block px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white font-bold text-xs transition-colors cursor-pointer border-0"
                          title="Forward 5 minutes"
                        >
                          +5m
                        </button>

                        {/* Time display: 14:25 / 1:56:50 */}
                        <div className="flex items-center gap-1 font-mono font-semibold text-xs text-neutral-300 ml-1 sm:ml-2">
                          <span className="text-white font-bold">{formatTime(currentPlaySec)}</span>
                          <span className="text-neutral-500">/</span>
                          <span>{formatTime(mkvTotalDuration)}</span>
                        </div>
                      </div>

                      {/* Right side: Audio Tracks, Volume, Fullscreen */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Audio Language Tracks */}
                        <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2 py-0.5 border border-white/15">
                          <span className="hidden sm:inline text-[10px] text-neutral-400 font-bold uppercase mr-1">Audio:</span>
                          {mkvAudioTracks.length > 0 ? (
                            mkvAudioTracks.map((t) => (
                              <button
                                key={t.audio_index}
                                onClick={() => handleAudioTrackChange(t.audio_index)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                                  mkvAudioTrack === t.audio_index
                                    ? 'bg-[#ffd24d] text-black shadow-sm'
                                    : 'text-neutral-300 hover:text-white hover:bg-white/10'
                                }`}
                                title={`Switch audio to ${t.label}`}
                              >
                                {t.label}
                              </button>
                            ))
                          ) : (
                            [0, 1].map((track) => (
                              <button
                                key={track}
                                onClick={() => handleAudioTrackChange(track)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                                  mkvAudioTrack === track
                                    ? 'bg-[#ffd24d] text-black shadow-sm'
                                    : 'text-neutral-300 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                Track {track + 1}
                              </button>
                            ))
                          )}
                        </div>

                        {/* Volume */}
                        <div className="hidden sm:flex items-center gap-1.5">
                          <button onClick={toggleMute} className="p-1 hover:text-[#ffd24d] transition-colors cursor-pointer border-0 bg-transparent text-white">
                            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-16 h-1 accent-[#ffd24d] cursor-pointer"
                          />
                        </div>

                        {/* Fullscreen */}
                        <button
                          onClick={toggleFullscreen}
                          className="p-1.5 rounded-xl hover:bg-white/15 text-white transition-colors cursor-pointer border-0 bg-transparent"
                          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <iframe
              key={iframeKey + '-' + selectedSource.url}
              src={selectedSource.url}
              title={title}
              onLoad={() => {
                setLoading(false);
                setShowFailoverPrompt(false);
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              className="w-full h-full border-0 select-none bg-black"
            />
          )
        ) : (
          <div className="text-center p-6 text-neutral-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-neutral-500" />
            <p className="font-semibold">No streaming sources available for this title.</p>
          </div>
        )}

        {/* Floating Canvas Quick Server Switch Button (Always accessible) */}
        <div className="absolute top-4 right-4 z-30 hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleSwitchServer(1)}
            title="Switch server if video has playback error or is buffering (Hotkey: S)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-[#ffd24d] text-neutral-200 hover:text-black border border-white/20 hover:border-[#ffd24d] transition-all text-xs font-bold shadow-2xl backdrop-blur-md cursor-pointer group"
          >
            <Zap className="w-3.5 h-3.5 text-[#ffd24d] group-hover:text-black fill-current" />
            <span>Switch Server</span>
            {getNextServerName() && (
              <span className="opacity-75 text-[11px] font-normal">
                ({getNextServerName()})
              </span>
            )}
          </button>
        </div>

        {/* Floating Failover Quick Bar (High-Contrast, Clear Actions) */}
        {showFailoverPrompt && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-2xl bg-[#141416]/95 border border-white/20 shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-[95vw] animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-1.5 text-xs text-neutral-200 shrink-0">
              <AlertCircle className="w-4 h-4 text-[#ffd24d] shrink-0" />
              <span className="font-semibold">Playback error or buffering?</span>
            </div>
            {getNextServerName() && (
              <button
                onClick={() => handleSwitchServer(1)}
                className="px-3.5 py-1.5 rounded-xl bg-[#ffd24d] hover:bg-[#ffe066] text-black font-extrabold text-xs shadow-md shadow-[#ffd24d]/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 border-0 shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-black text-black" />
                <span>Switch to {getNextServerName()}</span>
                <span className="text-[10px] opacity-75 font-mono">(S)</span>
              </button>
            )}
            <button
              onClick={() => setIsServerMenuOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 border border-white/10"
            >
              All Servers ({sources.length})
            </button>
            <button
              onClick={handleReload}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 border border-white/10"
            >
              Reload (R)
            </button>
            <button
              onClick={() => setShowFailoverPrompt(false)}
              title="Dismiss notice"
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom TV Series Quick Controller Bar */}
      {isTv && (
        <footer className="relative z-10 flex items-center justify-between px-4 sm:px-8 h-14 bg-[#151515] border-t border-[#242424]">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevEpisode}
              disabled={episode <= 1}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                episode <= 1
                  ? 'opacity-40 cursor-not-allowed bg-white/5 text-neutral-500'
                  : 'bg-white/10 hover:bg-white/15 text-white cursor-pointer'
              }`}
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span>Previous Ep</span>
            </button>

            <span className="text-xs font-bold text-neutral-300 px-2">
              Season {season} • Episode {episode}
            </span>

            <button
              onClick={handleNextEpisode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ffd24d] hover:bg-[#ffe066] text-black font-extrabold cursor-pointer transition-all shadow-md shadow-[#ffd24d]/20"
            >
              <span>Next Episode</span>
              <SkipForward className="w-3.5 h-3.5 fill-black" />
            </button>
          </div>

          <div className="text-[11px] text-neutral-400 hidden sm:flex items-center gap-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-mono text-[10px]">S</kbd> to switch server</span>
            <span>•</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-mono text-[10px]">R</kbd> to reload</span>
            <span>•</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-mono text-[10px]">Esc</kbd> to exit</span>
          </div>
        </footer>
      )}
    </div>
  );
};
