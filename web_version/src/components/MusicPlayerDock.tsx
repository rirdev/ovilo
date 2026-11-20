import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import {
  SkipBack,
  SkipForward,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Download,
} from 'lucide-react';
import { MusicTrack } from '../types';
import {
  getLocalMusicFavorites,
  saveLocalMusicFavorites,
  getLocalProfile,
  syncToCloud,
} from '../services/firebaseSync';
import { startDownload } from '../services/downloadManager';

export const MusicPlayerDock: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlay,
    playTrack,
    seek,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  } = useAudio();

  const [favorites, setFavorites] = useState<MusicTrack[]>(() => getLocalMusicFavorites());
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncFavs = () => setFavorites(getLocalMusicFavorites());
    const handleTogglePlayback = () => handlePlayToggle();
    const handlePlayTrack = (e: any) => {
      if (e.detail) {
        playTrack({
          ...e.detail,
          stream_url: '',
          is_local: false,
          has_lyrics: false,
        });
      }
    };
    window.addEventListener('ovilo_music_favorites_updated', syncFavs);
    window.addEventListener('ovilo_profile_updated', syncFavs);
    window.addEventListener('ovilo_toggle_playback', handleTogglePlayback);
    window.addEventListener('ovilo_play_track', handlePlayTrack);
    return () => {
      window.removeEventListener('ovilo_music_favorites_updated', syncFavs);
      window.removeEventListener('ovilo_profile_updated', syncFavs);
      window.removeEventListener('ovilo_toggle_playback', handleTogglePlayback);
      window.removeEventListener('ovilo_play_track', handlePlayTrack);
    };
  }, [currentTrack, isPlaying]);

  const title = currentTrack?.title || 'Slow Harbour';
  const artist = currentTrack?.artist || 'Mira Okafor';
  const trackId = currentTrack?.id;
  const effectiveDuration = duration > 0 ? duration : (currentTrack?.duration || 0);
  const effectiveTime = currentTime;
  const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (effectiveTime / effectiveDuration) * 100)) : 0;

  const isFavorited = favorites.some((f) => {
    if (!f) return false;
    const fId = (f.id || '').trim();
    if (trackId && fId && fId === trackId) return true;
    const fTitle = (f.title || (f as any).name || '').trim().toLowerCase();
    const curTitle = (title || '').trim().toLowerCase();
    return Boolean(curTitle && fTitle && fTitle === curTitle);
  });

  const toggleFavorite = () => {
    const cleanT = (title || '').trim().toLowerCase();
    const cleanId = (trackId || '').trim();

    const isMatch = (f: MusicTrack) => {
      if (!f) return false;
      const fId = (f.id || '').trim();
      if (cleanId && fId && fId === cleanId) return true;
      const fTitle = (f.title || (f as any).name || '').trim().toLowerCase();
      return Boolean(cleanT && fTitle && fTitle === cleanT);
    };

    let next: MusicTrack[];
    if (isFavorited) {
      next = favorites.filter((f) => !isMatch(f));
    } else {
      const newT: MusicTrack = {
        id: trackId || `fav_${title.replace(/\s+/g, '_')}`,
        title: title.trim(),
        artist: artist.trim(),
        duration: effectiveDuration || 210,
        stream_url: currentTrack?.stream_url || '',
        artwork_url:
          currentTrack?.artwork_url ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
        is_local: Boolean(currentTrack?.is_local),
        has_lyrics: Boolean(currentTrack?.has_lyrics),
      };
      next = [newT, ...favorites.filter((f) => !isMatch(f))];
    }
    setFavorites(next);
    saveLocalMusicFavorites(next);
    const p = getLocalProfile();
    if (p && !p.isGuest && (p.username || p.uid)) {
      syncToCloud(p.username || p.uid || '', { musicFavorites: next });
    }
    window.dispatchEvent(new CustomEvent('ovilo_music_favorites_updated'));
  };

  const handlePlayToggle = () => {
    if (!currentTrack) {
      playTrack({
        id: 'default_showcase_1',
        title: 'Slow Harbour',
        artist: 'Mira Okafor',
        duration: 221,
        stream_url: '',
        artwork_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
        is_local: false,
        has_lyrics: false,
      });
    } else {
      togglePlay();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || effectiveDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * effectiveDuration);
  };

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!volumeBarRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(ratio);
  };

  const currentVolumePercent = isMuted ? 0 : Math.round(volume * 100);

  return (
    <footer className="player">
      {/* 1. Left: Real Album Cover Thumbnail + Title + Artist + Heart */}
      <div className="np">
        <div
          onClick={() => window.dispatchEvent(new CustomEvent('ovilo_navigate_tab', { detail: 'music:nowplaying' }))}
          className="cv relative overflow-hidden flex-shrink-0 cursor-pointer"
          title="View Now Playing & Synced Lyrics"
          style={{ width: '50px', height: '50px', borderRadius: '13px' }}
        >
          <img
            src={currentTrack?.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop'}
            alt={title}
            className="w-full h-full object-cover rounded-[13px]"
          />
        </div>
        <div
          onClick={() => window.dispatchEvent(new CustomEvent('ovilo_navigate_tab', { detail: 'music:nowplaying' }))}
          className="cursor-pointer"
          style={{ minWidth: 0, maxWidth: '200px' }}
          title="View Now Playing"
        >
          <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{title}</b>
          <small style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{artist}</small>
        </div>
        <button
          onClick={toggleFavorite}
          className="p-1 border-0 bg-transparent cursor-pointer like sm rip"
          style={{ marginLeft: '6px' }}
        >
          <Heart
            className="w-4.5 h-4.5"
            style={{
              fill: isFavorited ? 'var(--kino-coral)' : 'none',
              color: isFavorited ? 'var(--kino-coral)' : 'var(--kino-on-var)',
            }}
          />
        </button>
        <button
          onClick={() => {
            startDownload({
              url: currentTrack?.stream_url || `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
              title: `${title} - ${artist}`,
              uploader: artist,
              thumbnail: currentTrack?.artwork_url || undefined,
              formatType: 'audio_mp3',
              formatLabel: 'MP3 High Quality',
            });
          }}
          className="p-1 border-0 bg-transparent text-[var(--kino-on-var)] hover:text-white cursor-pointer"
          style={{ marginLeft: '4px' }}
          title="Download track"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Middle: Controls + Progress Bar */}
      <div className="ctl">
        <div className="btnrow">
          <button
            onClick={toggleShuffle}
            className="border-0 bg-transparent cursor-pointer p-0"
            style={{ color: isShuffle ? 'var(--kino-yellow)' : 'var(--kino-on-var)' }}
          >
            <Shuffle className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={prevTrack}
            className="border-0 bg-transparent cursor-pointer p-0 text-[#f2efe9]"
          >
            <SkipBack className="w-4.5 h-4.5 fill-current" />
          </button>

          <button
            onClick={handlePlayToggle}
            className={`ppb sm ${isPlaying ? 'on' : ''} cursor-pointer`}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="l"></span>
            <span className="r"></span>
          </button>

          <button
            onClick={nextTrack}
            className="border-0 bg-transparent cursor-pointer p-0 text-[#f2efe9]"
          >
            <SkipForward className="w-4.5 h-4.5 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className="border-0 bg-transparent cursor-pointer p-0"
            style={{ color: repeatMode !== 'off' ? 'var(--kino-yellow)' : 'var(--kino-on-var)' }}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4.5 h-4.5" /> : <Repeat className="w-4.5 h-4.5" />}
          </button>
        </div>

        <div className="prog">
          <span>{formatTime(effectiveTime)}</span>
          <div
            ref={progressBarRef}
            onPointerDown={handleSeekPointerDown}
            className="bar"
          >
            <b style={{ width: `${progressPercent}%` }} />
          </div>
          <span>{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* 3. Right: Volume & Floating Notch Toggle */}
      <div className="vol flex items-center">
        <button
          onClick={toggleMute}
          className="border-0 bg-transparent cursor-pointer p-0"
          style={{ color: 'var(--kino-on-var)' }}
          title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
        </button>
        <div
          ref={volumeBarRef}
          onPointerDown={handleVolumePointerDown}
          className="bar"
        >
          <b style={{ width: `${currentVolumePercent}%` }} />
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event('ovilo_toggle_notch'))}
          className="nbtn"
          title="Toggle Floating Music Notch"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--kino-surface-top, #242429)',
            display: 'grid',
            placeItems: 'center',
            border: 'none',
            cursor: 'pointer',
            marginLeft: '10px',
            flexShrink: 0,
          }}
        >
          <span style={{ width: '12px', height: '4px', background: 'var(--kino-yellow, #ffd24d)', borderRadius: '2px' }} />
        </button>
      </div>
    </footer>
  );
};
