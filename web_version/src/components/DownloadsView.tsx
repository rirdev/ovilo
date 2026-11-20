import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Film,
  Music,
  FolderOpen,
  Play,
  Trash2,
  Loader2,
  HardDrive,
  ExternalLink,
  ArrowDown,
  Gamepad2,
  Smartphone,
  FileText,
  Search,
  Plus,
  X,
  RefreshCw,
  FolderDown,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  useDownloadManager,
  computeProgressMetrics,
  getDiskDownloads,
  deleteDiskDownload,
  DiskFileItem,
  formatBytes,
} from '../services/downloadManager';

function getCategoryForExt(ext: string): 'video' | 'audio' | 'game' | 'app' | 'other' {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'ts', 'flv', 'wmv'].includes(e)) return 'video';
  if (['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'opus'].includes(e)) return 'audio';
  if (['iso', 'exe', 'bin', 'cue', 'img', 'rom'].includes(e)) return 'game';
  if (['apk', 'deb', 'rpm', 'appimage', 'zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return 'app';
  return 'other';
}

function formatDate(timestampSeconds: number): string {
  if (!timestampSeconds) return 'Recently';
  const date = new Date(timestampSeconds * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString();
}

export const DownloadsView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';

  const {
    downloads,
    activeDownloads,
    activeCount,
    startDownload,
    removeDownload,
    openFolder,
    openMedia,
  } = useDownloadManager();

  const [diskFiles, setDiskFiles] = useState<DiskFileItem[]>([]);
  const [loadingDisk, setLoadingDisk] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'video' | 'audio' | 'app' | 'game'>('all');

  // Modal to add download from URL
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlFormat, setUrlFormat] = useState('video_best');
  const [isStartingUrlDownload, setIsStartingUrlDownload] = useState(false);

  // Load files from ~/Downloads/Ovilo
  const refreshDiskFiles = async () => {
    setLoadingDisk(true);
    try {
      const list = await getDiskDownloads();
      setDiskFiles(list);
    } catch (err) {
      console.warn('Could not list disk downloads:', err);
    } finally {
      setLoadingDisk(false);
    }
  };

  useEffect(() => {
    refreshDiskFiles();
  }, []);

  // Refresh disk files whenever an active download finishes
  useEffect(() => {
    const hasCompleted = downloads.some((d) => d.status === 'completed');
    if (hasCompleted) {
      refreshDiskFiles();
    }
  }, [downloads]);

  // Handle URL download
  const handleStartUrlDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStartingUrlDownload) return;
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    setIsStartingUrlDownload(true);
    try {
      const title = trimmed.split('/').pop() || 'Media Download';
      await startDownload({
        url: trimmed,
        title,
        formatType: urlFormat,
        formatLabel: urlFormat.includes('audio') ? 'Audio' : 'Video',
      });

      setUrlInput('');
      setIsUrlModalOpen(false);
    } finally {
      setIsStartingUrlDownload(false);
    }
  };

  // Delete file permanently from disk and download history
  const handleDeleteFile = async (path: string, historyId?: string) => {
    if (historyId) {
      removeDownload(historyId);
    }
    await deleteDiskDownload(path);
    setDiskFiles((prev) => prev.filter((f) => f.path !== path));
  };

  // Calculate total disk space used
  const totalDiskBytes = diskFiles.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
  const totalDiskSizeStr = formatBytes(totalDiskBytes);

  // Filter disk files
  const filteredFiles = diskFiles.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (categoryFilter === 'all') return true;
    const cat = getCategoryForExt(file.extension);
    return cat === categoryFilter;
  });

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
      {/* 1. Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold border shadow-sm ${
              isLight
                ? 'bg-emerald-600 text-white border-emerald-500'
                : isCobalt
                ? 'bg-[#2F6BFE] text-white border-[#2F6BFE]'
                : 'bg-[#DCFF7D] text-[#0B0B0D] border-[#DCFF7D]'
            }`}
          >
            <FolderDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`text-2xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                Downloaded Files
              </h1>
              {activeCount > 0 ? (
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
              ) : (
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                    isLight
                      ? 'bg-white text-neutral-600 border-neutral-300'
                      : 'bg-white/5 border-white/10 text-neutral-400'
                  }`}
                >
                  {diskFiles.length} {diskFiles.length === 1 ? 'file' : 'files'} saved
                </span>
              )}
            </div>
            <p className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Manage all downloaded movies, series, games, and media saved in ~/Downloads/Ovilo
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshDiskFiles()}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-white border-neutral-300 hover:bg-neutral-100 text-neutral-700 shadow-sm'
                : 'bg-[#151619] border-white/8 hover:bg-[#1E1E23] text-neutral-300'
            }`}
            title="Refresh downloaded files"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDisk ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => openFolder()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-sm ${
              isLight
                ? 'bg-white border-neutral-300 text-neutral-900 hover:bg-neutral-100'
                : isCobalt
                ? 'bg-[#17181D] border-white/8 text-white hover:bg-[#1F2027]'
                : 'bg-[#151619] border-white/8 text-neutral-200 hover:text-white hover:bg-[#1E1E23]'
            }`}
          >
            <FolderOpen className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-[#DCFF7D]'}`} />
            <span>Open ~/Downloads/Ovilo</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUrlModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isLight
                ? 'bg-neutral-900 hover:bg-black text-white'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            }`}
            title="Download from media URL"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Storage Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Total Downloaded Files */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-white border-neutral-200 shadow-sm'
              : 'bg-[#17181d] border-white/8'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Downloaded Files
            </span>
            <FolderDown className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                isLight ? 'text-neutral-900' : 'text-white'
              }`}
            >
              {diskFiles.length}
            </span>
            <span className="text-xs text-neutral-400">files in local storage</span>
          </div>
        </div>

        {/* Card 2: Disk Space Used */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-white border-neutral-200 shadow-sm'
              : 'bg-[#17181d] border-white/8'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Storage Used
            </span>
            <HardDrive className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                isLight ? 'text-neutral-900' : 'text-white'
              }`}
            >
              {totalDiskSizeStr}
            </span>
            <span className="text-xs text-neutral-400">in ~/Downloads/Ovilo</span>
          </div>
        </div>

        {/* Card 3: Active Transfers */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-white border-neutral-200 shadow-sm'
              : 'bg-[#17181d] border-white/8'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Active Downloads
            </span>
            <DownloadCloud
              className={`w-4 h-4 ${
                activeCount > 0
                  ? isLight
                    ? 'text-emerald-600 animate-bounce'
                    : 'text-[#DCFF7D] animate-bounce'
                  : 'text-neutral-400'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                isLight ? 'text-neutral-900' : 'text-white'
              }`}
            >
              {activeCount}
            </span>
            <span className="text-xs text-neutral-400">
              {activeSpeed ? `active (${activeSpeed})` : 'no active downloads'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Active Downloads Section (Only appears when transfers are running) */}
      {activeDownloads.length > 0 && (
        <div
          className={`rounded-3xl p-5 sm:p-6 space-y-4 border transition-all ${
            isLight
              ? 'bg-white border-neutral-200 shadow-sm'
              : 'bg-[#17181d] border-white/8'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h2 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                Active Transfers ({activeDownloads.length})
              </h2>
            </div>
            {activeSpeed && (
              <span
                className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#DCFF7D]/20 text-[#DCFF7D] border border-[#DCFF7D]/30'
                }`}
              >
                <ArrowDown className="w-3 h-3" />
                {activeSpeed}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {activeDownloads.map((item) => {
              const metrics = computeProgressMetrics(
                item.progress,
                item.speed,
                item.totalSize,
                item.eta
              );

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                    isLight
                      ? 'bg-neutral-50/80 border-neutral-200'
                      : 'bg-white/3 border-white/6'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
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
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold border ${
                            isLight
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                              : 'bg-[#DCFF7D]/15 border-[#DCFF7D]/30 text-[#DCFF7D]'
                          }`}
                        >
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-sm font-bold truncate ${
                            isLight ? 'text-neutral-900' : 'text-white'
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </h4>
                        <div className="text-[11px] text-neutral-400 mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                          <span className="uppercase font-bold px-1.5 py-0.2 rounded bg-neutral-200/60 dark:bg-white/5 text-neutral-800 dark:text-neutral-300">
                            {item.formatLabel}
                          </span>
                          {metrics.speed && (
                            <span
                              className={`font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                                isLight
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-[#DCFF7D]/20 text-[#DCFF7D]'
                              }`}
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                              {metrics.speed.replace(/^↓\s*/, '')}
                            </span>
                          )}
                          {metrics.etaStr && (
                            <span>• {metrics.etaStr} left</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeDownload(item.id)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Cancel download"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress & Speed Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        {metrics.downloadedStr && metrics.totalStr ? (
                          <span className={`font-bold ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>
                            {metrics.downloadedStr} of {metrics.totalStr}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Downloading data...</span>
                        )}

                        {metrics.remainingStr && (
                          <span className="text-neutral-500 text-[11px]">
                            ({metrics.remainingStr} remaining)
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Downloaded Files List & Filters */}
      <div
        className={`rounded-3xl p-5 sm:p-7 space-y-4 border transition-all ${
          isLight
            ? 'bg-white border-neutral-200 shadow-sm'
            : 'bg-[#17181d] border-white/8'
        }`}
      >
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search downloaded files by name..."
              className={`w-full rounded-2xl pl-10 pr-4 py-2.5 text-xs transition-colors focus:outline-none border ${
                isLight
                  ? 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900'
                  : 'bg-[#090A0F] border-white/10 text-white placeholder-neutral-500 focus:border-white/30'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div
            className={`p-1 rounded-2xl border flex flex-wrap items-center gap-1 ${
              isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-black/30 border-white/5'
            }`}
          >
            {[
              { id: 'all', label: 'All Files' },
              { id: 'video', label: 'Movies & Videos' },
              { id: 'audio', label: 'Music & Audio' },
              { id: 'game', label: 'Games' },
              { id: 'app', label: 'Software & APKs' },
            ].map((tab) => {
              const isSelected = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? isLight
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'bg-white/15 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Files Grid / List */}
        {filteredFiles.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 text-neutral-400">
            <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-white/5 flex items-center justify-center">
              <FolderDown className="w-8 h-8 opacity-40 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                {searchQuery ? 'No matching files found' : 'No downloaded files yet'}
              </p>
              <p className="text-xs text-neutral-400 max-w-sm mt-1">
                {searchQuery
                  ? 'Try searching with a different filename keyword'
                  : 'Files downloaded from the Network Hub will automatically be saved and organized here.'}
              </p>
            </div>
            <button
              onClick={() => openFolder()}
              className={`mt-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              Open ~/Downloads/Ovilo Folder
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredFiles.map((file) => {
              const cat = getCategoryForExt(file.extension);
              const historyMatch = downloads.find(
                (d) =>
                  d.filePath === file.path ||
                  file.name.includes(d.title) ||
                  d.title.includes(file.name.replace(/\.[^/.]+$/, ''))
              );

              return (
                <div
                  key={file.path}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all ${
                    isLight
                      ? 'bg-white border-neutral-200 shadow-sm hover:border-neutral-300'
                      : 'bg-[#101013] border-white/6 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail if matched or Category Icon */}
                    {historyMatch?.thumbnail ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                        <img
                          src={historyMatch.thumbnail}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border font-bold ${
                          cat === 'video'
                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                            : cat === 'audio'
                            ? 'bg-pink-500/15 border-pink-500/30 text-pink-400'
                            : cat === 'game'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : cat === 'app'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-neutral-500/15 border-neutral-500/30 text-neutral-400'
                        }`}
                      >
                        {cat === 'video' ? (
                          <Film className="w-5 h-5" />
                        ) : cat === 'audio' ? (
                          <Music className="w-5 h-5" />
                        ) : cat === 'game' ? (
                          <Gamepad2 className="w-5 h-5" />
                        ) : cat === 'app' ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-sm font-bold truncate leading-snug ${
                          isLight ? 'text-neutral-900' : 'text-white'
                        }`}
                        title={file.name}
                      >
                        {file.name}
                      </h4>
                      <div className="text-[11px] text-neutral-400 mt-1 flex flex-wrap items-center gap-2 font-mono">
                        <span
                          className={`uppercase font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            isLight
                              ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                              : 'bg-white/5 text-neutral-300 border border-white/10'
                          }`}
                        >
                          {file.extension.toUpperCase() || 'FILE'}
                        </span>
                        <span className="font-semibold text-neutral-500 dark:text-neutral-300">
                          {file.size_str}
                        </span>
                        <span>•</span>
                        <span>{formatDate(file.modified_timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Play/Open, Folder, Delete */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => openMedia(file.path)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                        isLight
                          ? 'bg-neutral-900 hover:bg-black text-white'
                          : isCobalt
                          ? 'bg-[#2F6BFE] hover:bg-[#437BFE] text-white'
                          : 'bg-[#DCFF7D] hover:bg-[#cbf764] text-[#0B0B0D]'
                      }`}
                      title="Play / Open file"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play / Open</span>
                    </button>

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
                      onClick={() => handleDeleteFile(file.path, historyMatch?.id)}
                      title="Delete file"
                      className="p-2 rounded-xl border border-transparent hover:border-red-500/20 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Modal: Add Download from URL (Only when clicked) */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
              isLight
                ? 'bg-white border-neutral-300 text-neutral-900'
                : 'bg-[#151518] border-white/10 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold">Download from Media URL</h3>
              </div>
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartUrlDownload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5">
                  Media or Direct File Link:
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://... or direct media link"
                  autoFocus
                  className={`w-full rounded-xl px-4 py-3 text-xs focus:outline-none border ${
                    isLight
                      ? 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-neutral-900'
                      : 'bg-black/40 border-white/10 text-white focus:border-white/30'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5">
                  Format Preset:
                </label>
                <select
                  value={urlFormat}
                  onChange={(e) => setUrlFormat(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none border ${
                    isLight
                      ? 'bg-neutral-50 border-neutral-300 text-neutral-900'
                      : 'bg-[#1A1A20] border-white/10 text-white'
                  }`}
                >
                  <option value="video_best">Max Quality Video (Best MP4)</option>
                  <option value="video_1080">1080p Full HD MP4</option>
                  <option value="video_720">720p HD MP4</option>
                  <option value="audio_mp3">High-Res MP3 Audio</option>
                  <option value="audio_flac">Lossless FLAC Audio</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    isLight
                      ? 'bg-white border-neutral-300 text-neutral-700'
                      : 'bg-white/5 border-white/10 text-neutral-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!urlInput.trim() || isStartingUrlDownload}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                    isLight
                      ? 'bg-neutral-900 hover:bg-black text-white'
                      : 'bg-[#DCFF7D] text-[#0B0B0D] hover:bg-[#cbf764]'
                  }`}
                >
                  {isStartingUrlDownload ? 'Starting...' : 'Start Download'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
