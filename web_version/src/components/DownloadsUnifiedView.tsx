import React, { useState, useEffect } from 'react';
import {
  Download,
  Film,
  Music,
  Link as LinkIcon,
  FolderOpen,
  Loader2,
  Gamepad2,
  FileText,
  Smartphone,
  Terminal,
  RefreshCw,
  Search,
  X,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  Disc,
  Play,
} from 'lucide-react';
import {
  useDownloadManager,
  formatBytes,
  getDiskDownloads,
  deleteDiskDownload,
  DiskFileItem,
} from '../services/downloadManager';
import {
  getYtDlpInfo,
  YtDlpMediaInfo,
} from '../services/ytdlp';
import {
  fetchBdixData,
  BdixPackage,
  getThumbnailCandidates,
  formatMediaTitle,
} from '../services/bdixApi';
import { KinoDownloadButton } from './KinoDownloadButton';
import { isTauri } from '../services/platform';

export interface DownloadsUnifiedViewProps {
  initialSubTab?: 'downloads' | 'ytdlp' | 'ftp';
  initialSearchQuery?: string;
  onClearInitialSearchQuery?: () => void;
  onPlayDirectVideo?: (title: string, streamUrl: string, poster?: string) => void;
}

// Progressive thumbnail candidate component for BDIX FTP
const FtpMediaThumbnail: React.FC<{ item: BdixPackage }> = ({ item }) => {
  const candidates = getThumbnailCandidates(item);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failedAll, setFailedAll] = useState(candidates.length === 0);

  const currentSrc = candidates[candidateIndex];

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setFailedAll(true);
    }
  };

  if (failedAll || !currentSrc) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-[#1c1c20] text-neutral-400">
        {item.category === 'game' ? (
          <Gamepad2 className="w-6 h-6 stroke-[1.5] text-[var(--kino-mint)]" />
        ) : item.category === 'app' ? (
          <Smartphone className="w-6 h-6 stroke-[1.5] text-[var(--kino-peri)]" />
        ) : item.category === 'software' ? (
          <Terminal className="w-6 h-6 stroke-[1.5] text-[var(--kino-yellow)]" />
        ) : item.category === 'document' ? (
          <FileText className="w-6 h-6 stroke-[1.5] text-neutral-400" />
        ) : (
          <Film className="w-6 h-6 stroke-[1.5] text-[var(--kino-coral)]" />
        )}
        <span className="text-[9px] font-mono mt-1 uppercase tracking-wider text-neutral-500">
          {item.primaryExtension || 'FILE'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={item.title}
      onError={handleImageError}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
  );
};

