import React from 'react';
import {
  DownloadCloud,
  FolderOpen,
  X,
  Play,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDown,
} from 'lucide-react';
import {
  useDownloadManager,
  computeProgressMetrics,
} from '../services/downloadManager';
import { useTheme } from '../context/ThemeContext';

interface DownloadsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDownloads: () => void;
}

export const DownloadsPopover: React.FC<DownloadsPopoverProps> = ({
  isOpen,
  onClose,
  onNavigateToDownloads,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const {
    downloads,
    activeCount,
    removeDownload,
    clearHistory,
    openFolder,
    openMedia,
  } = useDownloadManager();

  if (!isOpen) return null;

  return (
    <div
      className={`fixed left-[76px] bottom-3 w-[350px] sm:w-[390px] max-h-[540px] rounded-3xl border shadow-2xl flex flex-col z-50 animate-in fade-in slide-in-from-left-4 duration-200 select-none ${
        isLight
          ? 'bg-white/95 border-neutral-300 text-neutral-900 backdrop-blur-xl shadow-neutral-400/20'
          : 'bg-[#151518]/95 border-white/10 text-white backdrop-blur-xl'
      }`}
    >
      {/* 1. Header */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          isLight ? 'border-neutral-200' : 'border-white/5'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isLight
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-[#DCFF7D]/15 text-[#DCFF7D]'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider">
                Downloads
              </h3>
              {activeCount > 0 ? (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                    isLight
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#DCFF7D] text-[#0B0B0D]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {activeCount} Active
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    isLight
                      ? 'bg-neutral-100 border-neutral-200 text-neutral-600'
                      : 'bg-white/5 border-white/10 text-neutral-400'
                  }`}
                >
                  {downloads.length} total
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-full hover:opacity-70 transition-opacity cursor-pointer ${
            isLight ? 'text-neutral-500 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-white/5'
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Saved Folder Bar */}
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 text-xs ${
          isLight ? 'bg-neutral-100/70 border-neutral-200' : 'bg-black/30 border-white/5'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-neutral-500 font-medium text-[11px]">Saved:</span>
          <span
            className="font-mono text-[11px] truncate opacity-90 font-medium"
            title="~/Downloads/Ovilo"
          >
            ~/Downloads/Ovilo
          </span>
        </div>
        <button
          onClick={() => openFolder()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer border flex-shrink-0 ${
            isLight
              ? 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-900 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
          }`}
          title="Open ~/Downloads/Ovilo folder"
        >
          <FolderOpen
            className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-[#DCFF7D]'}`}
          />
          <span>Open Folder</span>
        </button>
      </div>

      {/* 3. Downloads Queue List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin max-h-[350px]">
        {downloads.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <DownloadCloud className="w-8 h-8 mx-auto opacity-30 stroke-[1.5]" />
            <p className="text-xs font-semibold opacity-60">No active or past downloads</p>
            <p className="text-[10px] text-neutral-400">
              Download files from the Network Hub or Downloads Hub
            </p>
          </div>
        ) : (
          downloads.map((item) => {
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
                className={`p-3 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-white border-neutral-200 shadow-sm hover:border-neutral-300'
                    : 'bg-white/3 border-white/5 hover:border-white/10'
                }`}
              >
                {/* Title & Status Bar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Status Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {isDownloading ? (
                        <Loader2
                          className={`w-4 h-4 animate-spin ${
                            isLight ? 'text-emerald-600' : 'text-[#DCFF7D]'
                          }`}
                        />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : isError ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <DownloadCloud className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4
                        className={`text-xs font-bold truncate leading-tight ${
                          isLight ? 'text-neutral-900' : 'text-white'
                        }`}
                        title={item.title}
                      >
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-400 font-mono">
                        <span className="uppercase font-semibold px-1 py-0.2 rounded bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300">
                          {item.formatLabel}
                        </span>
                        {isCompleted && (
                          <span className="text-emerald-500 font-bold">• Completed</span>
                        )}
                        {isError && (
                          <span className="text-red-400 font-bold">• Error</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isCompleted && item.filePath && (
                      <button
                        onClick={() => openMedia(item.filePath!)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isLight
                            ? 'hover:bg-neutral-100 text-emerald-600'
                            : 'hover:bg-white/10 text-[#DCFF7D]'
                        }`}
                        title="Play / Open File"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                    <button
                      onClick={() => removeDownload(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress & Speed Breakdown (High Contrast in all themes) */}
                {isDownloading && (
                  <div className="mt-3 space-y-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                    {/* Real-time stats row: Speed & Percentage */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 font-bold">
                        {metrics.speed ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-0.5 ${
                              isLight
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-[#DCFF7D]/20 text-[#DCFF7D] border border-[#DCFF7D]/30'
                            }`}
                          >
                            <ArrowDown className="w-2.5 h-2.5" />
                            {metrics.speed.replace(/^↓\s*/, '')}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Connecting...</span>
                        )}
                        {metrics.etaStr && (
                          <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">
                            • {metrics.etaStr} left
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-black text-xs ${
                          isLight ? 'text-emerald-700' : 'text-[#DCFF7D]'
                        }`}
                      >
                        {metrics.percentStr}
                      </span>
                    </div>

                    {/* Progress Bar with High Contrast */}
                    <div
                      className={`w-full h-2 rounded-full overflow-hidden ${
                        isLight ? 'bg-neutral-200' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          isLight ? 'bg-emerald-600' : 'bg-[#DCFF7D]'
                        }`}
                        style={{ width: `${Math.max(4, metrics.percent)}%` }}
                      />
                    </div>

                    {/* Size breakdown: e.g. 146.8 MB / 2.39 GB (2.25 GB left) */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                      {metrics.downloadedStr && metrics.totalStr ? (
                        <span>
                          {metrics.downloadedStr} of {metrics.totalStr}
                        </span>
                      ) : item.totalSize && item.totalSize !== '--' && item.totalSize !== 'Starting' ? (
                        <span>Total: {item.totalSize}</span>
                      ) : (
                        <span>Transferring data...</span>
                      )}

                      {metrics.remainingStr && (
                        <span
                          className={`font-semibold ${
                            isLight ? 'text-neutral-700' : 'text-neutral-300'
                          }`}
                        >
                          {metrics.remainingStr} remaining
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer Actions */}
      <div
        className={`p-3 border-t flex items-center justify-between gap-2 text-xs ${
          isLight ? 'bg-neutral-100/80 border-neutral-200' : 'bg-black/40 border-white/5'
        }`}
      >
        <button
          onClick={() => {
            onClose();
            onNavigateToDownloads();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
            isLight
              ? 'bg-neutral-900 text-white hover:bg-black'
              : 'bg-[#DCFF7D] text-[#0B0B0D] hover:bg-[#cbf565]'
          }`}
        >
          <span>View Downloaded Files</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        {downloads.length > 0 && (
          <button
            onClick={() => clearHistory()}
            className={`text-[11px] font-medium transition-colors cursor-pointer px-2 py-1 ${
              isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Clear Finished
          </button>
        )}
      </div>
    </div>
  );
};
