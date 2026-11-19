import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useAudio, MUSIC_FALLBACK_SVG } from '../context/AudioContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  X,
  GripHorizontal,
  Music2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Volume2,
  VolumeX,
  Columns,
  Rows,
  Loader2,
} from 'lucide-react';

interface MusicFloatingNotchProps {
  onOpenMusicSection?: () => void;
}

const VERT_WIDTH = 52;

export const MusicFloatingNotch: React.FC<MusicFloatingNotchProps> = ({ onOpenMusicSection }) => {
  const {
    currentTrack,
    isPlaying,
    hasStartedPlayback,
    isLoadingTrack,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    toggleMute,
    getTrackArtwork,
  } = useAudio();

  // If no track exists OR user has not played music yet, do not display notch
  if (!currentTrack || !hasStartedPlayback) return null;

  // Notch sizing: 'standard' | 'mini' | 'expanded' (Starts minimized to smallest on app open)
  const [notchSize, setNotchSize] = useState<'standard' | 'mini' | 'expanded'>('mini');
  // Orientation: 'horizontal' (top/bottom/floating) | 'vertical' (snapped to left or right border)
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [dockedSide, setDockedSide] = useState<'top' | 'bottom' | 'left' | 'right' | null>('top');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n' || e.key === 'N') {
        setIsDismissed(false);
        setNotchSize((prev) => (prev === 'mini' ? 'standard' : prev === 'standard' ? 'expanded' : 'mini'));
      }
    };
    const handleControl = (e: CustomEvent) => {
      setIsDismissed(false);
      const cmd = e.detail;
      const vw = window.innerWidth;
      if (cmd === 'mini') {
        setOrientation('horizontal');
        setDockedSide('top');
        setNotchSize('mini');
        animate(x, (vw - 160) / 2, { type: 'spring', damping: 25, stiffness: 350 });
        animate(y, 0, { type: 'spring', damping: 25, stiffness: 350 });
      } else if (cmd === 'standard') {
        setOrientation('horizontal');
        setDockedSide('top');
        setNotchSize('standard');
        animate(x, (vw - 270) / 2, { type: 'spring', damping: 25, stiffness: 350 });
        animate(y, 0, { type: 'spring', damping: 25, stiffness: 350 });
      } else if (cmd === 'expanded') {
        setOrientation('horizontal');
        setDockedSide('top');
        setNotchSize('expanded');
        animate(x, (vw - 290) / 2, { type: 'spring', damping: 25, stiffness: 350 });
        animate(y, 0, { type: 'spring', damping: 25, stiffness: 350 });
      } else if (cmd === 'vertical' || cmd === 'vertical_standard' || cmd === 'vertical_right') {
        setOrientation('vertical');
        setDockedSide('right');
        setNotchSize('standard');
        setVerticalHeight(210);
        animate(y, 80, { type: 'spring', damping: 28, stiffness: 360 });
      } else if (cmd === 'vertical_mini') {
        setOrientation('vertical');
        setDockedSide('right');
        setNotchSize('mini');
        animate(y, 80, { type: 'spring', damping: 28, stiffness: 360 });
      } else if (cmd === 'vertical_left') {
        setOrientation('vertical');
        setDockedSide('left');
        setNotchSize('standard');
        setVerticalHeight(210);
        animate(y, 80, { type: 'spring', damping: 28, stiffness: 360 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ovilo_notch_control', handleControl as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ovilo_notch_control', handleControl as EventListener);
    };
  }, []);

  // Interactive drag-to-resize state for vertical mode
  const [verticalHeight, setVerticalHeight] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  const startResizeY = useRef(0);
  const startHeight = useRef(210);

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    startResizeY.current = e.clientY;
    startHeight.current = notchRef.current ? notchRef.current.offsetHeight : 210;

    const onPointerMove = (ev: PointerEvent) => {
      if (!isResizingRef.current) return;
      const delta = ev.clientY - startResizeY.current;
      const newH = Math.max(100, Math.min(340, startHeight.current + delta));
      if (newH < 140) {
        setNotchSize('mini');
      } else {
        setNotchSize('standard');
      }
      setVerticalHeight(newH);
    };

    const onPointerUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const notchRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Position motion values (initial position at top center)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const artwork = getTrackArtwork(currentTrack);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  // Handle Scrubbing (Horizontal)
  const handleSeekClickHorizontal = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio * duration);
  };

  // Handle Scrubbing (Vertical)
  const handleSeekClickVertical = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, clickY / rect.height));
    seek(ratio * duration);
  };

  // Set initial position flush at top center on mount (stuck to top border in mini mode)
  useEffect(() => {
    const vw = window.innerWidth;
    const initialWidth = 160;
    const initialX = Math.max(0, (vw - initialWidth) / 2);
    x.set(initialX);
    y.set(0);
    setDockedSide('top');
  }, []);

  // Docking positions effect (runs when dockedSide or orientation changes)
  useEffect(() => {
    const vw = window.innerWidth;
    if (dockedSide === 'top' && orientation === 'horizontal') {
      const targetW = notchSize === 'expanded' ? 290 : notchSize === 'mini' ? 160 : 270;
      animate(x, Math.max(0, (vw - targetW) / 2), { type: 'spring', damping: 28, stiffness: 360 });
      animate(y, 0, { type: 'spring', damping: 28, stiffness: 360 });
    }
  }, [dockedSide, orientation, notchSize]);

  // Window resize listener to keep notch attached to border
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      if (dockedSide === 'right' && orientation === 'vertical') {
        x.set(Math.max(0, vw - VERT_WIDTH));
      } else if (dockedSide === 'top' && orientation === 'horizontal') {
        const targetW = notchSize === 'expanded' ? 290 : notchSize === 'mini' ? 160 : 270;
        x.set(Math.max(0, (vw - targetW) / 2));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dockedSide, orientation, notchSize]);

  // Magnetic edge-snapping and boundary confinement
  const handleDragEnd = () => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 200);

    if (!notchRef.current) return;
    const rect = notchRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const currentX = x.get();
    const currentY = y.get();

    const SNAP_ZONE = 80;

    const distTop = rect.top;
    const distBottom = vh - rect.bottom;
    const distLeft = rect.left;
    const distRight = vw - rect.right;

    let targetX = currentX;
    let targetY = currentY;
    let newOrientation: 'horizontal' | 'vertical' = orientation;
    let newDocked: 'top' | 'bottom' | 'left' | 'right' | null = null;

    if (distRight < SNAP_ZONE) {
      targetX = vw - VERT_WIDTH;
      targetY = Math.max(0, Math.min(vh - (notchSize === 'mini' ? 110 : (verticalHeight || 210)), currentY));
      newOrientation = 'vertical';
      newDocked = 'right';
    } else if (distLeft < SNAP_ZONE) {
      targetX = 0;
      targetY = Math.max(0, Math.min(vh - (notchSize === 'mini' ? 110 : (verticalHeight || 210)), currentY));
      newOrientation = 'vertical';
      newDocked = 'left';
    } else if (distTop < SNAP_ZONE) {
      targetY = 0;
      newOrientation = 'horizontal';
      newDocked = 'top';
      const notchCenterX = rect.left + rect.width / 2;
      const horizWidth = notchSize === 'expanded' ? 290 : notchSize === 'mini' ? 160 : 270;
      if (Math.abs(notchCenterX - vw / 2) < 200) {
        targetX = Math.max(0, (vw - horizWidth) / 2);
      } else {
        targetX = Math.max(0, Math.min(vw - horizWidth, currentX));
      }
    } else if (distBottom < SNAP_ZONE) {
      const horizHeight = notchSize === 'expanded' ? 135 : notchSize === 'mini' ? 28 : 46;
      targetY = vh - horizHeight;
      newOrientation = 'horizontal';
      newDocked = 'bottom';
      const notchCenterX = rect.left + rect.width / 2;
      const horizWidth = notchSize === 'expanded' ? 290 : notchSize === 'mini' ? 160 : 270;
      if (Math.abs(notchCenterX - vw / 2) < 200) {
        targetX = Math.max(0, (vw - horizWidth) / 2);
      } else {
        targetX = Math.max(0, Math.min(vw - horizWidth, currentX));
      }
    } else {
      const expectedW = orientation === 'vertical' ? VERT_WIDTH : notchSize === 'expanded' ? 290 : notchSize === 'mini' ? 160 : 270;
      const expectedH = orientation === 'vertical' ? (notchSize === 'mini' ? 110 : (verticalHeight || 210)) : notchSize === 'expanded' ? 135 : notchSize === 'mini' ? 28 : 46;
      targetX = Math.max(0, Math.min(vw - expectedW, currentX));
      targetY = Math.max(0, Math.min(vh - expectedH, currentY));
      newOrientation = orientation;
      newDocked = null;
    }

    setOrientation(newOrientation);
    setDockedSide(newDocked);

    animate(x, targetX, { type: 'spring', damping: 28, stiffness: 360 });
    animate(y, targetY, { type: 'spring', damping: 28, stiffness: 360 });
  };

  // If user dismissed it, show a sleek docked reactivation pill at top center
  if (isDismissed) {
    return (
      <motion.button
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissed(false);
        }}
        title="Show Music Notch"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-[#0B0B0D]/95 hover:bg-[#18191E] text-white border border-white/15 shadow-2xl backdrop-blur-xl flex items-center gap-2 text-xs font-semibold cursor-pointer group select-none transition-all theme-self-managed"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#DCFF7D] animate-pulse" />
        <Music2 className="w-3.5 h-3.5 text-[#DCFF7D]" />
        <span className="truncate max-w-[110px] text-white font-medium">{currentTrack.title}</span>
        <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-white" />
      </motion.button>
    );
  }

  // Calculate dynamic drag constraints based on window dimensions
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const currentW = orientation === 'vertical' ? VERT_WIDTH : notchSize === 'expanded' ? 290 : notchSize === 'mini' ? 160 : 270;
  const currentH = orientation === 'vertical' ? (notchSize === 'mini' ? 110 : (verticalHeight || 210)) : notchSize === 'expanded' ? 135 : notchSize === 'mini' ? 28 : 46;

  const dragLimits = {
    left: 0,
    top: 0,
    right: Math.max(0, vw - currentW),
    bottom: Math.max(0, vh - currentH),
  };

  const isRightDocked = dockedSide === 'right' && orientation === 'vertical' && !isDraggingRef.current;
  const isLeftDocked = dockedSide === 'left' && orientation === 'vertical' && !isDraggingRef.current;
  const isTopDocked = dockedSide === 'top' && orientation === 'horizontal' && !isDraggingRef.current;

  return (
    <motion.div
      ref={notchRef}
      drag
      dragConstraints={dragLimits}
      dragElastic={0}
      dragMomentum={false}
      onDragStart={() => {
        if (notchRef.current) {
          const rect = notchRef.current.getBoundingClientRect();
          x.set(rect.left);
          y.set(rect.top);
        }
        isDraggingRef.current = true;
      }}
      onDragEnd={handleDragEnd}
      style={
        isRightDocked
          ? { y }
          : isLeftDocked
          ? { y }
          : isTopDocked
          ? { x }
          : { x, y }
      }
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className={`fixed z-50 select-none cursor-grab active:cursor-grabbing theme-self-managed ${
        isRightDocked
          ? 'top-0 right-0'
          : isLeftDocked
          ? 'top-0 left-0'
          : 'top-0 left-0'
      }`}
    >
      {/* ========================================================================= */}
      {/* ORIENTATION 1: VERTICAL NOTCH (When placed on Left or Right border)      */}
      {/* ========================================================================= */}
      {orientation === 'vertical' ? (
        notchSize === 'mini' ? (
          /* 1A. ULTRA-COMPACT MINI VERTICAL NOTCH (SLIM EDGE TAB) */
          <div
            onClick={() => {
              if (!isDraggingRef.current) {
                setNotchSize('standard');
                setVerticalHeight(210);
              }
            }}
            className={`flex flex-col items-center justify-between p-2 w-[46px] h-[96px] bg-[#0B0B0D]/95 text-white border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300 cursor-pointer group ${
              dockedSide === 'left'
                ? 'rounded-r-2xl rounded-l-none border-l-0'
                : dockedSide === 'right'
                ? 'rounded-l-2xl rounded-r-none border-r-0'
                : 'rounded-2xl'
            }`}
            title="Click to expand music player"
          >
            {/* Top: Pulsing dot + Music Icon */}
            <div className="flex flex-col items-center gap-0.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-[#DCFF7D] ${isPlaying ? 'animate-pulse' : ''}`} />
              <Music2 className="w-3.5 h-3.5 text-[#DCFF7D]" />
            </div>

            {/* Middle: Crisp Play/Pause Button */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              title={isPlaying ? 'Pause' : 'Play'}
              className="w-7 h-7 rounded-full bg-white text-[#0B0B0D] hover:bg-neutral-200 flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            {/* Bottom: Maximize icon / tools */}
            <div className="flex items-center justify-center gap-1">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setNotchSize('standard');
                  setVerticalHeight(210);
                }}
                title="Expand notch"
                className="w-4 h-4 rounded text-neutral-400 group-hover:text-white flex items-center justify-center"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                title="Hide notch"
                className="w-4 h-4 rounded text-neutral-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* 1B. STANDARD / EXPANDED VERTICAL NOTCH */
          <div
            style={{ height: verticalHeight ? `${verticalHeight}px` : '210px' }}
            className={`flex flex-col items-center justify-between p-1.5 w-[52px] bg-[#0B0B0D]/95 text-white border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300 relative ${
              dockedSide === 'left'
                ? 'rounded-r-[20px] rounded-l-none border-l-0'
                : dockedSide === 'right'
                ? 'rounded-l-[20px] rounded-r-none border-r-0'
                : 'rounded-[20px]'
            }`}
          >
            {/* Top Grip Indicator + Open Music Section Button */}
            <div className="w-full flex items-center justify-between px-0.5">
              <div className="opacity-40 hover:opacity-100 transition-opacity pointer-events-none py-0.5">
                <GripHorizontal className="w-3 h-1 text-white/40" />
              </div>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMusicSection?.();
                }}
                title="Open Full Music Section"
                className="w-4 h-4 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Squircle Album Artwork */}
            <div className="relative w-8 h-8 rounded-[10px] overflow-hidden flex-shrink-0 border border-white/15 bg-neutral-900 shadow-inner">
              <img
                src={artwork}
                alt={currentTrack.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = MUSIC_FALLBACK_SVG;
                }}
                className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : ''}`}
              />
              <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-[#0B0B0D] text-[#DCFF7D] flex items-center justify-center shadow">
                <Music2 className="w-1.5 h-1.5" />
              </div>
            </div>

            {/* Compact Vertical Title & Artist */}
            <div className="text-center w-full px-0.5">
              <div
                className="text-[10px] font-bold truncate leading-tight text-white"
                title={currentTrack.title}
              >
                {currentTrack.title}
              </div>
              <div
                className="text-[8.5px] truncate font-medium text-neutral-400"
                title={currentTrack.artist}
              >
                {currentTrack.artist}
              </div>
            </div>

            {/* Vertical Progress Scrubber Track */}
            <div
              ref={progressBarRef}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleSeekClickVertical}
              className="w-1 h-9 rounded-full bg-white/20 overflow-hidden cursor-pointer relative"
              title={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            >
              <div
                className="w-full rounded-full transition-all duration-75 absolute top-0 left-0 bg-[#DCFF7D]"
                style={{ height: `${progressPercent}%` }}
              />
            </div>

            {/* Vertical Transport Controls */}
            <div className="flex flex-col items-center gap-1">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  prevTrack();
                }}
                title="Previous"
                className="w-5 h-5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <SkipBack className="w-2.5 h-2.5 fill-current" />
              </button>

              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                disabled={isLoadingTrack}
                title={isPlaying ? 'Pause' : 'Play'}
                className="w-7 h-7 rounded-full bg-white text-[#0B0B0D] hover:bg-neutral-200 flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer relative"
              >
                {isLoadingTrack ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B0B0D]" />
                ) : isPlaying ? (
                  <Pause className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                )}
              </button>

              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  nextTrack();
                }}
                title="Next"
                className="w-5 h-5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <SkipForward className="w-2.5 h-2.5 fill-current" />
              </button>
            </div>

            {/* Minimize Notch Button */}
            <div className="w-full pt-1 border-t border-white/10">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setNotchSize('mini');
                  setVerticalHeight(96);
                }}
                title="Minimize Notch to Edge Tab"
                className="w-full h-5 rounded bg-white/10 hover:bg-white/20 text-white text-[8.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Minimize2 className="w-2.5 h-2.5 text-[#DCFF7D]" />
                <span>Minimize</span>
              </button>
            </div>

            {/* Bottom Tools: Switch Orientation & Dismiss */}
            <div className="flex items-center justify-center gap-1.5 w-full">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setOrientation('horizontal');
                  setDockedSide('top');
                  const targetX = Math.max(0, (window.innerWidth - 270) / 2);
                  animate(x, targetX, { type: 'spring', damping: 25, stiffness: 350 });
                  animate(y, 0, { type: 'spring', damping: 25, stiffness: 350 });
                }}
                title="Switch to Horizontal Notch"
                className="w-4 h-4 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Rows className="w-2.5 h-2.5" />
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                title="Hide Notch"
                className="w-4 h-4 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Bottom Drag-to-Resize Handle */}
            <div
              onPointerDown={handleResizePointerDown}
              className="w-full h-2 flex items-center justify-center cursor-ns-resize rounded-b-lg hover:bg-white/10 transition-colors group"
              title="Drag up to shrink, down to enlarge"
            >
              <div className="w-4 h-0.5 rounded-full bg-white/30 group-hover:bg-white transition-colors" />
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* ORIENTATION 2: HORIZONTAL NOTCH (When placed on Top, Bottom, or Floating) */
        /* ========================================================================= */
        <div
          className={`bg-[#0B0B0D]/95 text-white border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
            notchSize === 'mini'
              ? `px-2.5 py-1 ${
                  dockedSide === 'top'
                    ? 'rounded-b-xl rounded-t-none border-t-0'
                    : dockedSide === 'bottom'
                    ? 'rounded-t-xl rounded-b-none border-b-0'
                    : 'rounded-full'
                }`
              : notchSize === 'standard'
              ? `px-2.5 py-1.5 ${
                  dockedSide === 'top'
                    ? 'rounded-b-[20px] rounded-t-none border-t-0'
                    : dockedSide === 'bottom'
                    ? 'rounded-t-[20px] rounded-b-none border-b-0'
                    : 'rounded-[20px]'
                }`
              : `p-2.5 w-[290px] ${
                  dockedSide === 'top'
                    ? 'rounded-b-[22px] rounded-t-none border-t-0'
                    : dockedSide === 'bottom'
                    ? 'rounded-t-[22px] rounded-b-none border-b-0'
                    : 'rounded-[22px]'
                }`
          }`}
        >
          {/* Top Drag Grip */}
          {notchSize !== 'mini' && (
            <div className="absolute top-0.5 inset-x-0 flex justify-center opacity-30 hover:opacity-100 transition-opacity pointer-events-none">
              <GripHorizontal className="w-3 h-1 text-white/50" />
            </div>
          )}

          {/* MODE 1: MINI PILL MODE */}
          {notchSize === 'mini' && (
            <div
              onClick={() => {
                if (!isDraggingRef.current) {
                  setNotchSize('standard');
                }
              }}
              className="flex items-center gap-1.5 cursor-pointer select-none group"
              title="Click to expand player"
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-[#DCFF7D] flex-shrink-0 ${isPlaying ? 'animate-pulse' : ''}`} />
              <Music2 className="w-3 h-3 text-[#DCFF7D] flex-shrink-0" />
              <span className="text-[11px] font-semibold text-white truncate max-w-[95px] leading-none group-hover:text-white transition-colors">
                {currentTrack.title}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-white transition-transform duration-200" />
            </div>
          )}

          {/* MODE 2: STANDARD COMPACT ISLAND NOTCH */}
          {notchSize === 'standard' && (
            <div className="flex items-center gap-2 pt-0.5">
              {/* Left: Artwork with Music Badge */}
              <div className="relative w-8 h-8 rounded-[10px] overflow-hidden flex-shrink-0 border border-white/15 bg-neutral-900 shadow-inner">
                <img
                  src={artwork}
                  alt={currentTrack.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = MUSIC_FALLBACK_SVG;
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-[#0B0B0D] text-[#DCFF7D] flex items-center justify-center shadow">
                  <Music2 className="w-1.5 h-1.5" />
                </div>
              </div>

              {/* Middle: Title, Artist, & Progress Bar */}
              <div className="min-w-0 max-w-[100px]">
                <div className="text-[11px] font-bold truncate leading-tight text-white">
                  {currentTrack.title}
                </div>
                <div className="text-[9px] truncate font-medium text-neutral-400">
                  {currentTrack.artist}
                </div>

                {/* Mini Scrubber Track */}
                <div
                  ref={progressBarRef}
                  onClick={handleSeekClickHorizontal}
                  className="w-full h-1 rounded-full mt-1 bg-white/20 overflow-hidden cursor-pointer"
                >
                  <div
                    className="h-full rounded-full transition-all duration-75 bg-[#DCFF7D]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    prevTrack();
                  }}
                  title="Previous track"
                  className="w-5 h-5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <SkipBack className="w-2.5 h-2.5 fill-current" />
                </button>

                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  disabled={isLoadingTrack}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className="w-6 h-6 rounded-full bg-white text-[#0B0B0D] hover:bg-neutral-200 flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer relative"
                >
                  {isLoadingTrack ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B0B0D]" />
                  ) : isPlaying ? (
                    <Pause className="w-3 h-3 fill-current" />
                  ) : (
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    nextTrack();
                  }}
                  title="Next track"
                  className="w-5 h-5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <SkipForward className="w-2.5 h-2.5 fill-current" />
                </button>
              </div>

              {/* Dedicated Tools */}
              <div className="flex items-center gap-0.5 pl-1 border-l border-white/10">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMusicSection?.();
                  }}
                  title="Open Full Music Section"
                  className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOrientation('vertical');
                    setDockedSide('right');
                    animate(x, window.innerWidth - VERT_WIDTH, { type: 'spring', damping: 25, stiffness: 350 });
                  }}
                  title="Switch to Vertical Dock"
                  className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Columns className="w-2.5 h-2.5" />
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotchSize('expanded');
                  }}
                  title="Expand Notch"
                  className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotchSize('mini');
                  }}
                  title="Compact Mode"
                  className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-2.5 h-2.5" />
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDismissed(true);
                  }}
                  title="Hide Notch"
                  className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: EXPANDED FULL CONTROL NOTCH */}
          {notchSize === 'expanded' && (
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DCFF7D] animate-ping" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DCFF7D]">
                    Now Playing
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMusicSection?.();
                    }}
                    title="Open Full Music Section"
                    className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOrientation('vertical');
                      setDockedSide('right');
                      animate(x, window.innerWidth - VERT_WIDTH, { type: 'spring', damping: 25, stiffness: 350 });
                    }}
                    title="Switch to Vertical Dock"
                    className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Columns className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotchSize('standard');
                    }}
                    title="Collapse"
                    className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDismissed(true);
                    }}
                    title="Hide Notch"
                    className="w-5 h-5 rounded text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Artwork + Title */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-white/15 bg-neutral-900 shadow-inner">
                  <img
                    src={artwork}
                    alt={currentTrack.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = MUSIC_FALLBACK_SVG;
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold truncate text-white">
                    {currentTrack.title}
                  </h4>
                  <p className="text-[10px] font-medium truncate text-neutral-400">
                    {currentTrack.artist}
                  </p>
                  <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 mt-0.5">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Seek Scrubber Bar */}
              <div
                ref={progressBarRef}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleSeekClickHorizontal}
                className="w-full h-1 rounded-full bg-white/20 overflow-hidden cursor-pointer relative"
              >
                <div
                  className="h-full rounded-full transition-all duration-75 bg-[#DCFF7D]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between pt-0.5">
                {/* Volume */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="w-6 h-6 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {/* Transport Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      prevTrack();
                    }}
                    className="w-6 h-6 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <SkipBack className="w-3 h-3 fill-current" />
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="w-7 h-7 rounded-full bg-white text-[#0B0B0D] hover:bg-neutral-200 flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      nextTrack();
                    }}
                    className="w-6 h-6 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-3 h-3 fill-current" />
                  </button>
                </div>

                {/* Switch to Full Music Section */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMusicSection?.();
                  }}
                  title="Go to Music Section"
                  className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Open</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