export const DownloadsUnifiedView: React.FC<DownloadsUnifiedViewProps> = ({
  initialSubTab = 'downloads',
  initialSearchQuery = '',
  onClearInitialSearchQuery,
  onPlayDirectVideo,
}) => {
  const {
    downloads,
    activeCount,
    startDownload,
    openFolder,
    removeDownload,
    clearHistory,
  } = useDownloadManager();

  const [activeTab, setActiveTab] = useState<'downloads' | 'ftp'>(
    initialSubTab === 'ftp' || Boolean(initialSearchQuery) ? 'ftp' : 'downloads'
  );

  // YT-DLP Downloader State
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<YtDlpMediaInfo | null>(null);
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('video');
  const [selectedQuality, setSelectedQuality] = useState('1080p');

  // FTP Explorer State - default to 'all' servers so searching finds releases across both servers
  const [activeServer, setActiveServer] = useState<'all' | 'server1' | 'server2'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [ftpSearchQuery, setFtpSearchQuery] = useState(initialSearchQuery || '');
  const [ftpFiles, setFtpFiles] = useState<BdixPackage[]>([]);
  const [loadingFtp, setLoadingFtp] = useState(false);
  const [selectedFilePkg, setSelectedFilePkg] = useState<BdixPackage | null>(null);

  // Play direct video stream from BDIX FTP
  const handlePlayFtp = (
    pkg: BdixPackage,
    file?: { name: string; url: string; extension: string }
  ) => {
    const targetFile = file || (pkg.files && pkg.files[0]);
    if (!targetFile || !targetFile.url) return;
    const title = targetFile.name ? targetFile.name.replace(/\.[^/.]+$/, '') : pkg.title;
    const poster = pkg.thumbnailUrl || undefined;

    if (onPlayDirectVideo) {
      onPlayDirectVideo(title, targetFile.url, poster);
    } else {
      window.dispatchEvent(
        new CustomEvent('ovilo_play_ftp_video', {
          detail: { title, url: targetFile.url, poster },
        })
      );
    }
  };

  const handlePlayExternalFtp = async (
    pkg: BdixPackage,
    file?: { name: string; url: string; extension: string }
  ) => {
    const targetFile = file || (pkg.files && pkg.files[0]);
    if (!targetFile || !targetFile.url) return;
    const title = targetFile.name ? targetFile.name.replace(/\.[^/.]+$/, '') : pkg.title;
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('play_in_external_player', {
          url: targetFile.url,
          title: `${title} - Ovilo Stream`,
        });
        return;
      } catch (e) {
        console.warn('External play error:', e);
      }
    }
    handlePlayFtp(pkg, file);
  };

  // Disk downloads list
  const [diskFiles, setDiskFiles] = useState<DiskFileItem[]>([]);

  // Fetch disk downloads
  const refreshDiskDownloads = async () => {
    try {
      const files = await getDiskDownloads();
      setDiskFiles(files);
    } catch {}
  };

  useEffect(() => {
    refreshDiskDownloads();
    const interval = setInterval(refreshDiskDownloads, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch BDIX FTP items with full-text backend query support
  const loadFtp = (queryOverride?: string) => {
    setLoadingFtp(true);
    const q = (queryOverride !== undefined ? queryOverride : ftpSearchQuery).trim();
    fetchBdixData({
      source: activeServer !== 'all' ? activeServer : undefined,
      category: activeCategory !== 'all' ? activeCategory : undefined,
      q: q || undefined,
      limit: 60,
    })
      .then((res) => {
        if (res.packages) setFtpFiles(res.packages);
        setLoadingFtp(false);
      })
      .catch(() => setLoadingFtp(false));
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadFtp(ftpSearchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [ftpSearchQuery, activeServer, activeCategory]);

  useEffect(() => {
    if (initialSearchQuery) {
      setFtpSearchQuery(initialSearchQuery);
      setActiveTab('ftp');
      loadFtp(initialSearchQuery);
      onClearInitialSearchQuery?.();
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    const handleFtpSearchEvent = (e: any) => {
      const q = e.detail || '';
      if (q) {
        setActiveTab('ftp');
        setFtpSearchQuery(q);
        loadFtp(q);
      }
    };
    window.addEventListener('ovilo_open_ftp_search', handleFtpSearchEvent);
    return () => window.removeEventListener('ovilo_open_ftp_search', handleFtpSearchEvent);
  }, []);

  // Handle URL fetch
  const handleFetchInfo = async () => {
    if (!urlInput.trim()) return;
    setIsFetchingInfo(true);
    try {
      const info = await getYtDlpInfo(urlInput.trim());
      setMediaInfo(info);
      setDownloadType('video');
      setSelectedQuality('1080p');
    } catch (e) {
      console.warn('YT-DLP fetch error:', e);
    } finally {
      setIsFetchingInfo(false);
    }
  };

  useEffect(() => {
    const handleUrlEvent = (e: any) => {
      const targetUrl = e.detail || '';
      if (targetUrl) {
        setUrlInput(targetUrl);
        setIsFetchingInfo(true);
        getYtDlpInfo(targetUrl)
          .then((info) => {
            setMediaInfo(info);
            setDownloadType('video');
            setSelectedQuality('1080p');
          })
          .catch(console.warn)
          .finally(() => setIsFetchingInfo(false));
      }
    };
    window.addEventListener('ovilo_fetch_download_url', handleUrlEvent);
    return () => window.removeEventListener('ovilo_fetch_download_url', handleUrlEvent);
  }, []);

  // Trigger Download from YT-DLP
  const handleStartDownload = async () => {
    const downloadUrl = (urlInput.trim() || mediaInfo?.webpage_url || '').trim();
    if (!downloadUrl) return;

    try {
      let targetFormatType = 'video_1080';
      let targetFormatLabel = '1080p Full HD';

      if (downloadType === 'audio') {
        if (selectedQuality.includes('FLAC')) {
          targetFormatType = 'audio_flac';
          targetFormatLabel = 'FLAC Lossless Audio';
        } else if (selectedQuality.includes('AAC')) {
          targetFormatType = 'audio_m4a';
          targetFormatLabel = 'AAC / M4A Audio';
        } else {
          targetFormatType = 'audio_mp3';
          targetFormatLabel = 'MP3 320k Audio';
        }
      } else {
        if (selectedQuality.includes('2160') || selectedQuality.includes('4K')) {
          targetFormatType = 'video_2160';
          targetFormatLabel = '4K Ultra HD (2160p)';
        } else if (selectedQuality.includes('1440') || selectedQuality.includes('2K')) {
          targetFormatType = 'video_1440';
          targetFormatLabel = '2K Quad HD (1440p)';
        } else if (selectedQuality.includes('1080')) {
          targetFormatType = 'video_1080';
          targetFormatLabel = '1080p Full HD';
        } else if (selectedQuality.includes('720')) {
          targetFormatType = 'video_720';
          targetFormatLabel = '720p HD';
        } else if (selectedQuality.includes('480')) {
          targetFormatType = 'video_480';
          targetFormatLabel = '480p SD';
        }
      }

      const dlId = await startDownload({
        url: downloadUrl,
        title: mediaInfo?.title || 'Web Media Download',
        formatType: targetFormatType,
        formatLabel: targetFormatLabel,
        thumbnail: mediaInfo?.thumbnail,
        uploader: mediaInfo?.uploader,
      });

      refreshDiskDownloads();
      return dlId;
    } catch (err) {
      console.warn('Start download error:', err);
    } finally {
      // Clear URL input and preview card so the link and card go away immediately
      setUrlInput('');
      setMediaInfo(null);
    }
  };

  // Download specific file directly from BDIX FTP
  const handleDownloadFtpFile = async (
    pkg: BdixPackage,
    file: { name: string; url: string; extension: string }
  ) => {
    if (!file || !file.url) return;
    try {
      const serverLabel = pkg.source === 'server1' ? 'High-Speed Server 1' : 'High-Speed Server 2';
      await startDownload({
        url: file.url,
        title: file.name ? file.name.replace(/\.[^/.]+$/, '') : pkg.title,
        formatType: file.extension || 'file',
        formatLabel: `${serverLabel} (${(file.extension || 'FILE').toUpperCase()})`,
        thumbnail: pkg.thumbnailUrl || undefined,
      });
      setActiveTab('downloads');
      refreshDiskDownloads();
    } catch (err) {
      console.warn('FTP download start error:', err);
    }
  };

  // Download from BDIX FTP (prompt if multiple files exist)
  const handleDownloadFtp = async (pkg: BdixPackage) => {
    if (!pkg.files || pkg.files.length === 0) return;
    if (pkg.files.length === 1) {
      handleDownloadFtpFile(pkg, pkg.files[0]);
    } else {
      setSelectedFilePkg(pkg);
    }
  };

  const totalUsedStorage = diskFiles.reduce((acc, f) => acc + (f.size_bytes || 0), 0);

  const formatDuration = (sec?: number) => {
    if (!sec) return '1:52:08';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const filteredFtpFiles = ftpFiles;

  return (
    <div className="w-full select-none font-['DM_Sans',sans-serif] pb-20">
      {/* 1. Header with View Switcher Chips & Stats */}
      <div className="kino-dh flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold whitespace-nowrap">Downloads</h1>
          <div className="chips">
            <button
              type="button"
              onClick={() => setActiveTab('downloads')}
              className={`chip cursor-pointer ${activeTab === 'downloads' ? 'on' : ''}`}
            >
              Downloader &amp; Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ftp')}
              className={`chip cursor-pointer ${activeTab === 'ftp' ? 'on' : ''}`}
            >
              BDIX FTP Servers ({ftpFiles.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="pill2" style={{ color: 'var(--kino-mint)' }}>
            {activeCount} active
          </span>
          <span className="pill2">
            {formatBytes(totalUsedStorage)} stored
          </span>
          <button
            onClick={() => openFolder()}
            className="pill2 cursor-pointer flex items-center gap-1.5 hover:bg-white/10"
            title="Open local download folder"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open Folder
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DOWNLOADER & QUEUE VIEW (Kino layout)                            */}
      {/* ========================================================================= */}
      {activeTab === 'downloads' && (
        <div className="space-y-4">
          {/* Top Downloader Box */}
          <div className="kino-box" style={{ padding: '18px 20px' }}>
            <div className="kino-ph">
              <div className="ico" style={{ background: 'var(--kino-coral)' }}>
                <Download className="w-5 h-5 text-[#141414]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>YT-DLP Downloader</h3>
                <small>Videos &amp; audio from 1,000+ streaming sites</small>
              </div>
              <span className="pill2 ml-auto shrink-0">Native yt-dlp</span>
            </div>

            {/* URL Input Bar */}
            <div className="kino-url flex items-center gap-2">
              <div className="in flex items-center gap-2 min-w-0 flex-1">
                <LinkIcon className="w-4 h-4 text-[#a9a7a2] shrink-0" />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
                  placeholder="Paste YouTube, Vimeo, Twitter or direct media URL..."
                  className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-neutral-500 font-sans"
                />
                {urlInput.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput('');
                      setMediaInfo(null);
                    }}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer bg-transparent border-0"
                    title="Clear link"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleFetchInfo}
                disabled={isFetchingInfo || !urlInput.trim()}
                className="kino-btn y rip px-4 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isFetchingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
              </button>
            </div>

            {/* Video Preview Card with Real High-Res Thumbnail - Only shown when mediaInfo is loaded */}
            {mediaInfo && (
              <>
                <div className="kino-vid relative">
                  <button
                    type="button"
                    onClick={() => setMediaInfo(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-neutral-300 hover:text-white cursor-pointer border-0 z-10 transition-colors"
                    title="Dismiss preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div
                    className="th"
                    style={{
                      backgroundImage: mediaInfo?.thumbnail
                        ? `url(${mediaInfo.thumbnail})`
                        : 'url(https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=80)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <em>{formatDuration(mediaInfo?.duration)}</em>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {mediaInfo.title}
                    </b>
                    <small style={{ color: 'var(--kino-on-var)' }}>
                      {mediaInfo?.uploader ? `Uploaded by ${mediaInfo.uploader}` : 'Direct Stream'}
                    </small>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--kino-yellow)', fontWeight: 600 }}>
                      Available: 2160p 4K · 1440p · 1080p HD · 720p · MP3 320k · FLAC
                    </div>
                  </div>
                </div>

                {/* Format & Quality Controls */}
                <div className="w-full flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/10 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Video / Audio Switcher */}
                    <div className="flex items-center bg-[var(--surface-hi,#161d2d)] p-1 rounded-xl border border-[var(--line,#2b3957)] gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadType('video');
                          if (['MP3 320k', 'FLAC', 'AAC'].includes(selectedQuality)) {
                            setSelectedQuality('1080p');
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all border-none ${
                          downloadType === 'video'
                            ? 'bg-[var(--yellow,#8f9cff)] text-black shadow-sm font-extrabold'
                            : 'bg-transparent text-[var(--on-var,#8b9bb4)] hover:text-white'
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Video</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadType('audio');
                          if (!['MP3 320k', 'FLAC', 'AAC'].includes(selectedQuality)) {
                            setSelectedQuality('MP3 320k');
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all border-none ${
                          downloadType === 'audio'
                            ? 'bg-[var(--yellow,#8f9cff)] text-black shadow-sm font-extrabold'
                            : 'bg-transparent text-[var(--on-var,#8b9bb4)] hover:text-white'
                        }`}
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>Audio</span>
                      </button>
                    </div>

                    {/* Quality Pills */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {downloadType === 'video' ? (
                        [
                          { id: '2160p', label: '4K' },
                          { id: '1440p', label: '2K' },
                          { id: '1080p', label: '1080p' },
                          { id: '720p', label: '720p' },
                          { id: '480p', label: '480p' },
                        ].map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setSelectedQuality(q.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                              selectedQuality === q.id
                                ? 'bg-[var(--yellow,#8f9cff)] text-black border-[var(--yellow,#8f9cff)]'
                                : 'bg-transparent text-neutral-400 border-white/10 hover:text-white'
                            }`}
                          >
                            {q.label}
                          </button>
                        ))
                      ) : (
                        [
                          { id: 'MP3 320k', label: 'MP3 320k' },
                          { id: 'FLAC', label: 'FLAC' },
                          { id: 'AAC', label: 'AAC' },
                        ].map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setSelectedQuality(q.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                              selectedQuality === q.id
                                ? 'bg-[var(--yellow,#8f9cff)] text-black border-[var(--yellow,#8f9cff)]'
                                : 'bg-transparent text-neutral-400 border-white/10 hover:text-white'
                            }`}
                          >
                            {q.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Exact Kino Showcase Download Button (.dlb) */}
                  <KinoDownloadButton
                    onDownload={handleStartDownload}
                    label="Download"
                  />
                </div>
              </>
            )}
          </div>

          {/* Active & Disk Downloads */}
          <div className="kino-box" style={{ padding: '20px 24px' }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Active &amp; Recent Downloads</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                  {downloads.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {downloads.some((d) => d.status === 'completed' || d.status === 'error') && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-xs text-neutral-300 hover:text-rose-400 flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl border border-white/10 hover:border-rose-500/30 transition-colors"
                    title="Clear completed and failed downloads from list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Finished</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={refreshDiskDownloads}
                  className="text-xs text-[#a9a7a2] hover:text-white flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Active Downloads List */}
            {downloads.length > 0 && (
              <div className="space-y-2.5 mb-6">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Tasks In Queue ({downloads.length})
                </div>
                {downloads.map((d) => {
                  const isDone = d.status === 'completed';
                  const isErr = d.status === 'error';
                  const isDl = d.status === 'downloading' || d.status === 'fetching' || d.status === 'processing';

                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3.5 p-3 rounded-2xl bg-[var(--surface-hi,#161a24)] border border-white/5 hover:border-white/10 transition-all group"
                    >
                      <div
                        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800 border border-white/5 relative"
                        style={{
                          backgroundImage: d.thumbnail
                            ? `url(${d.thumbnail})`
                            : 'url(https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=100&auto=format&fit=crop&q=80)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-sm font-bold text-white truncate block">
                            {d.title}
                          </b>
                          <span className="text-xs font-mono font-bold text-neutral-300 flex-shrink-0">
                            {isErr ? '' : `${Math.round(d.progress)}%`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <small
                            className={`text-xs truncate block ${
                              isErr ? 'text-rose-400 font-semibold' : 'text-neutral-400'
                            }`}
                          >
                            {isDone
                              ? `${
                                  d.totalSize && d.totalSize !== 'Starting' && d.totalSize !== 'Completed'
                                    ? d.totalSize + ' · '
                                    : ''
                                }Saved in ~/Downloads/Ovilo`
                              : isDl
                              ? `${d.speed || 'Downloading'} · ETA: ${d.eta || '--'}`
                              : isErr
                              ? `Failed: ${d.errorMessage || 'Network or extractor error'}`
                              : d.status}
                          </small>
                          {d.formatLabel && (
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase flex-shrink-0">
                              {d.formatLabel}
                            </span>
                          )}
                        </div>

                        {!isErr && (
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isDone ? 'bg-[var(--kino-mint,#5be1b8)]' : 'bg-[var(--kino-yellow,#ffd24d)]'
                              }`}
                              style={{ width: `${Math.max(3, Math.min(100, d.progress))}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {isDone && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                        {isDl && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-[#ffd24d] border border-yellow-500/30 flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Downloading
                          </span>
                        )}
                        {isErr && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Error
                          </span>
                        )}

                        {isDone && (
                          <button
                            type="button"
                            onClick={() => openFolder()}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white cursor-pointer border border-white/10 transition-colors"
                            title="Open in Downloads folder"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isErr && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const clean = d.title
                                  .replace(/\b(1080p|720p|480p|2160p|4k|hdtc|web-?dl|bluray|x264|x265|hevc|dual audio|hindi|clean|cam|imax|v[0-9]+)\b/gi, '')
                                  .replace(/[\[\]\(\)\-_]/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim();
                                const searchQuery = clean.length >= 2 ? clean : d.title;
                                setActiveTab('ftp');
                                setFtpSearchQuery(searchQuery);
                                loadFtp(searchQuery);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-[#ffd24d] hover:bg-[#ffe066] text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all border-0 shadow-sm"
                              title="Search working mirrors for this release in BDIX FTP"
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>Find Mirror</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                removeDownload(d.id);
                                startDownload({
                                  url: d.url,
                                  title: d.title,
                                  uploader: d.uploader,
                                  thumbnail: d.thumbnail,
                                  formatType: d.formatType,
                                  formatLabel: d.formatLabel,
                                });
                              }}
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white cursor-pointer border border-white/10 transition-colors"
                              title="Retry download"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            if (d.filePath) {
                              try {
                                await deleteDiskDownload(d.filePath);
                              } catch {}
                            }
                            removeDownload(d.id);
                            refreshDiskDownloads();
                          }}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 cursor-pointer border border-white/10 hover:border-rose-500/30 transition-colors"
                          title="Remove from list"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Saved Files on Disk */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Saved Files on Disk ({diskFiles.length})
                </div>
              </div>
              {diskFiles.length > 0 ? (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {diskFiles.map((df) => {
                    const isVideo = ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(df.extension);
                    const isAudio = ['mp3', 'm4a', 'flac', 'wav', 'opus'].includes(df.extension);

                    return (
                      <div
                        key={df.path || df.name}
                        className="flex items-center gap-3.5 p-3 rounded-2xl bg-[var(--surface-hi,#161a24)] border border-white/5 hover:border-white/10 transition-all"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-800 border border-white/5 flex-shrink-0 flex items-center justify-center relative">
                          {df.thumbnail_url ? (
                            <img
                              src={df.thumbnail_url}
                              alt={df.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : isVideo ? (
                            <Film className="w-6 h-6 text-[#ffd24d]" />
                          ) : isAudio ? (
                            <Disc className="w-6 h-6 text-[var(--kino-mint)]" />
                          ) : (
                            <FileText className="w-6 h-6 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <b className="text-sm font-bold text-white truncate block">
                            {df.name}
                          </b>
                          <small className="text-xs text-neutral-400 block mt-0.5">
                            {df.size_str || formatBytes(df.size_bytes)} · Saved locally in ~/Downloads/Ovilo
                          </small>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <button
                            onClick={() => openFolder()}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer border border-white/10 transition-colors flex items-center gap-1.5"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await deleteDiskDownload(df.path || df.name);
                                await refreshDiskDownloads();
                              } catch (e) {
                                console.error('Failed to delete file:', e);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 cursor-pointer border border-white/10 hover:border-rose-500/30 transition-colors"
                            title="Delete file from disk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-neutral-500 text-xs">
                  No files found in ~/Downloads/Ovilo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: BDIX FTP SERVER EXPLORER (Server 1 & 2 Switchable + Thumbnails)  */}
      {/* ========================================================================= */}
      {activeTab === 'ftp' && (
        <div className="space-y-4">
          {/* Server Switcher + Category Filters + Search */}
          <div className="kino-box" style={{ padding: '18px 22px' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              {/* All / Server 1 / Server 2 Switcher */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setActiveServer('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                    activeServer === 'all'
                      ? 'bg-[#ffd24d] text-black border-[#ffd24d] shadow-md font-extrabold'
                      : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeServer === 'all' ? 'bg-black' : 'bg-[var(--kino-yellow)]'}`} />
                  <span>All Servers</span>
                </button>

                <button
                  onClick={() => setActiveServer('server1')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                    activeServer === 'server1'
                      ? 'bg-[#ffd24d] text-black border-[#ffd24d] shadow-md font-extrabold'
                      : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeServer === 'server1' ? 'bg-black' : 'bg-[var(--kino-mint)]'}`} />
                  <span>Server 1</span>
                </button>

                <button
                  onClick={() => setActiveServer('server2')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                    activeServer === 'server2'
                      ? 'bg-[#ffd24d] text-black border-[#ffd24d] shadow-md font-extrabold'
                      : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeServer === 'server2' ? 'bg-black' : 'bg-[var(--kino-mint)]'}`} />
                  <span>Server 2</span>
                </button>
              </div>

              {/* FTP Search Input */}
              <div className="kino-search flex items-center gap-2" style={{ width: '280px' }}>
                <Search className="w-4 h-4 text-[#a9a7a2] shrink-0" />
                <input
                  type="text"
                  value={ftpSearchQuery}
                  onChange={(e) => setFtpSearchQuery(e.target.value)}
                  placeholder="Search movies, games, software..."
                  className="bg-transparent border-0 outline-none text-[#f2efe9] text-xs w-full"
                />
                {ftpSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFtpSearchQuery('')}
                    className="text-neutral-400 hover:text-white cursor-pointer border-0 bg-transparent p-0 text-xs shrink-0"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', label: 'All Files' },
                { id: 'movie', label: 'Movies' },
                { id: 'series', label: 'TV Series' },
                { id: 'game', label: 'Games' },
                { id: 'software', label: 'Software' },
                { id: 'animation', label: 'Anime & Cartoons' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border ${
                    activeCategory === c.id
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-transparent text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* FTP Items Grid with Rich Thumbnails */}
          {loadingFtp ? (
            <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#ffd24d]" />
              <span className="text-xs">Loading {activeServer === 'server1' ? 'High-Speed Server 1' : 'High-Speed Server 2'} repository...</span>
            </div>
          ) : filteredFtpFiles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredFtpFiles.map((pkg) => (
                <div
                  key={pkg.id}
                  className="kino-box rc in pv group hover:border-white/20 transition-all flex flex-col overflow-hidden"
                  style={{ padding: '8px' }}
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shadow-inner">
                    <FtpMediaThumbnail item={pkg} />
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur-sm border border-white/10">
                      {pkg.primaryExtension || 'FILE'}
                    </span>
                  </div>

                  {/* Info & Download Button */}
                  <div className="mt-2 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="text-xs font-bold text-white truncate" title={pkg.title}>
                        {formatMediaTitle(pkg.title)}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 flex items-center justify-between">
                        <span>{pkg.source === 'server1' ? 'High-Speed Server 1' : 'High-Speed Server 2'}</span>
                        <span className="text-[var(--kino-mint)] uppercase font-semibold text-[9px]">
                          {pkg.category}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Watch Now (Direct Stream) & Download (Get) */}
                    {pkg.category === 'video' ||
                    pkg.primaryExtension === 'mkv' ||
                    pkg.primaryExtension === 'mp4' ||
                    pkg.primaryExtension === 'webm' ? (
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <button
                          onClick={() => {
                            if (pkg.files && pkg.files.length > 1) {
                              setSelectedFilePkg(pkg);
                            } else {
                              handlePlayFtp(pkg);
                            }
                          }}
                          className="b rip flex-1 py-1.5 rounded-lg bg-[#ffd24d] hover:bg-[#ffe066] text-black text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer border-0 shadow-sm"
                          title="Watch instantly in high-speed player"
                        >
                          <Play className="w-3 h-3 fill-black text-black" />
                          <span>Watch</span>
                        </button>

                        <button
                          onClick={() => handleDownloadFtp(pkg)}
                          className="b rip px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border-0"
                          title="Download file to computer"
                        >
                          <Download className="w-3 h-3" />
                          <span>{pkg.files && pkg.files.length > 1 ? `Get (${pkg.files.length})` : 'Get'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDownloadFtp(pkg)}
                        className="b rip mt-2.5 w-full py-1.5 rounded-lg bg-white/10 hover:bg-[#ffd24d] hover:text-black text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0"
                      >
                        <Download className="w-3 h-3" />
                        <span>{pkg.files && pkg.files.length > 1 ? `Choose (${pkg.files.length} Files)` : 'Download'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="kino-box p-12 text-center text-neutral-400 text-xs">
              No files found matching "{ftpSearchQuery}". Try another search or category.
            </div>
          )}
        </div>
      )}

      {/* Multiple Files Selection Modal */}
      {selectedFilePkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="kino-box max-w-lg w-full p-5 border border-white/20 shadow-2xl relative rounded-2xl bg-[#141418]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="min-w-0 pr-3">
                <h3 className="text-sm font-extrabold text-white truncate">
                  {formatMediaTitle(selectedFilePkg.title)}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Select a version or quality to watch or download ({selectedFilePkg.files.length} available)
                </p>
              </div>
              <button
                onClick={() => setSelectedFilePkg(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white cursor-pointer transition-colors border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {selectedFilePkg.files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white break-all leading-snug">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1 uppercase font-semibold">
                      {(file.extension || 'FILE').toUpperCase()} · {selectedFilePkg.source === 'server1' ? 'High-Speed Server 1' : 'High-Speed Server 2'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(selectedFilePkg.category === 'video' ||
                      file.extension === 'mkv' ||
                      file.extension === 'mp4' ||
                      file.extension === 'webm' ||
                      file.url.toLowerCase().endsWith('.mkv') ||
                      file.url.toLowerCase().endsWith('.mp4')) && (
                      <>
                        <button
                          onClick={() => {
                            handlePlayExternalFtp(selectedFilePkg, file);
                            setSelectedFilePkg(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#ffd24d] hover:bg-[#ffe066] text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all border-0 shadow-sm"
                          title="Watch in external player (VLC / MPV) with Dolby AC3 5.1 & hardware acceleration"
                        >
                          <Play className="w-3.5 h-3.5 fill-black text-black" />
                          <span>VLC / MPV</span>
                        </button>
                        <button
                          onClick={() => {
                            handlePlayFtp(selectedFilePkg, file);
                            setSelectedFilePkg(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border border-white/10"
                          title="Watch in app player"
                        >
                          <span>In-App</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        handleDownloadFtpFile(selectedFilePkg, file);
                        setSelectedFilePkg(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-white/10"
                      title="Download to computer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Get</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
