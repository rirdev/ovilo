import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Globe, Clock, X, AlertCircle } from 'lucide-react';
import { AppUpdateData, openDownloadLink } from '../services/updateService';
import { useTheme } from '../context/ThemeContext';

interface UpdateNotificationModalProps {
  update: AppUpdateData | null;
  isOpen: boolean;
  onClose: () => void;
  onRemindLater: () => void;
}

const OFFICIAL_WEBSITE_URL = 'https://ovilo.netlify.app/';

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  update,
  isOpen,
  onClose,
  onRemindLater,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const handleDownload = () => {
    if (update?.downloadUrl) {
      openDownloadLink(update.downloadUrl);
    } else {
      openDownloadLink(OFFICIAL_WEBSITE_URL);
    }
  };

  const handleWebsite = () => {
    openDownloadLink(OFFICIAL_WEBSITE_URL);
  };

  return (
    <AnimatePresence>
      {isOpen && update && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Card - Clean, Matte, Professional Design (No Neon / No Glow) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full max-w-lg rounded-2xl p-6 sm:p-7 shadow-xl border z-10 ${
              isLight
                ? 'bg-white border-neutral-200 text-neutral-900'
                : 'bg-[#18191E] border-neutral-800 text-neutral-100'
            }`}
          >
            {/* Top Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isLight
                      ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                      : 'bg-neutral-800 text-white border border-neutral-700/60'
                  }`}
                >
                  <Download className="w-5 h-5 text-neutral-300" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        isLight
                          ? 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          : 'bg-neutral-800/80 text-neutral-300 border-neutral-700/60'
                      }`}
                    >
                      Update Available • v{update.version}
                    </span>
                    {update.isMandatory && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Important
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold tracking-tight mt-1.5">
                    {update.title || `Ovilo v${update.version}`}
                  </h3>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                title="Close"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isLight
                    ? 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                    : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Release Date */}
            {update.releaseDate && (
              <p className={`text-xs mt-3 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Released: {update.releaseDate}
              </p>
            )}

            {/* Changelog Box */}
            <div className="mt-4 space-y-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                What&apos;s New in v{update.version}
              </span>

              <div
                className={`rounded-xl p-4 text-xs font-mono max-h-44 overflow-y-auto whitespace-pre-line leading-relaxed border ${
                  isLight
                    ? 'bg-neutral-50 border-neutral-200 text-neutral-800'
                    : 'bg-[#121316] border-neutral-800/80 text-neutral-300'
                }`}
              >
                {update.notes || '• Performance optimizations and stability improvements.\n• Bug fixes and user experience refinements.'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                onClick={handleDownload}
                className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  isLight
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-white'
                    : 'bg-white hover:bg-neutral-200 text-black'
                }`}
              >
                <Download className="w-4 h-4" />
                Download Update (v{update.version})
              </button>

              <button
                onClick={handleWebsite}
                className={`py-2.5 px-4 rounded-xl font-semibold text-xs transition-colors border flex items-center justify-center gap-2 cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-800'
                    : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Website
              </button>

              <button
                onClick={onRemindLater}
                className={`py-2.5 px-3 rounded-xl font-medium text-xs transition-colors border flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                    : 'hover:bg-neutral-800/60 border-neutral-800 text-neutral-400 hover:text-neutral-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Later
              </button>
            </div>

            {/* Footer Note */}
            <p className={`text-[11px] text-center mt-3.5 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
              You can also check for updates anytime in <strong>Settings → About</strong>.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
