import React, { useState, useRef } from 'react';
import { useTheme, AppTheme } from '../context/ThemeContext';
import {
  getLocalProfile,
  saveProfile,
  signUpUser,
  signInUser,
  UserProfile,
  syncToCloud,
} from '../services/firebaseSync';
import {
  checkAppUpdatesManual,
  APP_CURRENT_VERSION,
} from '../services/updateService';
import { saveSettings } from '../services/api';
import { ProfileImageCropModal } from './ProfileImageCropModal';
import {
  User,
  Palette,
  PlaySquare,
  HardDrive,
  Info,
  Search,
  Camera,
  Upload,
  LogOut,
  LogIn,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Check,
  Edit3,
} from 'lucide-react';
import { AppSettings, UserData } from '../types';

interface ShowcaseSettingsViewProps {
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  history?: UserData['history'];
  favorites?: UserData['favorites'];
  onClearHistory?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ShowcaseSettingsView: React.FC<ShowcaseSettingsViewProps> = ({
  settings,
  onUpdateSettings = () => {},
  history = [],
  favorites = [],
  onClearHistory,
}) => {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(getLocalProfile());

  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // TMDB & Streaming Backend Settings State
  const [tmdbKey, setTmdbKey] = useState(settings?.custom_tmdb_api_key || '');
  const [tmdbSaved, setTmdbSaved] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile?.name || 'Terabyte');
  const [editBio, setEditBio] = useState(profile?.bio || 'Media Collector & Streamer');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth / Login State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // App updates state
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const isGuest = !profile || profile.isGuest || !profile.username;
  const displayName = profile?.username || profile?.name || 'Terabyte';

  const C = ['var(--kino-yellow)', 'var(--kino-coral)', 'var(--kino-peri)', 'var(--kino-mint)'];

  const categories = [
    { title: 'Account & Cloud Sync', desc: 'Sign in, cloud backup & library sync', icon: User },
    { title: 'Appearance & Themes', desc: 'Material 3 themes, dark mode, colors', icon: Palette },
    { title: 'Playback & Streaming', desc: 'Preferred video server, auto-play next', icon: PlaySquare },
    { title: 'Cache & Watch History', desc: 'Clear watch history & local cache', icon: HardDrive },
    { title: 'About & Updates', desc: `OVILO v${APP_CURRENT_VERSION}, check updates`, icon: Info },
  ];

  const themes = [
    { name: 'Classic', color: 'var(--kino-yellow)', id: 'classic' },
    { name: 'Cobalt', color: 'var(--kino-peri)', id: 'cobalt' },
    { name: 'Coral', color: 'var(--kino-coral)', id: 'coral' },
    { name: 'Mint', color: 'var(--kino-mint)', id: 'mint' },
  ];

  // Streaming settings handlers
  const handleUpdatePreferredServer = (server: string) => {
    if (!settings) return;
    const newSettings = { ...settings, preferred_server: server };
    onUpdateSettings(newSettings);
    saveSettings(newSettings).catch(() => {});
  };

  const handleToggleAutoPlayNext = () => {
    if (!settings) return;
    const newSettings = { ...settings, auto_play_next: !settings.auto_play_next };
    onUpdateSettings(newSettings);
    saveSettings(newSettings).catch(() => {});
  };

  const handleToggleHighQualityPosters = () => {
    if (!settings) return;
    const newSettings = { ...settings, high_quality_posters: !settings.high_quality_posters };
    onUpdateSettings(newSettings);
    saveSettings(newSettings).catch(() => {});
  };

  const handleSaveTmdbKey = () => {
    if (!settings) return;
    const newSettings = { ...settings, custom_tmdb_api_key: tmdbKey.trim() };
    onUpdateSettings(newSettings);
    saveSettings(newSettings).catch(() => {});
    setTmdbSaved(true);
    setTimeout(() => setTmdbSaved(false), 2200);
  };

