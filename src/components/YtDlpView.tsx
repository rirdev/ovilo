import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Film,
  Music,
  FolderOpen,
  Play,
  Trash2,
  AlertCircle,
  Loader2,
  Search,
  ClipboardPaste,
  Globe,
  HardDrive,
  ExternalLink,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  useDownloadManager,
  computeProgressMetrics,
} from '../services/downloadManager';
import {
  checkYtDlpStatus,
  getYtDlpInfo,
  YtDlpStatus,
  YtDlpMediaInfo,
} from '../services/ytdlp';

const SUPPORTED_PLATFORMS = [
  { name: 'YouTube', hint: 'Videos, Shorts & Playlists' },
  { name: 'TikTok', hint: 'No Watermark HD Videos' },
  { name: 'Instagram', hint: 'Reels, Posts & Stories' },
  { name: 'Twitter / X', hint: 'Clips & Video Threads' },
  { name: 'Reddit', hint: 'Video Posts & Clips' },
  { name: 'Facebook', hint: 'Public Videos & Reels' },
  { name: 'Twitch', hint: 'VODs & Stream Highlights' },
  { name: 'SoundCloud', hint: 'High-Res Audio Tracks' },
  { name: 'Vimeo', hint: 'Direct Filmmaker Streams' },
];

const renderPlatformIcon = (name: string) => {
  switch (name) {
    case 'YouTube':
      return (
        <svg className="w-3.5 h-3.5 text-red-500 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'TikTok':
      return (
        <svg className="w-3.5 h-3.5 text-cyan-400 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.34 22a6.34 6.34 0 0 0 6.33-6.33V9.05a8.21 8.21 0 0 0 4.92 1.63v-3.44a4.8 4.8 0 0 1-1-.55z"/>
        </svg>
      );
    case 'Instagram':
      return (
        <svg className="w-3.5 h-3.5 text-pink-500 fill-none stroke-current stroke-2 flex-shrink-0" viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      );
    case 'Twitter / X':
      return (
        <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'Reddit':
      return (
        <svg className="w-3.5 h-3.5 text-orange-500 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
      );
    case 'Facebook':
      return (
        <svg className="w-3.5 h-3.5 text-blue-500 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'Twitch':
      return (
        <svg className="w-3.5 h-3.5 text-purple-400 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
      );
    case 'SoundCloud':
      return (
        <svg className="w-3.5 h-3.5 text-amber-500 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M1.175 12.225c-.051 0-.094.044-.103.1l-.307 2.873c-.01.094.044.17.136.17l.274-.017.034-.017.307-2.924c.009-.077-.043-.162-.128-.17l-.213-.015zm1.143-.443c-.068 0-.12.06-.128.136l-.384 3.769c-.009.094.051.17.145.17l.452-.017.034-.017.384-3.871c0-.085-.06-.153-.145-.153l-.358-.017zm1.177-.384c-.085 0-.145.068-.153.162l-.375 4.545c0 .102.06.179.162.179l.52-.017.034-.017.384-4.673c0-.094-.068-.162-.162-.162l-.41-.017zm1.194-.281c-.102 0-.17.077-.179.179l-.358 5.108c0 .111.068.196.179.196l.58-.017.034-.017.375-5.244c0-.111-.077-.188-.179-.188l-.452-.017zm1.202-.094c-.111 0-.188.085-.188.196l-.315 5.432c0 .12.077.205.196.205l.623-.017.034-.017.333-5.585c0-.12-.085-.205-.196-.205l-.487-.009zm1.211-.23c-.12 0-.205.094-.205.213l-.222 5.858c0 .128.085.222.213.222l.665-.017.034-.017.239-6.037c0-.128-.094-.222-.222-.222l-.502-.015zm1.194-.375c-.137 0-.23.102-.23.239l-.128 6.429c0 .137.094.239.23.239l.7-.017.034-.017.145-6.626c0-.137-.102-.239-.239-.239l-.512-.007zm2.465-2.268c-.145 0-.247.111-.256.256l-.085 9.098c0 .153.111.264.256.264l.904-.017.034-.017.094-9.319c0-.145-.111-.265-.256-.265l-.691-.017zm-1.237 1.407c-.137 0-.239.111-.239.247l-.102 7.504c0 .145.102.247.239.247l.767-.017.034-.017.111-7.709c0-.145-.102-.247-.247-.247l-.563-.008zm4.784-2.822c-.443 0-.853.12-1.211.324-.307-.844-1.109-1.441-2.064-1.441-.213 0-.418.034-.614.094-.102.034-.162.128-.162.239l.068 11.085c.009.153.12.264.273.264l6.096-.017c2.251 0 4.077-1.825 4.077-4.077 0-2.226-1.782-4.042-4-4.077-.128-1.373-1.279-2.394-2.463-2.394z"/>
        </svg>
      );
    case 'Vimeo':
      return (
        <svg className="w-3.5 h-3.5 text-sky-400 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.6 8.793 3.834 7.489 3.01 7.489c-.179 0-.806.378-1.881 1.132L0 7.179c1.185-1.044 2.351-2.084 3.501-3.128 1.581-1.365 2.766-2.084 3.553-2.155 1.861-.179 3.007.828 3.447 3.016.48 2.385.815 4.013 1.007 4.887.616 3.024 1.294 4.536 2.034 4.536.577 0 1.285-.929 2.119-2.787.834-1.859 1.294-3.268 1.378-4.225.148-1.57-.447-2.355-1.785-2.355-.63 0-1.283.14-1.956.421 1.294-4.237 3.738-6.286 7.333-6.148 2.664.105 3.916 1.802 3.754 5.093z"/>
        </svg>
      );
    default:
      return null;
  }
};

export const YtDlpView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';

  const {
    downloads,
    activeDownloads,
    activeCount,
    startDownload,
    removeDownload,
    clearHistory,
    openFolder,
    openMedia,
  } = useDownloadManager();

  const [url, setUrl] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<
    'video_best' | 'video_1080' | 'video_720' | 'audio_mp3' | 'audio_flac'
  >('video_best');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<YtDlpMediaInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<YtDlpStatus | null>(null);
  const [isStartingDownload, setIsStartingDownload] = useState(false);

  // Check engine status once
  useEffect(() => {
    checkYtDlpStatus()
      .then((status) => setEngineStatus(status))
      .catch((err) => console.warn('Engine check failed:', err));
  }, []);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setUrl(text.trim());
        handleInspectUrl(text.trim());
      }
    } catch {
      // clipboard fallback
    }
  };

  const handleInspectUrl = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) return;

    setIsFetchingInfo(true);
    setInfoError(null);
    setPreviewInfo(null);

    try {
      const info = await getYtDlpInfo(targetUrl);
      setPreviewInfo(info);
    } catch (err: any) {
      setInfoError(
        err?.toString() ||
          'Failed to analyze media link. Make sure the link is public or click Download directly.'
      );
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleStartDownload = async () => {
    if (isStartingDownload) return;
    const targetUrl = url.trim();
    if (!targetUrl) return;

    const formatLabels: Record<string, string> = {
      video_best: 'Best MP4 / 4K',
      video_1080: '1080p Full HD MP4',
      video_720: '720p HD MP4',
      audio_mp3: 'MP3 320kbps Audio',
      audio_flac: 'Lossless FLAC Audio',
    };

    const cleanTitle = previewInfo?.title || targetUrl.split('/').pop() || 'Web Video Download';

    setIsStartingDownload(true);
    try {
      await startDownload({
        url: targetUrl,
        title: cleanTitle,
        formatType: selectedFormat,
        formatLabel: formatLabels[selectedFormat] || 'MP4',
        thumbnail: previewInfo?.thumbnail,
        uploader: previewInfo?.uploader,
      });

      // Clear input fields
      setUrl('');
      setPreviewInfo(null);
      setInfoError(null);
    } catch (err: any) {
      setInfoError('Could not start download: ' + err?.toString());
    } finally {
      setIsStartingDownload(false);
    }
  };

  // Aggregate download speed string for header badge
  const activeSpeed = activeDownloads.find((d) => d.speed && d.speed !== 'Connecting...')?.speed;

  return (
    <div
      className={`min-h-full p-4 sm:p-7 space-y-6 select-none transition-colors ${
        isLight
          ? 'bg-[#F4F5F7] text-neutral-900'
          : isCobalt
          ? 'bg-[#090A0F] text-white'
          : 'bg-[#0B0B0D] text-white'
      }`}
    >
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-bold ${
              isLight
                ? 'bg-neutral-900 text-white border-neutral-800 shadow-sm'
                : isCobalt
                ? 'bg-[#2F6BFE] text-white border-[#2F6BFE]'
                : 'bg-[#DCFF7D] text-[#0B0B0D] border-[#DCFF7D]'
            }`}
          >
            <DownloadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`text-2xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                YT-DLP Universal Downloader
              </h1>
              {engineStatus?.available ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Engine Active v{engineStatus.version || '2026'}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400">
                  Active
                </span>
              )}
              {activeCount > 0 && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-[#DCFF7D]/20 text-[#DCFF7D] border border-[#DCFF7D]/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {activeCount} Downloading
                  {activeSpeed && ` • ${activeSpeed}`}
                </span>
              )}
            </div>
            <p className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              High-speed video & audio extraction powered by native YT-DLP engine and FFmpeg
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openFolder()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
              isLight
                ? 'bg-white border-neutral-300 text-neutral-900 hover:bg-neutral-100 shadow-sm'
                : isCobalt
                ? 'bg-[#17181D] border-white/8 text-white hover:bg-[#1F2027]'
                : 'bg-[#151619] border-white/8 text-neutral-200 hover:text-white hover:bg-[#1E1E23]'
            }`}
          >
            <FolderOpen
              className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-[#DCFF7D]'}`}
            />
            <span>Open ~/Downloads/Ovilo</span>
          </button>
        </div>
      </div>

      {/* 2. Input & Format Selection Card */}
      <div
        className={`rounded-3xl p-6 sm:p-7 space-y-5 border transition-colors ${
          isLight
            ? 'bg-white border-neutral-200 shadow-sm'
            : 'bg-[#17181d] border-white/8'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-extrabold tracking-wider uppercase ${
              isLight ? 'text-neutral-800' : 'text-neutral-200'
            }`}
          >
            Paste Any Media Link
          </span>
          <span className="text-[11px] text-neutral-400">
            Paste URL from YouTube, Instagram, TikTok, Twitter/X, Reddit, Vimeo...
          </span>
        </div>

        {/* Input bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setInfoError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInspectUrl();
                }
              }}
              placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/reel/..."
              className={`w-full rounded-2xl px-5 py-3.5 pr-24 text-sm transition-colors focus:outline-none border ${
                isLight
                  ? 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900'
                  : 'bg-[#090A0F] border-white/10 text-white placeholder-neutral-500 focus:border-white/30'
              }`}
            />
            <button
              type="button"
              onClick={handlePaste}
              title="Paste from clipboard"
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 border-neutral-300'
                  : 'bg-white/10 hover:bg-white/15 text-neutral-300 border-white/10'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste</span>
            </button>
          </div>

          <button
            type="button"
            disabled={!url.trim() || isFetchingInfo}
            onClick={() => handleInspectUrl()}
            className={`px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-white border-neutral-300 text-neutral-900 hover:bg-neutral-100 shadow-sm'
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            {isFetchingInfo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Inspecting...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-emerald-500" />
                <span>Inspect Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!url.trim() || isStartingDownload}
            onClick={handleStartDownload}
            className={`px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-neutral-900 border-neutral-900 text-white hover:bg-black shadow-sm'
                : isCobalt
                ? 'bg-[#2F6BFE] border-[#2F6BFE] text-white hover:bg-[#437BFE]'
                : 'bg-[#DCFF7D] border-[#DCFF7D] text-[#0B0B0D] hover:bg-[#cbf764]'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{isStartingDownload ? 'Starting...' : 'Download'}</span>
          </button>
        </div>

        {/* Error notice if inspect failed */}
        {infoError && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-2">{infoError}</span>
          </div>
        )}

        {/* Quality / Format Presets */}
        <div className="space-y-2 pt-2 border-t border-white/6">
          <span className={`text-xs font-semibold ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
            Select Download Quality Preset:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {[
              { id: 'video_best', label: 'Max Quality (4K/2K/1080p)', sub: 'Best MP4 + Audio', icon: Film },
              { id: 'video_1080', label: '1080p Full HD', sub: 'Standard MP4 60fps', icon: Film },
              { id: 'video_720', label: '720p Fast HD', sub: 'Compact MP4', icon: Film },
              { id: 'audio_mp3', label: 'High-Res MP3', sub: '320kbps Audio', icon: Music },
              { id: 'audio_flac', label: 'Lossless FLAC', sub: 'Studio Audio', icon: Music },
            ].map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              const IconComp = fmt.icon;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.id as any)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? isLight
                        ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm'
                        : isCobalt
                        ? 'bg-[#1F2027] border-[#2F6BFE] text-white'
                        : 'bg-[#1C1D22] border-[#DCFF7D] text-white'
                      : isLight
                      ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800'
                      : 'bg-black/20 hover:bg-black/40 border-white/6 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <IconComp
                      className={`w-4 h-4 ${
                        isSelected
                          ? isLight
                            ? 'text-emerald-400'
                            : isCobalt
                            ? 'text-[#2F6BFE]'
                            : 'text-[#DCFF7D]'
                          : 'text-neutral-400'
                      }`}
                    />
                    {isSelected && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          isLight
                            ? 'text-emerald-400'
                            : isCobalt
                            ? 'text-[#2F6BFE]'
                            : 'text-[#DCFF7D]'
                        }`}
                      />
                    )}
                  </div>
                  <p className="text-xs font-bold line-clamp-1">{fmt.label}</p>
                  <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">{fmt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inspected Media Preview Card (If loaded) */}
        {previewInfo && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row gap-4 items-start transition-all ${
              isLight ? 'bg-neutral-50 border-neutral-300 shadow-sm' : 'bg-[#090A0F] border-white/10'
            }`}
          >
            {previewInfo.thumbnail && (
              <div className="relative w-full sm:w-48 h-28 rounded-xl overflow-hidden bg-black/50 flex-shrink-0 border border-white/10">
                <img
                  src={previewInfo.thumbnail}
                  alt={previewInfo.title}
                  className="w-full h-full object-cover"
                />
                {previewInfo.duration && (
                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white">
                    {formatDuration(previewInfo.duration)}
                  </span>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className={`text-sm font-bold line-clamp-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                {previewInfo.title}
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                {previewInfo.uploader ? `Channel: ${previewInfo.uploader}` : 'Detected Stream Media'}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isStartingDownload}
                  onClick={handleStartDownload}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? 'bg-neutral-900 text-white border-neutral-900 hover:bg-black'
                      : isCobalt
                      ? 'bg-[#2F6BFE] text-white border-[#2F6BFE]'
                      : 'bg-[#DCFF7D] text-[#0B0B0D] border-[#DCFF7D]'
                  }`}
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>{isStartingDownload ? 'Starting...' : 'Start Download'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Downloads Queue & History */}
      <div
        className={`rounded-3xl p-6 sm:p-7 space-y-4 border transition-colors ${
          isLight
            ? 'bg-white border-neutral-200 shadow-sm'
            : 'bg-[#17181d] border-white/8'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-neutral-400" />
            <h2 className={`text-sm font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
              Queue & Transfers
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400">
              {downloads.length} {downloads.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {downloads.length > 0 && (
            <button
              type="button"
              onClick={() => clearHistory()}
              className="text-xs text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              Clear Finished
            </button>
          )}
        </div>

        {downloads.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-neutral-500">
            <DownloadCloud className="w-8 h-8 stroke-1 text-neutral-400 opacity-60" />
            <p className="text-xs font-medium">No active or past downloads yet</p>
            <p className="text-[11px] text-neutral-400 max-w-sm">
              Paste any video or audio link above to download at maximum speed into your local library.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {downloads.map((item) => {
              const isAudio = item.formatType.startsWith('audio');
              const isDownloading =
                item.status === 'downloading' ||
                item.status === 'fetching' ||
                item.status === 'processing';
              const isCompleted = item.status === 'completed';
              const isError = item.status === 'error';

              const metrics = computeProgressMetrics(
                item.progress,
                item.speed,
                item.totalSize,
                item.eta
              );

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex flex-col gap-3 transition-colors ${
                    isLight
                      ? 'bg-white border-neutral-200 shadow-sm hover:border-neutral-300'
                      : 'bg-[#101013] border-white/6 hover:border-white/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {item.thumbnail ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border font-bold ${
                            isAudio
                              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                              : isLight
                              ? 'bg-neutral-200 border-neutral-300 text-neutral-800'
                              : isCobalt
                              ? 'bg-[#2F6BFE]/15 border-[#2F6BFE]/30 text-[#6993FF]'
                              : 'bg-[#DCFF7D]/15 border-[#DCFF7D]/30 text-[#DCFF7D]'
                          }`}
                        >
                          {isAudio ? <Music className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-bold truncate leading-snug ${
                            isLight ? 'text-neutral-900' : 'text-white'
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-1 flex flex-wrap items-center gap-2 font-mono">
                          <span
                            className={`uppercase font-bold px-1.5 py-0.5 rounded text-[10px] ${
                              isLight
                                ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                                : 'bg-white/5 text-neutral-300 border border-white/10'
                            }`}
                          >
                            {item.formatLabel}
                          </span>

                          {isDownloading && metrics.speed && (
                            <span
                              className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5 ${
                                isLight
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-[#DCFF7D]/20 text-[#DCFF7D] border border-[#DCFF7D]/30'
                              }`}
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                              {metrics.speed.replace(/^↓\s*/, '')}
                            </span>
                          )}

                          {isCompleted && (
                            <span className="text-emerald-500 font-bold">• Completed</span>
                          )}

                          {isError && (
                            <span className="text-red-400 font-bold">• Download Failed</span>
                          )}
                        </div>

                        {item.errorMessage && (
                          <p className="text-[11px] text-red-400 mt-1 line-clamp-1">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                      {isCompleted && item.filePath && (
                        <button
                          type="button"
                          onClick={() => openMedia(item.filePath!)}
                          title="Play / Open Media"
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-neutral-900 text-white hover:bg-black border-neutral-900'
                              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Open</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openFolder()}
                        title="Show in Folder"
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-white border-neutral-300 hover:bg-neutral-100 text-neutral-700'
                            : 'bg-white/5 border-white/10 hover:bg-white/15 text-neutral-300'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeDownload(item.id)}
                        title="Remove from List"
                        className="p-2 rounded-xl border border-transparent hover:border-red-500/20 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress & Speed Breakdown */}
                  {isDownloading && (
                    <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          {metrics.downloadedStr && metrics.totalStr ? (
                            <span
                              className={`font-bold ${
                                isLight ? 'text-neutral-800' : 'text-neutral-200'
                              }`}
                            >
                              {metrics.downloadedStr} of {metrics.totalStr}
                            </span>
                          ) : item.totalSize && item.totalSize !== '--' && item.totalSize !== 'Starting' ? (
                            <span className="font-semibold text-neutral-400">
                              Total: {item.totalSize}
                            </span>
                          ) : (
                            <span className="text-neutral-400">Connecting to server...</span>
                          )}

                          {metrics.remainingStr && (
                            <span className="text-neutral-500 text-[11px]">
                              ({metrics.remainingStr} remaining)
                            </span>
                          )}

                          {metrics.etaStr && (
                            <span className="text-neutral-500 text-[11px]">
                              • {metrics.etaStr} left
                            </span>
                          )}
                        </div>

                        <span
                          className={`font-black text-sm ${
                            isLight
                              ? 'text-emerald-700'
                              : isCobalt
                              ? 'text-[#6993FF]'
                              : 'text-[#DCFF7D]'
                          }`}
                        >
                          {metrics.percentStr}
                        </span>
                      </div>

                      <div
                        className={`w-full h-2.5 rounded-full overflow-hidden ${
                          isLight ? 'bg-neutral-200' : 'bg-neutral-800'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${
                            isLight
                              ? 'bg-emerald-600'
                              : isCobalt
                              ? 'bg-[#2F6BFE]'
                              : 'bg-[#DCFF7D]'
                          }`}
                          style={{
                            width: `${Math.max(3, metrics.percent)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Supported Platforms Footer */}
      <div
        className={`p-4 rounded-2xl border transition-colors ${
          isLight
            ? 'bg-white/80 border-neutral-200 text-neutral-600 shadow-sm'
            : isCobalt
            ? 'bg-[#121318]/60 border-white/6 text-neutral-400'
            : 'bg-[#101013]/60 border-white/6 text-neutral-400'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            <span
              className={`text-[11px] font-bold tracking-wider uppercase ${
                isLight ? 'text-neutral-800' : 'text-neutral-300'
              }`}
            >
              Supported Media Networks
            </span>
            <span className="text-[10px] text-neutral-500">• 1,000+ Platforms</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {SUPPORTED_PLATFORMS.map((plat) => (
              <span
                key={plat.name}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                  isLight
                    ? 'bg-neutral-100 border-neutral-200 text-neutral-800'
                    : 'bg-white/4 border-white/6 text-neutral-300'
                }`}
                title={plat.hint}
              >
                {renderPlatformIcon(plat.name)}
                <span>{plat.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
