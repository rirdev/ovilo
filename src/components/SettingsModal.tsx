import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Palette,
  Server,
  Cloud,
  Check,
  Key,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings } from '../types';
import { saveSettings } from '../services/api';
import {
  getLocalProfile,
  saveProfile,
  UserProfile,
} from '../services/firebaseSync';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClearHistory: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearHistory,
  onProfileUpdated,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'theme' | 'streaming'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(getLocalProfile());

  // Form states
  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [password, setPassword] = useState('');
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  // Streaming settings states
  const [apiKey, setApiKey] = useState(settings.custom_tmdb_api_key);
  const [server, setServer] = useState(settings.preferred_server);
  const [autoPlay, setAutoPlay] = useState(settings.auto_play_next);
  const [highQuality, setHighQuality] = useState(settings.high_quality_posters);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const p = getLocalProfile();
    setProfile(p);
    if (p) {
      setName(p.name);
      setUsername(p.username || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const isGuest = !username.trim();
    const updated: UserProfile = {
      name: name.trim(),
      username: isGuest ? undefined : username.trim().toLowerCase(),
      isGuest,
      createdAt: profile?.createdAt || Date.now(),
    };

    const res = await saveProfile(updated, password.trim() || undefined);
    if (res.success) {
      setProfile(updated);
      onProfileUpdated?.(updated);
      setUpgradeMsg(
        isGuest
          ? 'Profile name updated!'
          : 'Connected to cloud account successfully!'
      );
      setTimeout(() => setUpgradeMsg(null), 3000);
    } else {
      setUpgradeMsg(res.message || 'Error updating account.');
    }
  };

  const handleSaveStreaming = async () => {
    const newSettings: AppSettings = {
      ...settings,
      custom_tmdb_api_key: apiKey.trim(),
      preferred_server: server,
      auto_play_next: autoPlay,
      high_quality_posters: highQuality,
    };
    await saveSettings(newSettings);
    onUpdateSettings(newSettings);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleSwitchAccount = () => {
    try {
      localStorage.removeItem('ovilo_user_profile');
      localStorage.removeItem('ovilo_favorites');
      localStorage.removeItem('ovilo_watch_history');
      localStorage.removeItem('ovilo_music_favorites');
      localStorage.removeItem('ovilo_cloud_accounts');
    } catch {}
    window.location.reload();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-2xl bg-[#131317] border border-white/10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#DCFF7D] flex items-center justify-center text-[#0B0B0D] font-black text-xs shadow-md">
                O
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Settings & Preferences</h3>
                <p className="text-[11px] text-neutral-400">Manage profile, cloud sync, theme and streaming</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/8 bg-[#16161B] overflow-x-auto no-scrollbar">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'account', label: 'Account & Cloud', icon: Cloud },
              { id: 'theme', label: 'Theme & Style', icon: Palette },
              { id: 'streaming', label: 'Streaming & Servers', icon: Server },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-[#DCFF7D] text-[#DCFF7D] bg-white/5'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#1A1A20] border border-white/6">
                  <div className="w-16 h-16 rounded-2xl bg-[#DCFF7D] text-[#0B0B0D] font-extrabold text-2xl flex items-center justify-center shadow-md">
                    {(profile?.name || 'G')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{profile?.name || 'Guest User'}</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {profile?.isGuest ? 'Local Guest Profile' : `@${profile?.username}`}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        profile?.isGuest
                          ? 'bg-neutral-800 text-neutral-300'
                          : 'bg-[#DCFF7D]/15 text-[#DCFF7D] border border-[#DCFF7D]/30'
                      }`}>
                        {profile?.isGuest ? 'Guest (Local Only)' : 'Cloud Synced'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[#1A1A20] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#DCFF7D]"
                  />
                </div>

                {upgradeMsg && (
                  <p className="text-xs text-[#DCFF7D] font-semibold">{upgradeMsg}</p>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#DCFF7D] text-[#0B0B0D] font-bold text-xs hover:bg-[#cbf764] transition-all cursor-pointer shadow-md"
                >
                  Save Profile
                </button>
              </form>
            )}

            {/* TAB 2: ACCOUNT & CLOUD */}
            {activeTab === 'account' && (
              <div className="space-y-5">
                {/* Status card */}
                <div className="p-4 rounded-2xl bg-[#1A1A20] border border-white/8 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-[#DCFF7D]" />
                      <h4 className="text-sm font-bold text-white">Cloud Account & Sync</h4>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#DCFF7D]/15 text-[#DCFF7D] font-mono font-bold">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Cloud Sync ensures your favorite movies, TV watch progress, and favorite music playlists are stored securely and persist if you reinstall or switch computers.
                  </p>
                </div>

                {profile?.isGuest ? (
                  /* Upgrade from Guest to Cloud */
                  <form onSubmit={handleSaveProfile} className="space-y-4 p-5 rounded-2xl bg-[#16161B] border border-white/8">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#DCFF7D]" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Connect Cloud Sync Account
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Add a username and password to back up your favorites and watch history to your cloud account.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Choose a Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. robin_hood"
                        required
                        className="w-full bg-[#1F1F26] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#DCFF7D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-[#1F1F26] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#DCFF7D]"
                      />
                    </div>

                    {upgradeMsg && (
                      <p className="text-xs text-[#DCFF7D] font-semibold">{upgradeMsg}</p>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#DCFF7D] text-[#0B0B0D] font-bold text-xs hover:bg-[#cbf764] transition-all cursor-pointer shadow-md"
                    >
                      Connect & Sync to Cloud
                    </button>
                  </form>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#16161B] border border-white/8 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#DCFF7D]">
                      <Check className="w-4 h-4" />
                      <span>Cloud Sync Active for @{profile?.username}</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      All your favorites, history, and playlists sync continuously with your cloud account.
                    </p>
                  </div>
                )}

                {/* Account Actions */}
                <div className="pt-3 border-t border-white/8 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white">Log Out / Switch Account</h5>
                    <p className="text-[11px] text-neutral-500">Reset local login state to sign into another account</p>
                  </div>
                  <button
                    onClick={handleSwitchAccount}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Switch Profile</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-white/8 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white">Clear Watch History</h5>
                    <p className="text-[11px] text-neutral-500">Remove all local and cloud watch history entries</p>
                  </div>
                  <button
                    onClick={onClearHistory}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: THEME & STYLE */}
            {activeTab === 'theme' && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-[#1A1A20] border border-white/8 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Select Appearance Theme</h4>
                    <p className="text-xs text-neutral-400">Choose between high-contrast dark or crisp porcelain light mode</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {/* Option 1: Dark */}
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        theme === 'dark'
                          ? 'bg-[#141418] border-[#DCFF7D] ring-2 ring-[#DCFF7D]/25'
                          : 'bg-[#141418]/60 hover:bg-[#141418] border-white/8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-6 h-6 rounded-lg bg-[#0B0B0D] border border-white/10 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#DCFF7D] theme-swatch-lime" style={{ backgroundColor: '#DCFF7D' }} />
                        </div>
                        {theme === 'dark' && <Check className="w-4 h-4 text-[#DCFF7D]" style={{ color: '#DCFF7D' }} />}
                      </div>
                      <p className="text-xs font-bold text-white">Obsidian</p>
                      <span className="text-[10px] text-neutral-400">Lime dark</span>
                    </button>

                    {/* Option 2: Light */}
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        theme === 'light'
                          ? 'bg-neutral-100 border-neutral-900 ring-2 ring-neutral-900/25'
                          : 'bg-[#141418]/60 hover:bg-[#141418] border-white/8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-6 h-6 rounded-lg bg-[#F4F5F7] border border-black/10 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#111111]" />
                        </div>
                        {theme === 'light' && <Check className="w-4 h-4 text-neutral-900" />}
                      </div>
                      <p className="text-xs font-bold text-white">Porcelain</p>
                      <span className="text-[10px] text-neutral-400">Minimal light</span>
                    </button>

                    {/* Option 3: Cobalt */}
                    <button
                      type="button"
                      onClick={() => setTheme('cobalt')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        theme === 'cobalt'
                          ? 'bg-[#17181D] border-[#2F6BFE] ring-2 ring-[#2F6BFE]/30'
                          : 'bg-[#141418]/60 hover:bg-[#141418] border-white/8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-6 h-6 rounded-lg bg-[#090A0F] border border-[#2F6BFE]/30 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#2F6BFE]" />
                        </div>
                        {theme === 'cobalt' && <Check className="w-4 h-4 text-[#2F6BFE]" />}
                      </div>
                      <p className="text-xs font-bold text-white">Cobalt</p>
                      <span className="text-[10px] text-neutral-400">Midnight slate</span>
                    </button>
                  </div>
                </div>

                {/* Poster Quality Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1A1A20] border border-white/6">
                  <div>
                    <h5 className="text-xs font-bold text-white">High Quality Backdrop Posters</h5>
                    <p className="text-[11px] text-neutral-400">Load crisp 500w / original TMDB artwork</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={highQuality}
                    onChange={(e) => setHighQuality(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#DCFF7D] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: STREAMING & SERVERS */}
            {activeTab === 'streaming' && (
              <div className="space-y-5">
                {/* TMDB API Key */}
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#DCFF7D]" />
                      Custom TMDB API Key (v3)
                    </span>
                    <span className="text-[11px] font-normal text-neutral-500 normal-case">
                      Optional (Default key built-in)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste TMDB v3 API Key (leave empty for built-in)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#DCFF7D]"
                  />
                </div>

                {/* Preferred Stream Provider */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                    <Server className="w-3.5 h-3.5 text-[#DCFF7D]" />
                    Default Streaming Engine
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'vidsrc_ru', name: 'VidSrc.ru (Official)', badge: '1080p Fast' },
                      { id: 'vidlink', name: 'VidLink (Ad-Free Engine)', badge: 'No Ads' },
                      { id: 'vidsrc_cc', name: 'VidSrc.cc (v2 Multi-Sub)', badge: 'Adaptive' },
                      { id: 'superembed', name: 'SuperEmbed (Multi-Host)', badge: 'Failover' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServer(s.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          server === s.id
                            ? 'bg-[#DCFF7D]/10 border-[#DCFF7D] text-white'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{s.name}</span>
                          {server === s.id && <Check className="w-3.5 h-3.5 text-[#DCFF7D]" />}
                        </div>
                        <span className="text-[10px] text-neutral-400">{s.badge}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Play Next */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <h5 className="text-xs font-bold text-white">Auto-Play Next Episode</h5>
                    <p className="text-[11px] text-neutral-400">Automatically queue and play the next episode</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#DCFF7D] cursor-pointer"
                  />
                </div>

                {savedMessage && (
                  <p className="text-xs text-[#DCFF7D] font-bold">Settings saved successfully!</p>
                )}

                <button
                  type="button"
                  onClick={handleSaveStreaming}
                  className="px-5 py-2.5 rounded-xl bg-[#DCFF7D] text-[#0B0B0D] font-bold text-xs hover:bg-[#cbf764] transition-all cursor-pointer shadow-md"
                >
                  Save Streaming Settings
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