  // Photo Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImageFile(e.target.files[0]);
      setCropModalOpen(true);
    }
  };

  const handleCropComplete = (url: string) => {
    setCropModalOpen(false);
    setSelectedImageFile(null);
    const cur = getLocalProfile() || { name: 'Guest User', isGuest: true, createdAt: Date.now() };
    const updated: UserProfile = { ...cur, avatarUrl: url };
    setProfile(updated);
    saveProfile(updated);
    window.dispatchEvent(new Event('ovilo_profile_updated'));
    if (!cur.isGuest && cur.username) {
      syncToCloud(cur.username, { avatarUrl: url }).catch(() => {});
    }
  };

  // Save Display Name & Bio
  const handleSaveProfile = () => {
    if (!profile) return;
    const updated: UserProfile = { ...profile, name: editName.trim(), bio: editBio.trim() };
    setProfile(updated);
    saveProfile(updated);
    setIsEditingProfile(false);
    window.dispatchEvent(new Event('ovilo_profile_updated'));
    if (!profile.isGuest && profile.username) {
      syncToCloud(profile.username, { name: editName.trim(), bio: editBio.trim() }).catch(() => {});
    }
  };

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authIdentifier.trim() || !authPassword.trim()) {
      setAuthError('Please enter both username and password.');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await signInUser(authIdentifier.trim(), authPassword.trim());
      if (res.success && res.profile) {
        setProfile(res.profile);
        saveProfile(res.profile);
        window.dispatchEvent(new Event('ovilo_profile_updated'));
        setAuthIdentifier('');
        setAuthPassword('');
      } else {
        setAuthError(res.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authIdentifier.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all required fields.');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await signUpUser({
        name: authIdentifier.trim(),
        username: authIdentifier.trim().toLowerCase(),
        password: authPassword.trim(),
        email: authEmail.trim() || undefined,
        theme: (theme as AppTheme) || 'classic',
      });
      if (res.success && res.profile) {
        setProfile(res.profile);
        saveProfile(res.profile);
        window.dispatchEvent(new Event('ovilo_profile_updated'));
        setAuthIdentifier('');
        setAuthPassword('');
      } else {
        setAuthError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogOut = () => {
    localStorage.removeItem('ovilo_user_profile');
    setProfile(null);
    window.dispatchEvent(new Event('ovilo_profile_updated'));
    window.dispatchEvent(new Event('ovilo_open_login_modal'));
  };

  // Manual Sync
  const handleManualSync = async () => {
    if (!profile?.username || isGuest) return;
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await syncToCloud(profile.username, {
        movieFavorites: favorites,
        watchHistory: history,
      });
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  // Check Updates
  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const up = await checkAppUpdatesManual();
      if (up?.isNewer && up.update) {
        setUpdateStatus(`New release available: v${up.update.version}!`);
      } else {
        setUpdateStatus(`Ovilo is up to date! (v${APP_CURRENT_VERSION})`);
      }
    } catch {
      setUpdateStatus('Unable to reach update server.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="w-full select-none font-['DM_Sans',sans-serif] pb-16">
      {/* 1. Header with Search matching Kino sheet 5 */}
      <div className="kino-dh">
        <h1>Settings &amp; Profile</h1>
        <div className="kino-search" style={{ width: '320px' }}>
          <Search className="w-4 h-4 text-[#a9a7a2] flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings, themes, cloud..."
            className="bg-transparent border-0 outline-none text-[#f2efe9] text-[13px] w-full"
          />
        </div>
      </div>

      {/* 2. 2-Column Grid matching Kino .sgrid layout */}
      <div className="kino-sgrid">
        {/* LEFT COLUMN: Profile Card + Category Items */}
        <div>
          {/* Profile Card (.set.prof) with Cloudinary Avatar */}
          <div
            onClick={() => setActiveCategoryIdx(0)}
            className={`kino-set prof cursor-pointer transition-all ${activeCategoryIdx === 0 ? 'on' : ''}`}
            title="Manage Account & Cloud Sync"
          >
            <div className="pa overflow-hidden">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : isGuest ? (
                'G'
              ) : (
                displayName[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <b>{displayName}</b>
                {!isGuest && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#ffd24d]/20 text-[#ffd24d]">
                    Cloud
                  </span>
                )}
              </div>
              <small>
                {isGuest
                  ? 'Local Storage · Click to Sign In'
                  : `@${displayName.toLowerCase()} · Cloud Synchronized`}
              </small>
            </div>
          </div>

          {/* 6 Categories List */}
          {categories.map((c, i) => {
            const Icon = c.icon;
            const active = activeCategoryIdx === i;

            return (
              <div
                key={c.title}
                onClick={() => setActiveCategoryIdx(i)}
                className={`kino-set ${active ? 'on' : ''}`}
              >
                <div className="si" style={{ background: C[i % 4] }}>
                  <Icon className="w-4.5 h-4.5 text-[#141414]" />
                </div>
                <div className="min-w-0">
                  <b>{c.title}</b>
                  <small>{c.desc}</small>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Settings Panel Box (.box) */}
        <div className="kino-box" style={{ padding: '18px 26px 24px' }}>
          <h2 style={{ fontSize: '24px', margin: '6px 0 16px', fontFamily: 'var(--display, sans-serif)', fontWeight: 800 }}>
            {categories[activeCategoryIdx]?.title || 'Settings'}
          </h2>

          {/* ============================================================== */}
          {/* TAB 0: ACCOUNT & CLOUD SYNC (100% REAL WORKING FEATURES)        */}
          {/* ============================================================== */}
          {activeCategoryIdx === 0 && (
            <div className="space-y-6">
              {/* Profile Card Hero */}
              <div
                className="p-5 rounded-2xl border"
                style={{
                  background: 'var(--kino-surface-top)',
                  borderColor: 'var(--kino-line)',
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar with Camera upload button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-18 h-18 rounded-full overflow-hidden flex items-center justify-center font-bold text-2xl cursor-pointer group border-2 border-white/10 hover:border-[#ffd24d] transition-all flex-shrink-0"
                    style={{
                      background: 'var(--kino-surface-hi)',
                      color: 'var(--kino-yellow)',
                    }}
                    title="Click to upload profile photo to Cloudinary"
                  >
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <span>{displayName[0].toUpperCase()}</span>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-0.5">
                      <Camera className="w-4 h-4 text-[#ffd24d]" />
                      <span className="text-[9px] font-bold uppercase">Change</span>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-[#f2efe9]">{displayName}</h3>
                      {isGuest ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-neutral-800 text-neutral-400">
                          Guest (Local Mode)
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#ffd24d]/20 text-[#ffd24d] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cloud Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#a9a7a2] mt-0.5">
                      {isGuest
                        ? 'Your library is stored locally. Sign in to sync across devices.'
                        : `Signed in as @${displayName.toLowerCase()} · Synchronized with Google Cloud Firestore`}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-[#ffd24d] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{profile?.avatarUrl ? 'Update Cloudinary Photo' : 'Upload Cloudinary Photo'}</span>
                      </button>
                      <span className="text-[#a9a7a2]">·</span>
                      <button
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className="text-[11px] font-bold text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isEditingProfile ? 'Cancel' : 'Edit Profile'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Profile Editing Form */}
                {isEditingProfile && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-neutral-400 block mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-[#ffd24d]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-400 block mb-1">Bio</label>
                      <input
                        type="text"
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-[#ffd24d]"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        className="kino-btn y"
                        style={{ height: '32px', padding: '0 16px', fontSize: '11px' }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cloud Sync Actions */}
                {!isGuest && (
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="kino-btn"
                      style={{ height: '34px', padding: '0 16px', fontSize: '12px' }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Syncing...' : syncSuccess ? 'Synced Successfully!' : 'Sync Library Now'}</span>
                    </button>

                    <button
                      onClick={handleLogOut}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out / Switch Account</span>
                    </button>
                  </div>
                )}
              </div>

              {/* If Guest: Sign In / Register Forms */}
              {isGuest && (
                <div
                  className="p-5 rounded-2xl border"
                  style={{
                    background: 'var(--kino-surface-top)',
                    borderColor: 'var(--kino-line)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setAuthMode('signin')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        authMode === 'signin'
                          ? 'bg-[#ffd24d] text-black border-[#ffd24d]'
                          : 'bg-transparent text-neutral-400 border-white/10 hover:text-white'
                      }`}
                    >
                      Sign In to Existing
                    </button>
                    <button
                      onClick={() => setAuthMode('signup')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        authMode === 'signup'
                          ? 'bg-[#ffd24d] text-black border-[#ffd24d]'
                          : 'bg-transparent text-neutral-400 border-white/10 hover:text-white'
                      }`}
                    >
                      Create Free Account
                    </button>
                  </div>

                  {authError && (
                    <div className="p-3 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-400 block mb-1">
                        {authMode === 'signin' ? 'Username or Email' : 'Desired Username'}
                      </label>
                      <input
                        type="text"
                        value={authIdentifier}
                        onChange={(e) => setAuthIdentifier(e.target.value)}
                        placeholder="e.g. terabyte"
                        className="w-full rounded-xl px-3.5 py-2.5 text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-[#ffd24d]"
                      />
                    </div>

                    {authMode === 'signup' && (
                      <div>
                        <label className="text-xs font-medium text-neutral-400 block mb-1">Email (Optional)</label>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full rounded-xl px-3.5 py-2.5 text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-[#ffd24d]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-neutral-400 block mb-1">Password</label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl px-3.5 py-2.5 text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-[#ffd24d]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="kino-btn y w-full"
                      style={{ height: '40px', marginTop: '12px' }}
                    >
                      {authLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : authMode === 'signin' ? (
                        <LogIn className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>{authMode === 'signin' ? 'Sign In & Sync Library' : 'Create Account'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: APPEARANCE & THEMES                                     */}
          {/* ============================================================== */}
          {activeCategoryIdx === 1 && (
            <div>
              {/* Theme Selector */}
              <div className="kino-opt" style={{ display: 'block' }}>
                <b>Theme</b>
                <small>Choose a Material 3 color theme</small>
                <div className="kino-themes">
                  {themes.map((t) => {
                    const isSelected = theme === t.id || (theme === 'dark' && t.id === 'classic');
                    return (
                      <div
                        key={t.name}
                        onClick={() => setTheme(t.id as any)}
                        className={`kino-th2 cursor-pointer ${isSelected ? 'on' : ''}`}
                        style={{ background: t.color }}
                      >
                        {t.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="kino-opt">
                <div>
                  <b>Dark mode</b>
                  <small>Use the immersive OLED dark aesthetic</small>
                </div>
                <div className="sw on tg" />
              </div>

              <div className="kino-opt">
                <div>
                  <b>Now-playing notch</b>
                  <small>Show the dynamic notch while music is playing</small>
                </div>
                <div className="sw on tg" />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: PLAYBACK & STREAMING                                    */}
          {/* ============================================================== */}
          {activeCategoryIdx === 2 && (
            <div className="space-y-3">
              {/* Preferred Streaming Server */}
              <div className="kino-opt" style={{ display: 'block' }}>
                <b>Preferred Video Server</b>
                <small>Select default embed streaming provider for movies and episodes</small>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {[
                    { id: 'vidsrc_ru', label: 'VidSrc RU (Fastest)' },
                    { id: 'vidsrc_cc', label: 'VidSrc CC' },
                    { id: 'vidsrc_xyz', label: 'VidSrc XYZ' },
                    { id: 'superembed', label: 'SuperEmbed (Multi)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleUpdatePreferredServer(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        (settings?.preferred_server || 'vidsrc_ru') === s.id
                          ? 'bg-[#ffd24d] text-black border-[#ffd24d] shadow-sm'
                          : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Play Next Toggle */}
              <div
                onClick={handleToggleAutoPlayNext}
                className="kino-opt cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div>
                  <b>Auto-play next episode</b>
                  <small>Automatically queue and play next episode for series</small>
                </div>
                <div className={`sw tg ${settings?.auto_play_next ? 'on' : ''}`} />
              </div>

              {/* High Quality Posters Toggle */}
              <div
                onClick={handleToggleHighQualityPosters}
                className="kino-opt cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div>
                  <b>High-quality posters</b>
                  <small>Fetch 4K/high-res artwork when on broadband</small>
                </div>
                <div className={`sw tg ${settings?.high_quality_posters ? 'on' : ''}`} />
              </div>

              {/* Custom TMDB API Key */}
              <div className="kino-opt" style={{ display: 'block' }}>
                <b>Custom TMDB API Key (Optional)</b>
                <small>Override the default shared API key with your personal TMDB key</small>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="password"
                    value={tmdbKey}
                    onChange={(e) => setTmdbKey(e.target.value)}
                    placeholder="Enter TMDB v3 API Key..."
                    className="flex-1 rounded-xl px-3 py-2 text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-[#ffd24d]"
                  />
                  <button
                    onClick={handleSaveTmdbKey}
                    className="kino-btn y"
                    style={{ height: '34px', padding: '0 16px', fontSize: '11px' }}
                  >
                    {tmdbSaved ? <Check className="w-3.5 h-3.5" /> : 'Save Key'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CACHE & WATCH HISTORY                                   */}
          {/* ============================================================== */}
          {activeCategoryIdx === 3 && (
            <div className="space-y-3">
              {onClearHistory && (
                <div className="kino-opt">
                  <div>
                    <b>Clear Watch History</b>
                    <small>Remove all watched movies and series from your history</small>
                  </div>
                  <button
                    onClick={onClearHistory}
                    className="kino-btn cursor-pointer"
                    style={{
                      height: '34px',
                      padding: '0 16px',
                      background: 'rgba(255,122,100,0.15)',
                      color: 'var(--kino-coral)',
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                </div>
              )}

              <div className="kino-opt">
                <div>
                  <b>Local TMDB Cache</b>
                  <small>Cached posters, details &amp; episodes metadata</small>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('ovilo_cache_trending');
                    alert('Local poster metadata cache cleared.');
                  }}
                  className="kino-btn cursor-pointer"
                  style={{ height: '34px', padding: '0 16px' }}
                >
                  Clear Cache
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: ABOUT & UPDATES                                         */}
          {/* ============================================================== */}
          {activeCategoryIdx === 4 && (
            <div className="space-y-3">
              <div className="kino-opt">
                <div>
                  <b>App Version</b>
                  <small>OVILO Native Desktop (Rust + Tauri v2 + React)</small>
                </div>
                <span className="text-xs font-bold text-[#ffd24d] font-mono">v{APP_CURRENT_VERSION}</span>
              </div>

              <div className="kino-opt">
                <div>
                  <b>Software Updates</b>
                  <small>{updateStatus || 'Check GitHub / Cloud releases for new versions'}</small>
                </div>
                <button
                  onClick={handleCheckUpdates}
                  disabled={checkingUpdate}
                  className="kino-btn y cursor-pointer"
                  style={{ height: '34px', padding: '0 18px', fontSize: '12px' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  <span>{checkingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cloudinary Profile Image Crop Modal */}
      <ProfileImageCropModal
        isOpen={cropModalOpen}
        imageFile={selectedImageFile}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedImageFile(null);
        }}
        onSelectAnother={() => fileInputRef.current?.click()}
        onSaved={handleCropComplete}
      />
    </div>
  );
};
