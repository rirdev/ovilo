import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  Film,
  Headphones,
  Download,
  Server,
  ShieldCheck,
  Wifi,
  WifiOff,
  ExternalLink,
  Keyboard,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { APP_CURRENT_VERSION, checkAppUpdatesManual, openDownloadLink } from '../services/updateService';

interface SupportViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenUpdates?: () => void;
}

export const SupportView: React.FC<SupportViewProps> = ({
  onNavigateTab,
  onOpenUpdates,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';

  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cardClass = isLight
    ? 'bg-white border border-neutral-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-neutral-900'
    : 'bg-[#16171D] border border-white/8 text-white shadow-lg';

  const subCardClass = isLight
    ? 'bg-neutral-50 border border-neutral-200 text-neutral-900'
    : 'bg-[#202128] border border-white/8 text-white';

  const handleManualCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const res = await checkAppUpdatesManual();
      if (res.isNewer && res.update) {
        setUpdateStatus(`New version available: v${res.update.version}!`);
        if (onOpenUpdates) onOpenUpdates();
      } else {
        setUpdateStatus(`You are on the latest release (v${APP_CURRENT_VERSION}).`);
      }
    } catch {
      setUpdateStatus('Unable to reach update servers. Please check your network.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const SHORTCUTS = [
    { key: '/', scope: 'Global', desc: 'Open Universal Search Modal' },
    { key: 'Escape', scope: 'Global', desc: 'Close open modal, player, or search overlay' },
    { key: 'D', scope: 'Global', desc: 'Jump directly to Downloads tab' },
    { key: 'F', scope: 'Movies / Music', desc: 'Toggle between Browse Library and Favorites' },
    { key: 'N', scope: 'Global (Music)', desc: 'Cycle Floating Music Notch (Hidden → Mini → Dock)' },
    { key: 'S', scope: 'Video Player', desc: 'Instantly switch to next streaming server failover' },
    { key: 'R', scope: 'Video Player', desc: 'Force reload current video player stream' },
    { key: 'F1 – F5', scope: 'Settings', desc: 'Direct switch between Profile, Theme, Stream & Data tabs' },
  ];

  const FAQS = [
    {
      q: 'How does multi-server streaming failover work?',
      a: 'Ovilo connects to multi-node decentralized streaming providers. If an embed is slow or buffering, simply press key "S" on your keyboard or click "Next Server" in the video player top bar to switch to another host without losing your spot.',
      icon: Film,
    },
    {
      q: 'How do I listen to my local music and view synchronized lyrics?',
      a: 'In the Music Player tab, click "Scan Local Folder" and choose your music folder (e.g. ~/Music). Ovilo automatically reads ID3 metadata, album artwork, and fetches time-synced lyrics (.lrc) that display in karaoke mode while audio plays.',
      icon: Headphones,
    },
    {
      q: 'Can I use Ovilo completely offline without internet?',
      a: 'Yes! Scanned local music and all files downloaded via the Network Hub or YT-DLP are stored on your local disk and will play seamlessly even with Wi-Fi disconnected.',
      icon: WifiOff,
    },
    {
      q: 'How does the BDIX Network Media Hub work?',
      a: 'If your internet service provider is connected to BDIX (Bangladesh Internet Exchange) or local ISP caches, you get line-speed downloading and streaming for movies, games, software, and packages up to 100 Mbps+.',
      icon: Server,
    },
    {
      q: 'Are my favorites and watch history synced across devices?',
      a: 'When you sign in with a username and password, your watch history and favorited tracks sync to Firebase Cloud Firestore. If you prefer guest mode, all your data remains 100% private and offline on your computer.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div
      className={`min-h-full w-full p-6 md:p-8 space-y-8 select-none pb-28 transition-colors ${
        isLight ? 'bg-[#F4F5F7] text-neutral-900' : isCobalt ? 'bg-[#090A0F] text-white' : 'bg-[#0B0B0D] text-white'
      }`}
    >
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 border-white/6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigateTab('dashboard')}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 border ${
              isLight
                ? 'bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-100 shadow-sm'
                : 'bg-[#16171D] border-white/8 hover:border-[#DCFF7D]/40 text-neutral-300 hover:text-white'
            }`}
            title="Back to Dashboard"
          >
            <ArrowLeft className={`w-5 h-5 ${isLight ? 'text-neutral-900' : 'text-neutral-300'}`} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                Support & Documentation
              </h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isLight
                  ? 'bg-neutral-200 border-neutral-300 text-neutral-700'
                  : isCobalt
                  ? 'bg-[#2F6BFE]/20 text-[#60A5FA] border-[#2F6BFE]/30'
                  : 'bg-[#DCFF7D]/15 text-[#DCFF7D] border-[#DCFF7D]/30'
              }`}>
                v{APP_CURRENT_VERSION}
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Everything you need to stream movies, play hi-fi music, download media, and troubleshoot.
            </p>
          </div>
        </div>

        {/* Quick Online Status & Update Check Button */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isOnline
              ? isLight
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Network Online' : 'Offline Mode'}</span>
          </div>

          <button
            onClick={handleManualCheckUpdate}
            disabled={checkingUpdate}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isLight
                ? 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-200 shadow-sm'
                : isCobalt
                ? 'bg-[#1E2230] hover:bg-[#252B3D] text-white border-white/10'
                : 'bg-[#1C1C20] hover:bg-[#25252B] text-white border-white/10'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? 'Checking...' : 'Check Updates'}</span>
          </button>
        </div>
      </div>

      {updateStatus && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            updateStatus.includes('New version')
              ? 'bg-[#DCFF7D]/15 border-[#DCFF7D]/40 text-[#DCFF7D]'
              : 'bg-white/5 border-white/10 text-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>{updateStatus}</span>
          </div>
          <button
            onClick={() => setUpdateStatus(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* 2. Key Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Film,
            title: 'Movies & Series',
            desc: '1080p Ultra HD streaming, auto failover, episode navigator, and ad blocking.',
            action: () => onNavigateTab('movies'),
            btn: 'Browse Catalog',
          },
          {
            icon: Headphones,
            title: 'Hi-Fi Music Player',
            desc: 'Offline local library scanner, synced .lrc lyrics, and floating background notch.',
            action: () => onNavigateTab('music'),
            btn: 'Open Player',
          },
          {
            icon: Download,
            title: 'YT-DLP Downloader',
            desc: 'Save 4K videos and music from YouTube, Twitter/X, and 1000+ web platforms.',
            action: () => onNavigateTab('ytdlp'),
            btn: 'Download Media',
          },
          {
            icon: Server,
            title: 'BDIX Media Hub',
            desc: 'Direct high-speed local FTP mirrors for games, software, ISOs, and movies.',
            action: () => onNavigateTab('ftp'),
            btn: 'Explore Network',
          },
        ].map((mod, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -3 }}
            className={`p-5 rounded-3xl flex flex-col justify-between transition-all ${cardClass}`}
          >
            <div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3.5 ${
                isLight
                  ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                  : isCobalt
                  ? 'bg-[#2F6BFE]/20 text-[#60A5FA] border border-[#2F6BFE]/30'
                  : 'bg-[#DCFF7D]/15 text-[#DCFF7D] border border-[#DCFF7D]/30'
              }`}>
                <mod.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-1">{mod.title}</h3>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {mod.desc}
              </p>
            </div>
            <button
              onClick={mod.action}
              className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isLight
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-neutral-200'
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
              }`}
            >
              {mod.btn}
            </button>
          </motion.div>
        ))}
      </div>

      {/* 3. Keyboard Shortcuts Cheatsheet */}
      <div className={`p-6 sm:p-7 rounded-3xl ${cardClass}`}>
        <div className="flex items-center justify-between pb-4 border-b border-white/8 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-neutral-100 text-neutral-900' : 'bg-white/10 text-white'
            }`}>
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Global Keyboard Shortcuts</h2>
              <p className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Navigate and control playback with rapid single-key commands
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isLight ? 'bg-neutral-100 border-neutral-200 text-neutral-600' : 'bg-white/5 border-white/10 text-neutral-400'
          }`}>
            Typing-Safe
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SHORTCUTS.map((s, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-colors ${subCardClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <kbd className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border shadow-sm ${
                  isLight
                    ? 'bg-white border-neutral-300 text-neutral-900'
                    : 'bg-[#121316] border-white/15 text-[#DCFF7D]'
                }`}>
                  {s.key}
                </kbd>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {s.scope}
                </span>
              </div>
              <p className={`text-xs font-medium leading-snug ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Frequently Asked Questions (Interactive Accordion) */}
      <div className={`p-6 sm:p-7 rounded-3xl ${cardClass}`}>
        <div className="flex items-center gap-3 pb-4 border-b border-white/8 mb-5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isLight ? 'bg-neutral-100 text-neutral-900' : 'bg-white/10 text-white'
          }`}>
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Frequently Asked Questions</h2>
            <p className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Common troubleshooting steps and usage explanations
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? isLight
                      ? 'bg-neutral-50 border-neutral-300'
                      : 'bg-[#1C1E26] border-white/15'
                    : subCardClass
                }`}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left cursor-pointer gap-3"
                >
                  <div className="flex items-center gap-3">
                    <faq.icon className={`w-4 h-4 flex-shrink-0 ${
                      isLight ? 'text-neutral-800' : isCobalt ? 'text-[#60A5FA]' : 'text-[#DCFF7D]'
                    }`} />
                    <span className="text-sm font-bold">{faq.q}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className={`px-4 pb-4 pt-1 text-xs leading-relaxed border-t ${
                    isLight ? 'border-neutral-200 text-neutral-600' : 'border-white/5 text-neutral-300'
                  }`}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Community & Project Links */}
      <div className={`p-6 sm:p-7 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${cardClass}`}>
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Community & Feedback</span>
          </h3>
          <p className={`text-xs mt-1 max-w-xl leading-relaxed ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
            Encountered a streaming bug or want to request a feature? Visit our project repository or open an issue directly.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => openDownloadLink('https://github.com')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-neutral-900 hover:bg-black text-white'
                : isCobalt
                ? 'bg-[#2F6BFE] hover:bg-[#3B82F6] text-white'
                : 'bg-[#DCFF7D] hover:bg-[#cbf764] text-[#0B0B0D]'
            }`}
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
