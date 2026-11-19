import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { LyricsPlaybackClock } from '../lib/lyricsClock';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  MoreVertical,
  Loader2,
  Heart,
  Share2,
  ListMusic,
  Moon,
  Repeat,
  Repeat1,
  Shuffle,
  Mic,
  Speaker,
} from 'lucide-react';

export const LyricsOverlay: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoadingTrack,
    currentTime,
    duration,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    lyrics,
    isLoadingLyrics,
    showLyricsModal,
    setShowLyricsModal,
    getTrackArtwork,
    lyricOffset,
    setLyricOffset,
    adjustLyricOffset,
    getAudioElement,
  } = useAudio();

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';
  const isClassic = theme === 'classic' || (!isLight && !isCobalt && theme !== 'dark');

  const [activeTab, setActiveTab] = useState<'player' | 'lyrics'>('lyrics');

  useEffect(() => {
    if (showLyricsModal) {
      setActiveTab('lyrics');
    }
  }, [showLyricsModal]);
  const [isLiked, setIsLiked] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const linesContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lastUserScrollRef = useRef<number>(0);
  const scrollAnimRef = useRef<number | null>(null);
  const clockRef = useRef<LyricsPlaybackClock>(new LyricsPlaybackClock());
  const [activeLyricIdx, setActiveLyricIdx] = useState<number>(0);
  const activeLyricIdxRef = useRef<number>(0);
  activeLyricIdxRef.current = activeLyricIdx;

  // Smooth rAF ease-out cubic scrolling for Linux WebKitGTK
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
    const duration = 380;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
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

  useEffect(() => {
    clockRef.current.reset(currentTime);
  }, [currentTrack?.id]);

  // Global keyboard shortcuts: Escape to close, Space to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showLyricsModal) return;
      if (e.key === 'Escape') {
        setShowLyricsModal(false);
      } else if (e.code === 'Space' || e.key === ' ') {
        const target = e.target as HTMLElement | null;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          togglePlay();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLyricsModal, setShowLyricsModal, togglePlay]);

  // Real-time lyrics tracking with 300ms lead anticipation (ArchiveTune pattern)
  useEffect(() => {
    if (!showLyricsModal || !lyrics?.lines || lyrics.lines.length === 0) return;

    let animId: number;
    const audio = getAudioElement ? getAudioElement() : null;

    const tick = () => {
      const pos = isScrubbing
        ? scrubValue
        : audio ? audio.currentTime : currentTime;
      const effectivePos = Math.max(0, pos + lyricOffset);

      let newIdx = -1;
      const lines = lyrics?.lines || [];
      for (let i = 0; i < lines.length; i++) {
        if (effectivePos >= lines[i].time) {
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
  }, [showLyricsModal, lyrics?.lines, lyricOffset, isScrubbing, scrubValue, getAudioElement]);

  const activeIndex = activeLyricIdx;

  // Smooth scroll active line to 35% from top matching ArchiveTune targetOffset
  useEffect(() => {
    if (activeTab === 'lyrics' && linesContainerRef.current) {
      if (Date.now() - lastUserScrollRef.current < 3500) return;
      const container = linesContainerRef.current;
      if (activeIndex <= 0) {
        smoothScrollTo(container, 0);
        return;
      }
      const lineEl = document.getElementById(`overlay-lyric-${activeIndex}`);
      if (lineEl) {
        const containerRect = container.getBoundingClientRect();
        const lineRect = lineEl.getBoundingClientRect();
        const relativeTop = lineRect.top - containerRect.top + container.scrollTop;
        const targetScroll = Math.max(0, relativeTop - (container.clientHeight * 0.35));
        smoothScrollTo(container, targetScroll);
      }
    }
  }, [activeIndex, activeTab, smoothScrollTo]);

  if (!showLyricsModal || !currentTrack) return null;

  const artwork = getTrackArtwork(currentTrack);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const remainingTime = duration > 0 ? duration - (isScrubbing ? scrubValue : currentTime) : 0;
  const formatRemaining = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '-0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `-${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentSliderTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (currentSliderTime / duration) * 100 : 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col backdrop-blur-3xl animate-in fade-in duration-300 select-none overflow-hidden theme-self-managed ${
        isLight ? 'bg-[#F8F9FA]/96 text-neutral-900' : 'bg-[#0A0B0E]/96 text-white'
      }`}
    >
      {/* Ambient Dynamic Blurred Mesh Background */}
      <div
        className={`absolute inset-0 pointer-events-none filter blur-3xl scale-125 bg-cover bg-center transition-all duration-700 ${
          isLight ? 'opacity-20' : 'opacity-25'
        }`}
        style={{ backgroundImage: `url(${artwork})` }}
      />
      <div
        className={`absolute inset-0 pointer-events-none ${
          isLight
            ? 'bg-gradient-to-b from-[#F8F9FA]/80 via-[#F8F9FA]/92 to-[#F8F9FA]'
            : 'bg-gradient-to-b from-[#0A0B0E]/80 via-[#0A0B0E]/90 to-[#0A0B0E]'
        }`}
      />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <button
          onClick={() => setShowLyricsModal(false)}
          title="Minimize player"
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            isLight
              ? 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200/80 hover:shadow'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-md'
          }`}
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${
              isLight ? 'text-neutral-500' : 'text-[#ffd24d]'
            }`}
          >
            Now Playing
          </span>
          <span
            className={`text-xs font-semibold truncate max-w-xs sm:max-w-md ${
              isLight ? 'text-neutral-800' : 'text-neutral-300'
            }`}
          >
            {currentTrack.is_local ? 'Local Library' : 'Radio Stream'}
          </span>
        </div>

        <button
          title="Options"
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            isLight
              ? 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200/80 hover:shadow'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-md'
          }`}
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content: Player View OR Lyrics View */}
      {activeTab === 'player' ? (
        /* ================= FULL PLAYER VIEW ================= */
        <div className="relative z-10 flex-1 flex flex-col justify-between max-w-lg mx-auto w-full px-6 py-2 overflow-y-auto no-scrollbar">
          {/* Centered Large Album Artwork */}
          <div className="flex-1 flex items-center justify-center py-4">
            <div
              className={`relative w-72 h-72 sm:w-84 sm:h-84 rounded-3xl overflow-hidden transition-all duration-500 ${
                isLight
                  ? 'shadow-[0_20px_45px_rgba(0,0,0,0.12)] border border-neutral-200/90 bg-white'
                  : 'shadow-[0_25px_60px_rgba(0,0,0,0.55)] border border-white/10 bg-neutral-900'
              }`}
            >
              <img
                src={artwork}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
              {isLoadingTrack && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className={`w-10 h-10 animate-spin ${isLight ? 'text-white' : 'text-[#ffd24d]'}`} />
                </div>
              )}
            </div>
          </div>

          {/* Title, Artist & Action Buttons (Heart, Share) */}
          <div className="flex items-center justify-between gap-4 mt-2">
            <div className="flex flex-col min-w-0 flex-1">
              <h1
                className={`text-xl sm:text-2xl font-extrabold truncate ${
                  isLight ? 'text-neutral-900' : 'text-white'
                }`}
                title={currentTrack.title}
              >
                {currentTrack.title}
              </h1>
              <p
                className={`text-sm sm:text-base font-medium truncate mt-0.5 ${
                  isLight ? 'text-neutral-500' : 'text-neutral-400'
                }`}
                title={currentTrack.artist}
              >
                {currentTrack.artist}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${currentTrack.title} - ${currentTrack.artist}`);
                }}
                title="Share track"
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                  isLight
                    ? 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200/80 hover:shadow'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow'
                }`}
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsLiked(!isLiked)}
                title={isLiked ? 'Unlike' : 'Like'}
                className={`w-11 h-11 rounded-2xl transition-all cursor-pointer flex items-center justify-center shadow-sm ${
                  isLiked
                    ? isLight
                      ? 'bg-rose-500 text-white border border-rose-500 shadow-md'
                      : 'bg-[#ffd24d] text-[#0B0B0D] border border-[#ffd24d]'
                    : isLight
                    ? 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200/80 hover:shadow'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Audio Scrubber Slider with High-Visibility Track & Handle */}
          <div className="flex flex-col gap-2 mt-6">
            <div className="relative w-full flex items-center group py-2">
              <div
                className={`w-full h-3 rounded-full overflow-hidden relative cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-neutral-200 hover:bg-neutral-300 border border-neutral-200/80'
                    : 'bg-white/20 hover:bg-white/25 border border-white/10'
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    isLight ? 'bg-neutral-900' : 'bg-[#ffd24d]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Slider thumb pill */}
              <div
                className={`absolute w-4 h-4 rounded-full pointer-events-none shadow-lg -ml-2 transition-transform group-hover:scale-125 ${
                  isLight
                    ? 'bg-neutral-900 border-2 border-white'
                    : 'bg-[#ffd24d] border-2 border-[#0B0B0D]'
                }`}
                style={{ left: `${progressPercent}%` }}
              />

              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.1}
                value={currentSliderTime}
                onMouseDown={() => setIsScrubbing(true)}
                onTouchStart={() => setIsScrubbing(true)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setScrubValue(val);
                  if (!isScrubbing) {
                    seek(val);
                  }
                }}
                onMouseUp={() => {
                  seek(scrubValue);
                  setIsScrubbing(false);
                }}
                onTouchEnd={() => {
                  seek(scrubValue);
                  setIsScrubbing(false);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Timers & Codec Badge */}
            <div
              className={`flex items-center justify-between text-xs font-semibold px-1 font-mono ${
                isLight ? 'text-neutral-600' : 'text-neutral-300'
              }`}
            >
              <span>{formatTime(currentSliderTime)}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest ${
                  isLight
                    ? 'bg-neutral-100 text-neutral-800 border border-neutral-200/90'
                    : 'bg-white/10 text-[#ffd24d] border border-white/15'
                }`}
              >
                ıll OPUS
              </span>
              <span>{formatRemaining(remainingTime)}</span>
            </div>
          </div>

          {/* Transport Controls (Pill Previous, Large Pill Play/Pause, Pill Next) */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6">
            {/* Previous Pill */}
            <button
              onClick={prevTrack}
              title="Previous Track"
              className={`w-20 sm:w-24 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm ${
                isLight
                  ? 'bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200/90 hover:shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-md'
              }`}
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </button>

            {/* Main Play / Pause Pill with Kino .ppb morph */}
            <button
              onClick={togglePlay}
              disabled={isLoadingTrack}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className={`ppb ${isPlaying ? 'on' : ''} cursor-pointer`}
            >
              <span className="l"></span>
              <span className="r"></span>
            </button>

            {/* Next Pill */}
            <button
              onClick={nextTrack}
              title="Next Track"
              className={`w-20 sm:w-24 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm ${
                isLight
                  ? 'bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200/90 hover:shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-md'
              }`}
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center justify-center gap-3 pt-3">
            <button
              onClick={toggleMute}
              className={`transition-colors cursor-pointer ${
                isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className={`w-48 h-1.5 rounded-lg appearance-none cursor-pointer ${
                isLight ? 'bg-neutral-200 accent-neutral-900' : 'bg-white/20 accent-[#ffd24d]'
              }`}
            />
          </div>

          {/* Bottom Secondary Controls Row */}
          <div
            className={`flex items-center justify-between gap-2 mt-4 pt-2 pb-6 border-t ${
              isLight ? 'border-neutral-200/80' : 'border-white/10'
            }`}
          >
            {/* Synced Lyrics Drawer Toggle */}
            <button
              onClick={() => setActiveTab('lyrics')}
              title="Show Synced Lyrics"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border border-neutral-200/80'
                  : 'bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/10 shadow'
              }`}
            >
              <ListMusic className="w-5 h-5" />
            </button>

            {/* Sleep Timer */}
            <button
              title="Sleep timer"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border border-neutral-200/80'
                  : 'bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/10 shadow'
              }`}
            >
              <Moon className="w-5 h-5" />
            </button>

            {/* Repeat Mode */}
            <button
              onClick={toggleRepeat}
              title={`Repeat: ${repeatMode}`}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                repeatMode !== 'off'
                  ? isLight
                    ? 'bg-neutral-900 text-white border border-neutral-900 shadow-md'
                    : 'bg-[#ffd24d] text-[#0B0B0D] border border-[#ffd24d]'
                  : isLight
                  ? 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80'
                  : 'bg-white/10 hover:bg-white/20 text-neutral-300 border border-white/10'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>

            {/* Shuffle Mode */}
            <button
              onClick={toggleShuffle}
              title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isShuffle
                  ? isLight
                    ? 'bg-neutral-900 text-white border border-neutral-900 shadow-md'
                    : 'bg-[#ffd24d] text-[#0B0B0D] border border-[#ffd24d]'
                  : isLight
                  ? 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80'
                  : 'bg-white/10 hover:bg-white/20 text-neutral-300 border border-white/10'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Speaker Device Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold shadow-sm ${
                isLight
                  ? 'bg-white border border-neutral-200/80 text-neutral-900'
                  : 'bg-white/10 border border-white/15 text-[#ffd24d]'
              }`}
            >
              <Speaker className="w-4 h-4" />
              <span>Speaker</span>
            </div>
          </div>
        </div>
      ) : (
        /* ================= SYNCED LYRICS VIEW ================= */
        <div className="relative z-10 flex-1 flex flex-col justify-between max-w-2xl mx-auto w-full px-6 py-2 overflow-hidden">
          {/* Top Switch to Player */}
          <div
            className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-neutral-200/80' : 'border-white/10'
            }`}
          >
            <button
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-200/90'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
              }`}
            >
              ← Back to Player
            </button>
            <div className="flex items-center gap-3">
              {lyrics?.lines && lyrics.lines.length > 0 && (
                <div
                  className={`flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full border shadow-sm ${
                    isLight
                      ? 'bg-neutral-100 border-neutral-300 text-neutral-700'
                      : 'bg-white/10 border-white/15 text-neutral-300'
                  }`}
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
                    style={{ color: lyricOffset !== 0 ? '#ffd24d' : 'inherit' }}
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
                className={`text-xs font-semibold uppercase tracking-widest ${
                  isLight ? 'text-neutral-500' : 'text-[#ffd24d]'
                }`}
              >
                Live Synced Lyrics
              </span>
            </div>
          </div>

          {/* Lyrics Container */}
          <div className="flex-1 flex flex-col min-h-0 py-4">
            {isLoadingLyrics ? (
              <div
                className={`flex-1 flex flex-col items-center justify-center gap-3 ${
                  isLight ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                <Loader2 className={`w-8 h-8 animate-spin ${isLight ? 'text-neutral-900' : 'text-[#ffd24d]'}`} />
                <p className="text-sm font-medium">Synchronizing lyrics...</p>
              </div>
            ) : lyrics?.lines && lyrics.lines.length > 0 ? (
              <div
                ref={linesContainerRef}
                onWheel={() => {
                  if (scrollAnimRef.current) {
                    cancelAnimationFrame(scrollAnimRef.current);
                    scrollAnimRef.current = null;
                  }
                  lastUserScrollRef.current = Date.now();
                }}
                onTouchMove={() => {
                  if (scrollAnimRef.current) {
                    cancelAnimationFrame(scrollAnimRef.current);
                    scrollAnimRef.current = null;
                  }
                  lastUserScrollRef.current = Date.now();
                }}
                className="flex-1 overflow-y-auto no-scrollbar space-y-8 py-20 px-4 text-center"
              >
                {lyrics.lines.map((line, idx) => {
                  const isActive = idx === activeIndex;
                  const isPassed = idx < activeIndex;

                  return (
                    <div
                      key={`${line.time}_${idx}`}
                      id={`overlay-lyric-${idx}`}
                      ref={isActive ? activeLineRef : null}
                      onClick={() => {
                        lastUserScrollRef.current = 0;
                        seek(line.time);
                      }}
                      className={`cursor-pointer transition-all duration-300 select-none py-2 px-4 rounded-2xl inline-block max-w-2xl ${
                        isActive
                          ? isLight
                            ? 'text-neutral-900 text-2xl sm:text-4xl font-extrabold tracking-tight scale-[1.04] drop-shadow-none'
                            : 'text-[#ffd24d] text-2xl sm:text-4xl font-extrabold tracking-tight scale-[1.14] drop-shadow-[0_4px_24px_rgba(255,210,77,0.3)]'
                          : isPassed
                          ? isLight
                            ? 'text-neutral-400 text-xl sm:text-2xl font-semibold hover:opacity-80'
                            : 'text-white/40 text-xl sm:text-2xl font-semibold hover:opacity-80'
                          : isLight
                          ? 'text-neutral-600 text-xl sm:text-2xl font-semibold hover:text-neutral-900'
                          : 'text-white/70 text-xl sm:text-2xl font-semibold hover:text-white'
                      }`}
                    >
                      {line.text}
                    </div>
                  );
                })}
              </div>
            ) : lyrics?.plain_lyrics ? (
              <div className="flex-1 overflow-y-auto no-scrollbar py-12 px-6">
                <div className="max-w-xl mx-auto space-y-4 text-center">
                  <span
                    className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold ${
                      isLight
                        ? 'bg-neutral-100 border border-neutral-200 text-neutral-700'
                        : 'bg-white/10 border border-white/15 text-neutral-300'
                    }`}
                  >
                    Plain Lyrics
                  </span>
                  <p
                    className={`text-lg leading-relaxed whitespace-pre-line font-medium ${
                      isLight ? 'text-neutral-800' : 'text-neutral-200'
                    }`}
                  >
                    {lyrics.plain_lyrics}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    isLight
                      ? 'bg-white border border-neutral-200 text-neutral-900 shadow-sm'
                      : 'bg-white/10 border border-white/15 text-[#ffd24d]'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </div>
                <h4
                  className={`text-xl font-bold mb-2 ${
                    isLight ? 'text-neutral-900' : 'text-white'
                  }`}
                >
                  Enjoy The Music
                </h4>
                <p
                  className={`text-sm max-w-sm ${
                    isLight ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  Lyrics are currently not available for this track, but high-fidelity audio is playing!
                </p>
              </div>
            )}
          </div>

          {/* Bottom Controls for Lyrics */}
          <div
            className={`pt-2 pb-6 border-t flex flex-col gap-4 ${
              isLight ? 'border-neutral-200/80' : 'border-white/10'
            }`}
          >
            {/* Slider */}
            <div className="relative w-full flex items-center group py-2">
              <div
                className={`w-full h-2 rounded-full overflow-hidden relative cursor-pointer ${
                  isLight ? 'bg-neutral-200' : 'bg-white/20'
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    isLight ? 'bg-neutral-900' : 'bg-[#ffd24d]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.1}
                value={currentSliderTime}
                onMouseDown={() => setIsScrubbing(true)}
                onTouchStart={() => setIsScrubbing(true)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setScrubValue(val);
                  if (!isScrubbing) seek(val);
                }}
                onMouseUp={() => {
                  seek(scrubValue);
                  setIsScrubbing(false);
                }}
                onTouchEnd={() => {
                  seek(scrubValue);
                  setIsScrubbing(false);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <div
              className={`flex items-center justify-between text-xs font-semibold px-1 ${
                isLight ? 'text-neutral-600' : 'text-neutral-400'
              }`}
            >
              <span>{formatTime(currentSliderTime)}</span>
              <span>{formatRemaining(remainingTime)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={prevTrack}
                title="Previous Track"
                className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                  isLight
                    ? 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                    : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoadingTrack}
                title={isPlaying ? 'Pause' : 'Play'}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer theme-self-managed ${
                  isLight
                    ? 'bg-neutral-900 text-white hover:bg-black'
                    : isCobalt
                    ? 'bg-[#2F6BFE] text-white hover:bg-[#437BFE] shadow-[#2F6BFE]/30'
                    : isClassic
                    ? 'bg-white text-black hover:bg-neutral-200 shadow-white/10'
                    : 'bg-[#ffd24d] text-[#0B0B0D] hover:bg-[#cbf764] shadow-[#ffd24d]/20'
                }`}
              >
                {isLoadingTrack ? (
                  <Loader2 className={`w-6 h-6 animate-spin ${isLight || isCobalt ? 'text-white' : 'text-black'}`} />
                ) : isPlaying ? (
                  <Pause className={`w-6 h-6 ${isLight || isCobalt ? 'text-white fill-white' : 'text-black fill-black'}`} />
                ) : (
                  <Play className={`w-6 h-6 ml-0.5 ${isLight || isCobalt ? 'text-white fill-white' : 'text-black fill-black'}`} />
                )}
              </button>

              <button
                onClick={nextTrack}
                title="Next Track"
                className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                  isLight
                    ? 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                    : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
