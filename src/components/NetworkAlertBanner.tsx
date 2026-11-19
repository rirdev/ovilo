import React, { useState, useEffect } from 'react';
import { WifiOff, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NetworkAlertBannerProps {
  customMessage?: string | null;
  onClearCustomMessage?: () => void;
}

export const NetworkAlertBanner: React.FC<NetworkAlertBannerProps> = ({
  customMessage,
  onClearCustomMessage,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsDismissed(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const shouldShow = (!isOnline || Boolean(customMessage)) && !isDismissed;

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.25 }}
        className="mx-6 mt-3 px-4 py-3 rounded-2xl bg-[#1C1814] border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl z-30"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-amber-300">Connection Alert: </span>
            <span>
              {customMessage ||
                'No internet connection detected. Please connect to the internet to search movies, stream media, and sync cloud data.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              if (navigator.onLine) {
                setIsOnline(true);
                setIsDismissed(true);
                onClearCustomMessage?.();
              }
            }}
            title="Retry Connection"
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
          <button
            onClick={() => {
              setIsDismissed(true);
              onClearCustomMessage?.();
            }}
            title="Dismiss message"
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-500/20 text-amber-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
