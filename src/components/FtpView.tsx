import React, { useState, useEffect } from 'react';
import {
  Server,
  Search,
  Film,
  Gamepad2,
  Smartphone,
  Terminal,
  FileText,
  Download,
  Play,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  fetchBdixData,
  BdixPackage,
  getThumbnailCandidates,
  formatMediaTitle,
} from '../services/bdixApi';
import { startDownload } from '../services/downloadManager';

// Thumbnail with progressive fallback chain
const MediaThumbnail: React.FC<{
  item: BdixPackage;
  isLight: boolean;
}> = ({ item, isLight }) => {
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
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-4 transition-colors ${
          isLight ? 'bg-neutral-100 text-neutral-400' : 'bg-[#121215] text-neutral-600'
        }`}
      >
        {item.category === 'game' ? (
          <Gamepad2 className="w-10 h-10 stroke-[1.4]" />
        ) : item.category === 'app' ? (
          <Smartphone className="w-10 h-10 stroke-[1.4]" />
        ) : item.category === 'software' ? (
          <Terminal className="w-10 h-10 stroke-[1.4]" />
        ) : item.category === 'document' ? (
          <FileText className="w-10 h-10 stroke-[1.4]" />
        ) : (
          <Film className="w-10 h-10 stroke-[1.4]" />
        )}
        <span className="text-[10px] font-mono mt-1 uppercase tracking-wider opacity-60">
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

export const FtpView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Server Filter: 'all' | 'server1' | 'server2' (Strictly no provider names shown)
  const [selectedSource, setSelectedSource] = useState<'all' | 'server1' | 'server2'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedExt, setSelectedExt] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Pagination & Data State
  const [packages, setPackages] = useState<BdixPackage[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Direct In-App Stream Player Modal
  const [streamingItem, setStreamingItem] = useState<{
    title: string;
    url: string;
  } | null>(null);

  // Copied item indicator
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadToast, setDownloadToast] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Data whenever filters change
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBdixData({
        q: debouncedQuery,
        category: selectedCategory,
        extension: selectedExt,
        source: selectedSource,
        page: currentPage,
        limit: 24,
      });

      if (res.success) {
        setPackages(res.packages || []);
        setTotalItems(res.total || 0);
        setTotalPages(res.totalPages || 1);
      } else {
        setError('Unable to load data from network.');
      }
    } catch (err: any) {
      console.error('Failed to load BDIX media data:', err);
      setError(err?.message || 'Network connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSource, selectedCategory, selectedExt, debouncedQuery, currentPage]);

  // Copy Direct Link to Clipboard
  const handleCopyLink = (item: BdixPackage, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = item.files[0]?.url || item.folder;
    if (targetUrl) {
      navigator.clipboard.writeText(targetUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Download Trigger: uses native download manager with progress tracking
  const handleDownload = async (item: BdixPackage, e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = item.files[0]?.url || item.folder;
    if (!downloadUrl) return;

    const cleanTitle = formatMediaTitle(item.title);
    const candidates = getThumbnailCandidates(item);
    const thumbnail = candidates.length > 0 ? candidates[0] : undefined;
    const formatLabel = (item.primaryExtension || 'FILE').toUpperCase();

    setDownloadingId(item.id);
    try {
      await startDownload({
        url: downloadUrl,
        title: cleanTitle,
        formatType: 'best',
        formatLabel,
        thumbnail,
      });
      setDownloadToast({ id: String(item.id), title: cleanTitle });
      setTimeout(() => setDownloadingId(null), 2000);
      setTimeout(() => setDownloadToast(null), 4500);
    } catch (err) {
      console.warn('Native downloader fallback, launching link:', err);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = item.files[0]?.name || item.title;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadingId(null);
    }
  };

  // Play / Stream Video In-App
  const handlePlayStream = (item: BdixPackage, e: React.MouseEvent) => {
    e.stopPropagation();
    const videoFile = item.files.find((f) =>
      ['mkv', 'mp4', 'webm', 'avi', 'mov'].includes(f.extension.toLowerCase())
    ) || item.files[0];

    const streamUrl = videoFile?.url || item.folder;
    if (streamUrl) {
      setStreamingItem({
        title: item.title,
        url: streamUrl,
      });
    }
  };

  // Format badge colors
  const getExtensionBadgeColor = (ext: string) => {
    const e = (ext || '').toLowerCase();
    if (['apk'].includes(e)) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (['mkv', 'mp4', 'avi', 'webm'].includes(e))
      return 'bg-lime-500/20 text-[#DCFF7D] border-[#DCFF7D]/30';
    if (['iso', 'img', 'bin'].includes(e))
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    if (['zip', 'rar', '7z'].includes(e))
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (['exe', 'msi', 'dmg', 'pkg'].includes(e))
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
  };

  return (
    <div
      className={`min-h-full w-full p-6 md:p-8 space-y-6 select-none ${
        isLight ? 'bg-[#F4F5F7] text-neutral-900' : 'bg-[#0B0B0D] text-white'
      }`}
    >
      {/* 1. Header & Server Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isLight
                ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                : 'bg-[#DCFF7D]/15 border border-[#DCFF7D]/30 text-[#DCFF7D]'
            }`}
          >
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`text-2xl font-extrabold ${
                  isLight ? 'text-neutral-900' : 'text-white'
                }`}
              >
                Network Media Hub
              </h1>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-neutral-200 border-neutral-300 text-neutral-700'
                    : 'bg-white/5 border-white/10 text-neutral-300'
                }`}
              >
                LAN High-Speed
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              High-speed streaming, games, software & direct downloads with live thumbnail previews
            </p>
          </div>
        </div>

        {/* Server Source Pills (Strictly named Server 1 & Server 2) */}
        <div
          className={`flex items-center p-1 rounded-2xl border flex-shrink-0 ${
            isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#17181d] border-white/8'
          }`}
        >
          {[
            { id: 'all', label: 'All Servers' },
            { id: 'server1', label: 'Server 1' },
            { id: 'server2', label: 'Server 2' },
          ].map((srv) => (
            <button
              key={srv.id}
              onClick={() => {
                setSelectedSource(srv.id as any);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSource === srv.id
                  ? isLight
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-[#DCFF7D] text-[#0B0B0D]'
                  : isLight
                  ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {srv.id !== 'all' && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedSource === srv.id
                      ? isLight
                        ? 'bg-white'
                        : 'bg-[#0B0B0D]'
                      : 'bg-emerald-500'
                  }`}
                />
              )}
              <span>{srv.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Search Omnibar & Category Filters Card */}
      <div
        className={`rounded-3xl p-5 border space-y-4 ${
          isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#17181d] border-white/8'
        }`}
      >
        {/* Search Input Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div
            className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
              isLight
                ? 'bg-neutral-50 border-neutral-200 focus-within:border-neutral-400'
                : 'bg-[#101013] border-white/10 focus-within:border-[#DCFF7D]/50'
            }`}
          >
            <Search
              className={`w-4 h-4 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across 96,000+ movies, games, software, series..."
              className={`w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none ${
                isLight ? 'text-neutral-900 placeholder:text-neutral-400' : 'text-white placeholder:text-neutral-600'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:opacity-70 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            )}
          </div>

          <button
            onClick={() => loadData()}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors border cursor-pointer ${
              isLight
                ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-neutral-200'
                : 'bg-[#1C1C20] hover:bg-[#25252B] text-white border-white/10'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Category Pills & Extension Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-white/5">
          {/* Categories with smooth horizontal scroll for compact windows */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap sm:flex-wrap">
            {[
              { id: 'all', label: 'All Media', icon: Layers },
              { id: 'video', label: 'Movies & Series', icon: Film },
              { id: 'game', label: 'Games', icon: Gamepad2 },
              { id: 'app', label: 'Android APKs', icon: Smartphone },
              { id: 'software', label: 'Software & Tools', icon: Terminal },
              { id: 'document', label: 'Tutorials & Docs', icon: FileText },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border flex-shrink-0 ${
                    isActive
                      ? isLight
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white/10 text-[#DCFF7D] border-[#DCFF7D]/40'
                      : isLight
                      ? 'bg-neutral-50 text-neutral-600 hover:text-neutral-900 border-neutral-200'
                      : 'bg-white/3 text-neutral-400 hover:text-white border-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Extension Chips */}
          <div className="flex items-center gap-1 text-[11px] font-mono flex-shrink-0 overflow-x-auto pb-1 scrollbar-none">
            <span className={`text-[10px] mr-1 uppercase flex-shrink-0 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Format:
            </span>
            {['all', 'mkv', 'mp4', 'apk', 'rar', 'iso', 'exe'].map((ext) => (
              <button
                key={ext}
                onClick={() => {
                  setSelectedExt(ext);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded-lg uppercase transition-colors cursor-pointer flex-shrink-0 ${
                  selectedExt === ext
                    ? isLight
                      ? 'bg-neutral-900 text-white font-bold'
                      : 'bg-[#DCFF7D] text-[#0B0B0D] font-bold'
                    : isLight
                    ? 'text-neutral-500 hover:text-neutral-900'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {ext}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Media Grid Section */}
      <div className="space-y-4">
        {/* Total results indicator */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
              {loading ? 'Searching network catalogs...' : `${totalItems.toLocaleString()} items found`}
            </span>
            {selectedSource !== 'all' && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                isLight ? 'bg-neutral-200 border-neutral-300 text-neutral-800' : 'bg-white/5 border-white/10 text-[#DCFF7D]'
              }`}>
                {selectedSource === 'server1' ? 'Server 1' : 'Server 2'}
              </span>
            )}
          </div>
          <div className={`text-[11px] font-mono ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Content State */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-2xl h-64 animate-pulse border ${
                  isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-[#161619] border-white/5'
                }`}
              />
            ))}
          </div>
        ) : error ? (
          <div
            className={`rounded-3xl p-8 text-center border space-y-3 ${
              isLight ? 'bg-white border-neutral-200 text-neutral-600' : 'bg-[#161619] border-white/8 text-neutral-400'
            }`}
          >
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={() => loadData()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#DCFF7D] text-[#0B0B0D] cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : packages.length === 0 ? (
          <div
            className={`rounded-3xl p-12 text-center border space-y-2 ${
              isLight ? 'bg-white border-neutral-200' : 'bg-[#17181d] border-white/8'
            }`}
          >
            <p className={`text-sm font-bold ${isLight ? 'text-neutral-800' : 'text-white'}`}>
              No matches found
            </p>
            <p className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Try clearing filters or searching with a different keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4">
            {packages.map((item) => {
              const cleanTitle = formatMediaTitle(item.title);
              const isVideo = ['mkv', 'mp4', 'webm', 'avi'].includes(
                (item.primaryExtension || '').toLowerCase()
              );
              const isDownloading = downloadingId === item.id;
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-2xl overflow-hidden border flex flex-col justify-between transition-all duration-200 ${
                    isLight
                      ? 'bg-white border-neutral-200 hover:border-neutral-400 shadow-sm'
                      : 'bg-[#161619] border-white/8 hover:border-white/20'
                  }`}
                >
                  {/* Thumbnail Banner with Corner Badges */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-950 flex items-center justify-center">
                    <MediaThumbnail item={item} isLight={isLight} />

                    {/* Server Label (Top-Left) */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono uppercase bg-black/75 text-white/90 backdrop-blur-sm border border-white/10">
                        {item.source === 'server1' ? 'Server 1' : 'Server 2'}
                      </span>
                    </div>

                    {/* Extension Format Badge (Top-Right) */}
                    <div className="absolute top-2 right-2 z-10">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono uppercase border backdrop-blur-sm ${getExtensionBadgeColor(
                          item.primaryExtension
                        )}`}
                      >
                        {item.primaryExtension || 'FILE'}
                      </span>
                    </div>

                    {/* Quick Play Overlay for Video */}
                    {isVideo && (
                      <button
                        onClick={(e) => handlePlayStream(item, e)}
                        className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 hover:bg-[#DCFF7D] text-white hover:text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer backdrop-blur-sm"
                        title="Stream in Ovilo Player"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        className={`text-xs font-bold line-clamp-2 leading-tight ${
                          isLight ? 'text-neutral-900' : 'text-white'
                        }`}
                        title={item.title}
                      >
                        {cleanTitle}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-neutral-400 font-mono">
                        <span className="capitalize">{item.category}</span>
                        {item.fileCount > 1 && (
                          <>
                            <span>•</span>
                            <span>{item.fileCount} files</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Bar - Never squished in minimize or compact windows */}
                    <div className="pt-2.5 border-t border-white/5 flex items-center gap-1.5">
                      {/* Primary Download Button */}
                      <button
                        onClick={(e) => handleDownload(item, e)}
                        className={`flex-1 min-w-0 py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isDownloading
                            ? 'bg-emerald-500 text-black'
                            : isLight
                            ? 'bg-neutral-900 hover:bg-black text-white'
                            : 'bg-[#DCFF7D] hover:bg-[#cbf565] text-[#0B0B0D]'
                        }`}
                        title="Download to ~/Downloads/Ovilo"
                      >
                        <Download className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{isDownloading ? 'Queued' : 'Download'}</span>
                      </button>

                      {/* Stream Button (if video) */}
                      {isVideo && (
                        <button
                          onClick={(e) => handlePlayStream(item, e)}
                          className={`p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer border flex-shrink-0 ${
                            isLight
                              ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-neutral-200'
                              : 'bg-white/5 hover:bg-white/10 text-[#DCFF7D] border-white/10'
                          }`}
                          title="Stream in Ovilo Player"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}

                      {/* Copy Link Button */}
                      <button
                        onClick={(e) => handleCopyLink(item, e)}
                        className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer flex-shrink-0 ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : isLight
                            ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
                            : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/5'
                        }`}
                        title="Copy direct download link"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Pagination Navigation Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                  : 'bg-[#161619] hover:bg-[#202025] text-white border-white/10'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className={`text-xs font-mono px-3 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                  : 'bg-[#161619] hover:bg-[#202025] text-white border-white/10'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 5. In-App Video Streaming Modal */}
      {streamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-[#121215] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2 truncate pr-4">
                <Play className="w-4 h-4 text-[#DCFF7D] fill-current flex-shrink-0" />
                <span className="text-sm font-bold text-white truncate">
                  {streamingItem.title}
                </span>
              </div>
              <button
                onClick={() => setStreamingItem(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Canvas */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <video
                src={streamingItem.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your player does not support this video stream.
              </video>
            </div>

            {/* Footer with Stream Actions */}
            <div className="p-3 bg-[#18181D] flex items-center justify-between gap-3 text-xs">
              <span className="text-neutral-400 font-mono text-[11px] truncate">
                Direct Stream: {streamingItem.url}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(streamingItem.url);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-white/10 text-neutral-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Copy URL
                </button>
                <a
                  href={streamingItem.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl font-bold bg-[#DCFF7D] text-[#0B0B0D] hover:bg-[#cbf565] transition-colors"
                >
                  Direct Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification when Download starts */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#1C1C20] border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="w-8 h-8 rounded-xl bg-[#DCFF7D]/20 text-[#DCFF7D] flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 animate-bounce" />
          </div>
          <div className="min-w-0 pr-2">
            <p className="text-xs font-bold text-white truncate max-w-[240px]">
              {downloadToast.title}
            </p>
            <p className="text-[11px] text-neutral-400">
              Downloading to ~/Downloads/Ovilo • See bottom sidebar
            </p>
          </div>
          <button
            onClick={() => setDownloadToast(null)}
            className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
