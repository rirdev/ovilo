import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Wave } from './loading-ui/wave';

export { Wave };

export interface InfinityLoopProps {
  className?: string;
  strokeColor?: string;
  trackColor?: string;
}

/**
 * Official Loading-UI Infinity Loop Component (https://www.loading-ui.com/docs/components/infinity)
 * Dynamic high-contrast theme styling for both dark and light modes.
 */
export const InfinityLoop: React.FC<InfinityLoopProps> = ({
  className = 'w-20 h-10',
  strokeColor,
  trackColor,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';

  const defaultTrack = isLight ? '#E4E4E7' : isCobalt ? '#1A1D28' : '#DCFF7D';
  const defaultStroke = isLight ? '#0B0B0D' : isCobalt ? '#2F6BFE' : '#DCFF7D';

  const resolvedTrack = trackColor || defaultTrack;
  const resolvedStroke = strokeColor || defaultStroke;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 187.3 93.7"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      {/* Background Track in muted theme tone */}
      <path
        d="M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1 c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z"
        fill="none"
        stroke={resolvedTrack}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isLight ? 'opacity-80' : 'opacity-20'}
      />
      {/* Active Animated Continuous Dash */}
      <path
        d="M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1 c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z"
        fill="none"
        stroke={resolvedStroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-infinity-dash"
      />
    </svg>
  );
};

/**
 * Startup Splash Screen featuring the Loading-UI Wave component.
 * Displays only the pure wave loader with inherited currentColor.
 */
export const AppStartupSplash: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const bgClass = isLight
    ? 'bg-[#FAFAFA] text-neutral-900'
    : 'bg-[#0d0d0d] text-slate-100';

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="app-startup-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none theme-self-managed ${bgClass}`}
        >
          {/* Brand Icon & Glow */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative flex items-center justify-center mb-6"
          >
            <div className="absolute w-24 h-24 rounded-full bg-[#FFD54F]/15 blur-2xl"></div>
            <div className="relative w-16 h-16 rounded-2xl bg-[#141414] flex items-center justify-center shadow-xl shadow-black/60 overflow-hidden border border-white/10">
              <img
                src="/logos/logo.png"
                alt="Ovilo"
                className="w-10 h-10 object-contain drop-shadow"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logos/app_logo.png';
                }}
              />
            </div>
          </motion.div>

          {/* Welcome Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-center space-y-1 mb-8"
          >
            <h1 className="text-2xl font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Welcome to Ovilo
            </h1>
            <p className="text-xs text-neutral-400 font-medium tracking-wide">
              Universal Media & Streaming Hub
            </p>
          </motion.div>

          {/* Visualizer Wave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Wave className="h-8 w-20 text-[#FFD54F]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
