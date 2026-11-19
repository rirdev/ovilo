import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { MusicTrack, LyricsData } from '../types';
import { readLocalLrc, fetchOnlineLyrics, parseLrc, resolveOnlineStream, scanLocalMusic } from '../services/api';

interface AudioContextType {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  hasStartedPlayback: boolean;
  isLoadingTrack: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: MusicTrack[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  lyrics: LyricsData | null;
  isLoadingLyrics: boolean;
  showLyricsModal: boolean;
  showQueueModal: boolean;
  lyricOffset: number;
  setLyricOffset: (offset: number) => void;
  adjustLyricOffset: (delta: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
  audioCtx: AudioContext | null;
  analyserNode: AnalyserNode | null;
  playTrack: (track: MusicTrack, queue?: MusicTrack[]) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  fastForward: (seconds?: number) => void;
  rewind: (seconds?: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setShowLyricsModal: (show: boolean) => void;
  toggleLyricsModal: () => void;
  setShowQueueModal: (show: boolean) => void;
  addToQueue: (track: MusicTrack) => void;
  getTrackArtwork: (track: MusicTrack | null) => string;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const MUSIC_FALLBACK_SVG =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80';

export const DEFAULT_MUSIC_ARTWORK =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';

let globalAudioCtx: AudioContext | null = null;
let globalAnalyser: AnalyserNode | null = null;

export function getAudioVisualizer() {
  if (typeof window === 'undefined') return { ctx: null, analyser: null };

  try {
    if (!globalAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass();
        (window as any).__oviloAudioCtx = globalAudioCtx;
      }
    }
    if (globalAudioCtx && !globalAnalyser) {
      globalAnalyser = globalAudioCtx.createAnalyser();
      globalAnalyser.fftSize = 1024;
      globalAnalyser.smoothingTimeConstant = 0.8;
      (window as any).__oviloAnalyser = globalAnalyser;
    }
  } catch (err) {
    console.warn('Web Audio Analyser init error:', err);
  }
  return { ctx: globalAudioCtx, analyser: globalAnalyser };
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState<boolean>(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [lyricOffset, setLyricOffsetState] = useState<number>(0);

  const nextTrackRef = useRef<() => void>(() => {});
  const playRequestIdRef = useRef<number>(0);
  const localTracksCacheRef = useRef<MusicTrack[]>([]);
  const currentTrackRef = useRef<MusicTrack | null>(null);
  const lyricsRef = useRef<LyricsData | null>(null);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    lyricsRef.current = lyrics;
  }, [lyrics]);

  // Sync lyric offset with persistent storage per track
  useEffect(() => {
    if (!currentTrack) {
      setLyricOffsetState(0);
      return;
    }
    const key = `ovilo_lyric_offset_${currentTrack.id || currentTrack.title}`;
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) setLyricOffsetState(parsed);
    } else {
      setLyricOffsetState(0);
    }
  }, [currentTrack?.id, currentTrack?.title]);

  const setLyricOffset = useCallback(
    (offset: number) => {
      const clamped = Math.round(offset * 10) / 10;
      setLyricOffsetState(clamped);
      if (currentTrack) {
        const key = `ovilo_lyric_offset_${currentTrack.id || currentTrack.title}`;
        localStorage.setItem(key, clamped.toString());
      }
    },
    [currentTrack]
  );

  const adjustLyricOffset = useCallback(
    (delta: number) => {
      setLyricOffsetState((prev) => {
        const next = Math.round((prev + delta) * 10) / 10;
        if (currentTrack) {
          const key = `ovilo_lyric_offset_${currentTrack.id || currentTrack.title}`;
          localStorage.setItem(key, next.toString());
        }
        return next;
      });
    },
    [currentTrack]
  );

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.8;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    (window as any).__oviloAudio = audio;

