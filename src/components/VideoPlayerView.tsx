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
} from 'lucide-react';
import { MediaItem, StreamSource } from '../types';
import { getVideoSources, addWatchHistory, getBackdropUrl } from '../services/api';
import { extractAndApplyThemeFromImage } from '../services/themeManager';
import { useAudio } from '../context/AudioContext';

interface VideoPlayerViewProps {
  item: MediaItem;
  season?: number;
  episode?: number;
  onBack: () => void;
  onEpisodeChange?: (season: number, episode: number) => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  item,
  season = 1,
  episode = 1,
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
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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
      const mediaType = isTv ? 'tv' : 'movie';
      const available = await getVideoSources(mediaType, item.id, undefined, season, episode);
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

  // Failover watchdog timer: show failover prompt after 7 seconds if buffering
  useEffect(() => {
    setShowFailoverPrompt(false);
    const timer = setTimeout(() => {
      setShowFailoverPrompt(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, [iframeKey, selectedSource?.key]);

  // Auto-dismiss failover prompt 7 seconds after it appears so it never stays permanently on screen
  useEffect(() => {
    if (showFailoverPrompt) {
      const dismissTimer = setTimeout(() => {
        setShowFailoverPrompt(false);
      }, 7000);
      return () => clearTimeout(dismissTimer);
    }
  }, [showFailoverPrompt]);

  // Switch server function with debounce cooldown to prevent iframe destruction storm
  const handleSwitchServer = (direction = 1) => {
    if (sources.length === 0) return;
    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 450) return;
    lastSwitchTimeRef.current = now;

    const currentIndex = sources.findIndex((s) => s.key === selectedSource?.key);
    const nextIndex = (currentIndex + direction + sources.length) % sources.length;
    const next = sources[nextIndex];
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
      if (e.key === 'Escape') {
        onBack();
      } else if (e.key === 's' || e.key === 'S') {
        // 'S' switches server
        handleSwitchServer(1);
      } else if (e.key === 'r' || e.key === 'R') {
        // 'R' reloads player
        setIframeKey((prev) => prev + 1);
        showToast('Reloading streaming server...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sources, selectedSource, onBack]);

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
                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[#DCFF7D] text-[#0B0B0D] flex-shrink-0 shadow-sm">
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

          {/* Quick Auto-Failover Switcher Button */}
          <button
            onClick={() => handleSwitchServer(1)}
            title="Switch to next streaming server (Hotkey: S)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#DCFF7D]/20 text-neutral-200 hover:text-white border border-white/10 hover:border-[#DCFF7D]/30 transition-all text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden sm:inline">Next Server</span>
          </button>

          {/* Custom Dark Server Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-white border border-white/10 transition-all text-xs font-semibold cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-[#DCFF7D]" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">
                {selectedSource ? selectedSource.name : 'Select Server'}
              </span>
              {selectedSource?.badge && (
                <span className="hidden xl:inline px-1.5 py-0.5 rounded text-[10px] bg-[#DCFF7D]/20 text-[#DCFF7D] font-bold border border-[#DCFF7D]/30">
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
                <div className="absolute right-0 mt-2 w-72 py-2 bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Streaming Servers ({sources.length})
                    </span>
                    <button
                      onClick={() => setAutoFailover(!autoFailover)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                        autoFailover
                          ? 'bg-[#DCFF7D]/20 text-[#DCFF7D] border border-[#DCFF7D]/30'
                          : 'bg-white/5 text-neutral-500'
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
                              ? 'bg-[#DCFF7D]/15 text-[#DCFF7D] font-semibold'
                              : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="text-[11px] font-mono text-neutral-500 w-4">
                              #{idx + 1}
                            </span>
                            <span className="truncate">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-neutral-400 border border-white/5">
                              {s.badge}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#DCFF7D]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

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
            <div className="w-12 h-12 rounded-full border-2 border-[#DCFF7D] border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-neutral-300">
              Connecting to streaming server...
            </p>
          </div>
        ) : selectedSource ? (
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
        ) : (
          <div className="text-center p-6 text-neutral-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-neutral-500" />
            <p className="font-semibold">No streaming sources available for this title.</p>
          </div>
        )}

        {/* Floating Failover Quick Bar (Auto-dismisses and has X close button) */}
        {showFailoverPrompt && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-[#181818]/95 border border-white/10 shadow-2xl backdrop-blur-md flex items-center gap-2.5 max-w-[92vw] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>Slow or unavailable?</span>
            </div>
            {getNextServerName() && (
              <button
                onClick={() => handleSwitchServer(1)}
                className="px-3 py-1 rounded-xl bg-[#DCFF7D] hover:bg-[#cbf764] text-[#0B0B0D] font-bold text-xs shadow-md shadow-[#DCFF7D]/20 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>Switch to {getNextServerName()}</span>
                <span className="text-[10px] opacity-75">(S)</span>
              </button>
            )}
            <button
              onClick={handleReload}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 text-xs transition-colors cursor-pointer"
            >
              Reload (R)
            </button>
            <button
              onClick={() => setShowFailoverPrompt(false)}
              title="Close notification"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#DCFF7D] hover:bg-[#cbf764] text-[#0B0B0D] font-bold cursor-pointer transition-all shadow-md shadow-[#DCFF7D]/20"
            >
              <span>Next Episode</span>
              <SkipForward className="w-3.5 h-3.5" />
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
