import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Minus, Maximize2, X } from 'lucide-react';
import { useAudio, getAudioVisualizer } from '../context/AudioContext';

interface KinoNotchProps {
  onOpenMusicSection?: () => void;
}

type NotchState = {
  show: boolean;
  open: boolean;
  lg: boolean;
  min: boolean;
  gone: boolean;
};

export const KinoNotch: React.FC<KinoNotchProps> = ({ onOpenMusicSection }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    lyrics: audioLyrics,
  } = useAudio();

  const [notchState, setNotchState] = useState<NotchState>({
    show: true,
    open: false,
    lg: false,
    min: false,
    gone: false,
  });

  const [dx, setDx] = useState<number>(0);
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);
  const startDx = useRef<number>(0);
  const isHovered = useRef<boolean>(false);
  const notchRef = useRef<HTMLDivElement>(null);

  // Live Web Audio API Visualizer for Notch Equalizer Bars (Log-Scale Frequency Analyser)
  useEffect(() => {
    let animId: number;

    const renderNotchVisualizer = () => {
      const { analyser, ctx } = getAudioVisualizer();
      const bars = notchRef.current?.querySelectorAll('.neq i');

      if (bars && bars.length > 0) {
        if (isPlaying) {
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }

          let hasLiveData = false;
          if (analyser) {
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);

            let sum = 0;
            for (let k = 0; k < 64; k++) sum += data[k] || 0;

            if (sum > 8 && ctx) {
              hasLiveData = true;
              const hz = ctx.sampleRate / analyser.fftSize;
              const lo = 40, hi = 12000;
              const barCount = bars.length;

              bars.forEach((bar, i) => {
                const a = lo * Math.pow(hi / lo, i / barCount);
                const b = lo * Math.pow(hi / lo, (i + 1) / barCount);
                const s = Math.floor(a / hz);
                const e = Math.max(Math.floor(a / hz) + 1, Math.floor(b / hz));

                let binSum = 0;
                for (let k = s; k < e; k++) {
                  binSum += data[k] || 0;
                }
                const v = binSum / Math.max(1, e - s) / 255;
                const scale = Math.max(0.15, Math.min(1, v * 1.6));
                (bar as HTMLElement).style.setProperty('transform', `scaleY(${scale})`, 'important');
              });
            }
          }

          if (!hasLiveData) {
            // Live audio warming up or initial playback -> drive with organic smooth frame animation so bars actively dance
            const t = performance.now() / 180;
            bars.forEach((bar, idx) => {
              const wave = Math.sin(t + idx * 1.3) * 0.35 + 0.55;
              (bar as HTMLElement).style.setProperty('transform', `scaleY(${Math.max(0.18, wave)})`, 'important');
            });
          }
        }
      }

      if (isPlaying) {
        animId = requestAnimationFrame(renderNotchVisualizer);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(renderNotchVisualizer);
    } else {
      const bars = notchRef.current?.querySelectorAll('.neq i');
      if (bars) {
        bars.forEach((bar) => {
          (bar as HTMLElement).style.removeProperty('animation');
          (bar as HTMLElement).style.setProperty('transform', 'scaleY(0.2)', 'important');
        });
      }
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  // Synchronize notch visibility with audio playback
  useEffect(() => {
    if (isPlaying) {
      setNotchState((prev) => ({ ...prev, show: true, gone: false }));
    }
  }, [isPlaying]);

  // Listen for global notch control events
  useEffect(() => {
    const handleRestore = () => {
      setNotchState({ show: true, open: false, lg: false, min: false, gone: false });
    };
    const handleToggle = () => {
      setNotchState((prev) => ({ ...prev, gone: !prev.gone }));
    };
    const handleControl = (e: any) => {
      const cmd = e.detail;
      if (cmd === 'min' || cmd === 'mini') {
        setNotchState((prev) => ({ ...prev, min: true, open: false, gone: false }));
      } else if (cmd === 'collapsed') {
        setNotchState((prev) => ({ ...prev, min: false, open: false, lg: false, gone: false }));
      } else if (cmd === 'open' || cmd === 'standard') {
        setNotchState((prev) => ({ ...prev, min: false, open: true, lg: false, gone: false }));
      } else if (cmd === 'lg' || cmd === 'expanded') {
        setNotchState((prev) => ({ ...prev, min: false, open: true, lg: true, gone: false }));
      } else if (cmd === 'remove' || cmd === 'hide') {
        setNotchState((prev) => ({ ...prev, gone: true, open: false }));
      }
    };

    window.addEventListener('ovilo_restore_notch', handleRestore);
    window.addEventListener('ovilo_toggle_notch', handleToggle);
    window.addEventListener('ovilo_notch_control', handleControl);
    return () => {
      window.removeEventListener('ovilo_restore_notch', handleRestore);
      window.removeEventListener('ovilo_toggle_notch', handleToggle);
      window.removeEventListener('ovilo_notch_control', handleControl);
    };
  }, []);

  // Dragging horizontally along the top bar
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    startDx.current = dx;

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - dragStartX.current;
      const maxLim = (window.innerWidth || 1200) / 2 - 190;
      const newDx = Math.max(-maxLim, Math.min(maxLim, startDx.current + delta));
      setDx(newDx);
    };

    const onPointerUp = () => {
      isDragging.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleMouseEnter = () => {
    isHovered.current = true;
    if (notchState.show && !notchState.min && !notchState.gone) {
      setNotchState((prev) => ({ ...prev, open: true }));
    }
  };

  const handleMouseLeave = () => {
    isHovered.current = false;
    setNotchState((prev) => ({ ...prev, open: false, lg: false }));
  };

  if (notchState.gone) return null;

  const title = currentTrack?.title || 'Slow Harbour';
  const artist = currentTrack?.artist || 'Mira Okafor';
  const effectiveDuration = duration > 0 ? duration : (currentTrack?.duration || 0);
  const effectiveTime = currentTime;
  const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (effectiveTime / effectiveDuration) * 100)) : 0;

  const liveLyricText = useMemo(() => {
    if (audioLyrics?.lines && audioLyrics.lines.length > 0) {
      const target = effectiveTime + 0.25;
      if (target >= audioLyrics.lines[0].time) {
        let low = 0;
        let high = audioLyrics.lines.length - 1;
        while (low <= high) {
          const mid = (low + high) >>> 1;
          if (audioLyrics.lines[mid].time <= target) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        if (high >= 0 && audioLyrics.lines[high]?.text) {
          return audioLyrics.lines[high].text;
        }
      }
    }
    return currentTrack?.has_lyrics || audioLyrics?.synced
      ? '♪ Live audio playback'
      : 'High-fidelity audio stream';
  }, [audioLyrics, effectiveTime, currentTrack]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * effectiveDuration);
  };

  const classes = [
    'nt',
    notchState.show && !notchState.gone ? 'show' : '',
    notchState.open && !notchState.min && !notchState.gone ? 'open' : '',
    notchState.lg && notchState.open && !notchState.min ? 'lg' : '',
    notchState.min ? 'min' : '',
    isPlaying ? 'playing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={notchRef}
      className={classes}
      style={{ '--dx': `${dx}px` } as React.CSSProperties}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (notchState.min) {
          setNotchState((prev) => ({ ...prev, min: false }));
        }
      }}
    >
      {/* 1. Pill mode (collapsed / minimized) */}
      <div
        className="nt-pill"
        style={notchState.min ? { justifyContent: 'center', padding: '0 8px' } : undefined}
        onClick={(e) => {
          if (!notchState.min && onOpenMusicSection) {
            e.stopPropagation();
            onOpenMusicSection();
          }
        }}
        title="Open Music Player"
      >
        {!notchState.min ? (
          <>
            {/* Left: Mini Spinning Vinyl Disc */}
            <div className="nd" title="Now Playing" />

            {/* Center: Track title with balanced alignment */}
            <div className="nt-center text-[11px] font-semibold text-white/90 truncate max-w-[100px] text-center select-none pointer-events-none">
              {title}
            </div>

            {/* Right: 4-Bar Equalizer */}
            <div className="neq" title="Audio Equalizer">
              <i />
              <i />
              <i />
              <i />
            </div>
          </>
        ) : (
          /* Minimized / Mini size: ONLY the centered 4-bar equalizer */
          <div className="neq" style={{ margin: '0 auto' }} title="Audio Equalizer">
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      {/* 2. Full mode (expanded controls) */}
      <div className="full">
        {/* Notch Top Control Bar */}
        <div className="nbar">
          <span
            className="grip"
            title="Drag to move"
            onPointerDown={handlePointerDown}
          >
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>

          <span className="nw">
            <button
              type="button"
              title="Minimize"
              onClick={(e) => {
                e.stopPropagation();
                setNotchState((prev) => ({ ...prev, min: true, open: false }));
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Minus style={{ width: '12px', height: '12px', stroke: '#c9c7c2', strokeWidth: 2.2 }} />
            </button>
            <button
              type="button"
              title="Resize"
              onClick={(e) => {
                e.stopPropagation();
                setNotchState((prev) => ({ ...prev, lg: !prev.lg, open: true }));
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Maximize2 style={{ width: '12px', height: '12px', stroke: '#c9c7c2', strokeWidth: 2.2 }} />
            </button>
            <button
              type="button"
              title="Remove"
              onClick={(e) => {
                e.stopPropagation();
                setNotchState((prev) => ({ ...prev, gone: true, open: false }));
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X style={{ width: '12px', height: '12px', stroke: '#ff7a64', strokeWidth: 2.2 }} />
            </button>
          </span>
        </div>

        {/* Track Info & Artwork */}
        <div className="ntop cursor-pointer" onClick={onOpenMusicSection}>
          <div
            className="ncv"
            style={
              currentTrack?.artwork_url
                ? {
                    backgroundImage: `url(${currentTrack.artwork_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />
          <div className="nmeta">
            <b>{title}</b>
            <small>{artist}</small>
            <em className="nly" style={{ fontStyle: 'normal' }}>
              {liveLyricText}
            </em>
          </div>
          <div className="neq">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>

        {/* Scrubber & Duration */}
        <div className="nprog">
          <span>{formatTime(effectiveTime)}</span>
          <div className="bar cursor-pointer" onClick={handleSeek}>
            <b style={{ width: `${progressPercent}%` }} />
          </div>
          <span>{formatTime(effectiveDuration)}</span>
        </div>

        {/* Audio Transport Controls */}
        <div className="nctl">
          <svg
            viewBox="0 0 24 24"
            style={{ fill: 'currentColor', stroke: 'none', width: '20px', height: '20px', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              prevTrack();
            }}
          >
            <path d="M6 5h2v14H6zM20 5v14L9 12z" />
          </svg>

          <div
            className="pp2 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" style={{ fill: 'currentColor', stroke: 'none', width: '16px', height: '16px' }}>
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" style={{ fill: 'currentColor', stroke: 'none', width: '16px', height: '16px', marginLeft: '2px' }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>

          <svg
            viewBox="0 0 24 24"
            style={{ fill: 'currentColor', stroke: 'none', width: '20px', height: '20px', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              nextTrack();
            }}
          >
            <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