    let sourceNode: MediaElementAudioSourceNode | null = null;
    const connectAudioToVisualizer = () => {
      try {
        const { ctx, analyser } = getAudioVisualizer();
        if (ctx && analyser && !sourceNode) {
          sourceNode = ctx.createMediaElementSource(audio);
          sourceNode.connect(analyser);
          analyser.connect(ctx.destination);
          (window as any).__oviloSource = sourceNode;
        }
      } catch (err) {
        // createMediaElementSource can only be called once per audio element
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        // Only re-fetch online lyrics if not a local file and lyrics are not already loaded
        const t = currentTrackRef.current;
        const currentLoadedDur = lyricsRef.current?.loadedDuration;
        const needsFetch = !lyricsRef.current || !lyricsRef.current.synced || !currentLoadedDur || Math.abs(currentLoadedDur - audio.duration) > 4;
        if (t && !t.is_local && !t.file_path && needsFetch) {
          let cleanTitle = t.title;
          let cleanArtist = t.artist;
          if (cleanTitle.includes(' - ')) {
            const parts = cleanTitle.split(' - ');
            const left = parts[0].trim();
            const right = parts.slice(1).join(' - ').trim();
            const isGeneric = !cleanArtist || /youtube|unknown|local|vevo|topic|channel/i.test(cleanArtist);
            if (isGeneric && left.length > 0) {
              cleanArtist = left;
              cleanTitle = right;
            }
          }
          cleanTitle = cleanTitle
            .replace(/\(feat\..*?\)/gi, '')
            .replace(/\s*[\(\[](official\s*(music\s*)?video|official\s*audio|lyrics?(\s*video)?|4k|hd|visualizer|audio)[\)\]]/gi, '')
            .replace(/^#+/, '')
            .trim();
          const vidId = t.id.startsWith('yt_') ? t.id.replace('yt_', '') : undefined;
          fetchOnlineLyrics(cleanTitle, cleanArtist, audio.duration, vidId).then((res) => {
            const cur = currentTrackRef.current;
            const isMatch = cur && (cur.id === t.id || cur.title.toLowerCase().trim() === t.title.toLowerCase().trim());
            if (res && res.synced && isMatch) {
              setLyrics(res);
              lyricsRef.current = res;
            }
          }).catch(() => {});
        }
      }
    };

    const onPlay = () => {
      connectAudioToVisualizer();
      if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume().catch(() => {});
      }
      setIsPlaying(true);
      setHasStartedPlayback(true);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoadingTrack(true);
    const onPlaying = () => {
      setIsPlaying(true);
      setIsLoadingTrack(false);
      setHasStartedPlayback(true);
    };
    const onEnded = () => {
      if (nextTrackRef.current) {
        nextTrackRef.current();
      }
    };
    const onError = (e: Event) => {
      console.warn('Audio element error:', e, audio.error);
      setIsLoadingTrack(false);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Continuous 50ms high-resolution playback clock (ArchiveTune LyricsPlaybackClock behavior)
  useEffect(() => {
    let timerId: any;
    if (isPlaying) {
      timerId = setInterval(() => {
        const audio = audioRef.current;
        if (audio && !audio.paused && !audio.ended) {
          const cur = audio.currentTime;
          setCurrentTime((prev) => (Math.abs(prev - cur) >= 0.03 ? cur : prev));
        }
      }, 50);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isPlaying]);

  // Pre-load local music on app startup so first track is ready in the notch & player dock
  useEffect(() => {
    scanLocalMusic().then((tracks) => {
      if (tracks && tracks.length > 0) {
        localTracksCacheRef.current = tracks;
        setQueue(tracks);
        setQueueIndex(0);
        setCurrentTrack(tracks[0]);
        if (tracks[0].duration) setDuration(tracks[0].duration);
        if (audioRef.current) {
          const audioSrc = tracks[0].stream_url?.startsWith('http')
            ? tracks[0].stream_url
            : tracks[0].file_path
            ? `http://127.0.0.1:4545/media?path=${encodeURIComponent(tracks[0].file_path)}`
            : '';
          if (audioSrc) {
            audioRef.current.src = audioSrc;
            audioRef.current.currentTime = 0;
            audioRef.current.load();
          }
        }
      } else {
        const showcaseDefault: MusicTrack = {
          id: 'kino_slow_harbour',
          title: 'Slow Harbour',
          artist: 'Mira Okafor',
          album: 'Low Tide Sessions',
          duration: 184,
          stream_url: 'https://ia600908.us.archive.org/8/items/testmp3testfile/mpthreetest.mp3',
          has_lyrics: true,
          is_local: false,
        };
        setQueue([showcaseDefault]);
        setQueueIndex(0);
        setCurrentTrack(showcaseDefault);
        setDuration(184);
        if (audioRef.current) {
          audioRef.current.src = showcaseDefault.stream_url!;
          audioRef.current.load();
        }
      }
    });
  }, []);

  // Helper to resolve artwork (uses local streaming server for local files)
  const getTrackArtwork = useCallback((track: MusicTrack | null): string => {
    if (!track) return DEFAULT_MUSIC_ARTWORK;
    if (track.artwork_url) {
      if (track.artwork_url.startsWith('http')) {
        return track.artwork_url;
      }
      return `http://127.0.0.1:4545/media?path=${encodeURIComponent(track.artwork_url)}`;
    }
    return DEFAULT_MUSIC_ARTWORK;
  }, []);

  // Fetch lyrics in background whenever current track changes
  const loadLyricsForTrack = useCallback(async (track: MusicTrack) => {
    const trackId = track.id;
    const trackTitle = track.title;
    const trackFilePath = track.file_path;
    setIsLoadingLyrics(true);

    const isStillActiveTrack = () => {
      const cur = currentTrackRef.current;
      if (!cur) return false;
      if (cur.id === trackId) return true;
      if (cur.title.toLowerCase().trim() === trackTitle.toLowerCase().trim()) return true;
      if (trackFilePath && cur.file_path === trackFilePath) return true;
      return false;
    };

    let effectiveFilePath = track.file_path;
    let effectiveIsLocal = Boolean(track.is_local);
    if (!effectiveFilePath && track.stream_url?.includes('media?path=')) {
      try {
        const u = new URL(track.stream_url);
        const p = u.searchParams.get('path');
        if (p) {
          effectiveFilePath = p;
          effectiveIsLocal = true;
        }
      } catch {}
    }

    // 1. Try local .lrc file if it's a local track (100% exact file matching, ArchiveTune rule)
    if (effectiveIsLocal && effectiveFilePath) {
      try {
        const localLrc = await readLocalLrc(effectiveFilePath);
        if (isStillActiveTrack() && localLrc) {
          const lines = parseLrc(localLrc);
          if (lines.length > 0) {
            const lyricsData = {
              synced: true,
              synced_lyrics: localLrc,
              lines,
            };
            setLyrics(lyricsData);
            lyricsRef.current = lyricsData;
            setIsLoadingLyrics(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not read local LRC:', e);
      }
    }

    // 2. Fetch from online providers (SimpMusic by videoId first, then LRCLIB with ArchiveTune validation)
    try {
      let cleanTitle = track.title;
      let cleanArtist = track.artist;
      if (cleanTitle.includes(' - ')) {
        const parts = cleanTitle.split(' - ');
        const left = parts[0].trim();
        const right = parts.slice(1).join(' - ').trim();
        const isGeneric = !cleanArtist || /youtube|unknown|local|vevo|topic|channel/i.test(cleanArtist);
        if (isGeneric && left.length > 0) {
          cleanArtist = left;
          cleanTitle = right;
        }
      }
      cleanTitle = cleanTitle
        .replace(/\(feat\..*?\)/gi, '')
        .replace(/\s*[\(\[](official\s*(music\s*)?video|official\s*audio|lyrics?(\s*video)?|4k|hd|visualizer|audio)[\)\]]/gi, '')
        .replace(/^#+/, '')
        .trim();
      const effectiveDuration = (audioRef.current?.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration))
        ? audioRef.current.duration
        : (track.duration && track.duration > 0 && Math.abs(track.duration - 215) > 0.1 ? track.duration : 0);

      const vidId = track.id.startsWith('yt_') ? track.id.replace('yt_', '') : undefined;
      const onlineLyrics = await fetchOnlineLyrics(cleanTitle, cleanArtist, effectiveDuration, vidId);
      if (isStillActiveTrack() && onlineLyrics) {
        setLyrics(onlineLyrics);
        lyricsRef.current = onlineLyrics;
      }
    } catch (err) {
      console.warn('Online lyrics fetch failed:', err);
    } finally {
      if (isStillActiveTrack()) {
        setIsLoadingLyrics(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      lyricsRef.current = null;
      return;
    }
    loadLyricsForTrack(currentTrack);
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, loadLyricsForTrack]);

  // Play a specific track (instant local playback + robust stream resolution)
  const playTrack = useCallback(
    async (track: MusicTrack, newQueue?: MusicTrack[]) => {
      if (!audioRef.current) return;

      const reqId = ++playRequestIdRef.current;

      if (newQueue) {
        setQueue(newQueue);
        const idx = newQueue.findIndex((t) => t.id === track.id);
        setQueueIndex(idx !== -1 ? idx : 0);
      } else if (queue.length > 0) {
        const idx = queue.findIndex((t) => t.id === track.id);
        if (idx !== -1) {
          setQueueIndex(idx);
        } else {
          setQueue((prev) => [...prev, track]);
          setQueueIndex(queue.length);
        }
      } else {
        setQueue([track]);
        setQueueIndex(0);
      }

      const isSameTrack = currentTrackRef.current?.id === track.id;
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.duration || 0);
      setHasStartedPlayback(true);
      setIsPlaying(false);
      setIsLoadingTrack(true);
      if (!isSameTrack || !lyricsRef.current) {
        setLyrics(null);
        lyricsRef.current = null;
        loadLyricsForTrack(track);
      }

      const audio = audioRef.current;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();

      try {
        const toProxiedUrl = (url: string) => {
          if (!url || !url.startsWith('http')) return url;
          if (url.includes('127.0.0.1:4545') || url.includes('localhost:4545')) return url;
          return `http://127.0.0.1:4545/proxy_stream?url=${encodeURIComponent(url)}`;
        };

        // 1. Direct local file playback path
        if (track.is_local && track.file_path) {
          const audioSrc = `http://127.0.0.1:4545/media?path=${encodeURIComponent(track.file_path)}`;
          if (playRequestIdRef.current !== reqId) return;
          audio.src = audioSrc;
          audio.currentTime = 0;
          audio.load();
          try {
            await audio.play();
            if (playRequestIdRef.current === reqId) {
              setIsPlaying(true);
              setIsLoadingTrack(false);
            }
            return;
          } catch (playErr) {
            console.warn('Local file playback error:', playErr);
            if (playRequestIdRef.current === reqId) {
              setIsLoadingTrack(false);
            }
            return; // Never fall through to arbitrary online stream for local tracks
          }
        }

        // 2. Online streaming playback path
        let audioSrc = track.stream_url;
        const isPreviewOrIncomplete = !audioSrc || audioSrc.length === 0 ||
          audioSrc.includes('AudioPreview') ||
          audioSrc.includes('AudioPreview_dummy') ||
          audioSrc.includes('apple.com') ||
          audioSrc.includes('mzstatic') ||
          audioSrc.includes('youtube.com') ||
          audioSrc.includes('googlevideo.com');

        // Fast-path: If a verified direct audio stream exists, play immediately
        if (!isPreviewOrIncomplete) {
          if (playRequestIdRef.current !== reqId) return;
          audio.src = toProxiedUrl(audioSrc);
          audio.currentTime = 0;
          audio.load();
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                if (playRequestIdRef.current !== reqId) return;
                setIsPlaying(true);
                setIsLoadingTrack(false);
              })
              .catch(async (playErr) => {
                console.warn('Direct stream playback error, attempting yt-dlp fallback:', playErr);
                try {
                  const vidId = track.id.startsWith('yt_') ? track.id.replace('yt_', '') : undefined;
                  const resolved = await resolveOnlineStream(track.title, track.artist, vidId, track.duration);
                  if (playRequestIdRef.current !== reqId) return;
                  if (resolved && audioRef.current) {
                    audioRef.current.src = toProxiedUrl(resolved.url);
                    audioRef.current.currentTime = 0;
                    audioRef.current.load();
                    await audioRef.current.play();
                    setIsPlaying(true);
                    track.stream_url = resolved.url;
                    if (resolved.video_id) {
                      track.id = `yt_${resolved.video_id}`;
                    }
                    if (resolved.duration) {
                      track.duration = resolved.duration;
                      setDuration(resolved.duration);
                    }
                    if (!lyricsRef.current) {
                      loadLyricsForTrack(track);
                    }
                  }
                } catch (fallbackErr) {
                  console.warn('Fallback resolve stream failed:', fallbackErr);
                } finally {
                  if (playRequestIdRef.current === reqId) {
                    setIsLoadingTrack(false);
                  }
                }
              });
          } else {
            setIsPlaying(true);
            setIsLoadingTrack(false);
          }
          return;
        }

        // 3. Resolve exact online stream from the beginning (0:00) via native yt-dlp engine
        try {
          const vidId = track.id.startsWith('yt_') ? track.id.replace('yt_', '') : undefined;
          const resolved = await resolveOnlineStream(track.title, track.artist, vidId, track.duration);
          if (playRequestIdRef.current !== reqId) return;
          if (resolved && audioRef.current) {
            audioRef.current.src = toProxiedUrl(resolved.url);
            audioRef.current.currentTime = 0;
            audioRef.current.load();
            await audioRef.current.play();
            setIsPlaying(true);
            setIsLoadingTrack(false);
            track.stream_url = resolved.url;
            if (resolved.video_id) {
              track.id = `yt_${resolved.video_id}`;
            }
            if (resolved.duration) {
              track.duration = resolved.duration;
              setDuration(resolved.duration);
            }
            if (!lyricsRef.current) {
              loadLyricsForTrack(track);
            }
            return;
          }
        } catch (resolveErr) {
          console.warn('Failed to resolve full track stream, falling back to preview:', resolveErr);
        }

        if (playRequestIdRef.current !== reqId) return;

        // Fallback to preview stream only if resolve completely failed
        if (audioSrc && audioRef.current) {
          audioRef.current.src = toProxiedUrl(audioSrc);
          audioRef.current.currentTime = 0;
          audioRef.current.load();
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (err) {
        console.warn('playTrack fatal error:', err);
      } finally {
        if (playRequestIdRef.current === reqId) {
          setIsLoadingTrack(false);
        }
      }
    },
    [queue]
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    const track = currentTrack || (queue.length > 0 ? queue[0] : null);
    if (!track) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setHasStartedPlayback(true);
      if (
        audioRef.current.src &&
        audioRef.current.src !== '' &&
        audioRef.current.src !== window.location.href
      ) {
        const p = audioRef.current.play();
        if (p !== undefined) {
          p.then(() => {
            setIsPlaying(true);
          }).catch(() => {
            playTrack(track);
          });
        } else {
          setIsPlaying(true);
        }
      } else {
        playTrack(track);
      }
    }
  }, [currentTrack, queue, isPlaying, playTrack]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && currentTrack) {
      if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume().catch(() => {});
      }
      setHasStartedPlayback(true);
      const p = audioRef.current.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setHasStartedPlayback(true);
        }).catch(console.warn);
      }
    }
  }, [currentTrack]);

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    try {
      const audio = audioRef.current;
      const maxDur = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) ? audio.duration : 999999;
      const target = Math.max(0, Math.min(seconds, maxDur));
      if (!isNaN(target) && isFinite(target)) {
        audio.currentTime = target;
        setCurrentTime(target);
      }
    } catch (e) {
      console.warn('Seek error:', e);
    }
  }, []);

  const fastForward = useCallback((seconds = 10) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const maxDur = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) ? audio.duration : 999999;
    const current = !isNaN(audio.currentTime) ? audio.currentTime : 0;
    const target = Math.min(maxDur, current + seconds);
    try {
      audio.currentTime = target;
      setCurrentTime(target);
    } catch (e) {
      console.warn('Fast forward error:', e);
    }
  }, []);

  const rewind = useCallback((seconds = 10) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const current = !isNaN(audio.currentTime) ? audio.currentTime : 0;
    const target = Math.max(0, current - seconds);
    try {
      audio.currentTime = target;
      setCurrentTime(target);
    } catch (e) {
      console.warn('Rewind error:', e);
    }
  }, []);

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      setVolumeState(clamped);
      if (audioRef.current) {
        audioRef.current.volume = clamped;
        if (clamped > 0 && isMuted) {
          setIsMuted(false);
        }
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume > 0 ? volume : 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (repeatMode === 'one' && currentTrack) {
      seek(0);
      resume();
      return;
    }

    let nextIdx = queueIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        pause();
        return;
      }
    }

    const next = queue[nextIdx];
    if (next) {
      setQueueIndex(nextIdx);
      playTrack(next);
    }
  }, [queue, queueIndex, isShuffle, repeatMode, currentTrack, playTrack, seek, resume, pause]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      seek(0);
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }

    const prev = queue[prevIdx];
    if (prev) {
      setQueueIndex(prevIdx);
      playTrack(prev);
    }
  }, [queue, queueIndex, seek, playTrack]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleLyricsModal = useCallback(() => {
    setShowLyricsModal((prev) => !prev);
  }, []);

  const addToQueue = useCallback((track: MusicTrack) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  // Global Keyboard Shortcuts for Media Playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight' && !e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.shiftKey) {
          nextTrack();
        } else {
          e.preventDefault();
          fastForward(10);
        }
      } else if (e.key === 'ArrowLeft' && !e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.shiftKey) {
          prevTrack();
        } else {
          e.preventDefault();
          rewind(10);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    const handleTogglePlayback = () => {
      togglePlay();
    };

    const handlePlayTrackEvent = (e: any) => {
      if (e.detail) {
        playTrack(e.detail);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ovilo_toggle_playback', handleTogglePlayback);
    window.addEventListener('ovilo_play_track', handlePlayTrackEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ovilo_toggle_playback', handleTogglePlayback);
      window.removeEventListener('ovilo_play_track', handlePlayTrackEvent);
    };
  }, [fastForward, rewind, nextTrack, prevTrack, togglePlay, playTrack]);

  const getAudioElement = useCallback(() => audioRef.current, []);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        hasStartedPlayback,
        isLoadingTrack,
        currentTime,
        duration,
        volume,
        isMuted,
        queue,
        queueIndex,
        isShuffle,
        repeatMode,
        lyrics,
        isLoadingLyrics,
        showLyricsModal,
        showQueueModal,
        lyricOffset,
        setLyricOffset,
        adjustLyricOffset,
        getAudioElement,
        audioCtx: globalAudioCtx,
        analyserNode: globalAnalyser,
        playTrack,
        togglePlay,
        pause,
        resume,
        seek,
        fastForward,
        rewind,
        setVolume,
        toggleMute,
        nextTrack,
        prevTrack,
        toggleShuffle,
        toggleRepeat,
        setShowLyricsModal,
        toggleLyricsModal,
        setShowQueueModal,
        addToQueue,
        getTrackArtwork,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
