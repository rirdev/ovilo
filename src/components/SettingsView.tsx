import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  Palette,
  Server,
  HardDrive,
  Edit3,
  Check,
  Cloud,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Lock,
  Database,
  Film,
  Music,
  ArrowLeft,
  Camera,
  Upload,
  LogOut,
  LogIn,
  UserPlus,
  Mail,
  DownloadCloud,
  Download,
  Globe,
} from 'lucide-react';
import { AppSettings, UserData } from '../types';
import { saveSettings } from '../services/api';
import {
  getLocalProfile,
  saveProfile,
  signUpUser,
  signInUser,
  USERNAME_REGEX,
  UserProfile,
  syncToCloud,
  getLocalMusicFavorites,
} from '../services/firebaseSync';
import {
  APP_CURRENT_VERSION,
  AppUpdateData,
  checkAppUpdatesManual,
  subscribeToAppUpdates,
  openDownloadLink,
} from '../services/updateService';
import { ProfileImageCropModal } from './ProfileImageCropModal';
import { useTheme, AppTheme } from '../context/ThemeContext';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  history: UserData['history'];
  favorites: UserData['favorites'];
  onClearHistory: () => void;
  onNavigateTab: (tab: string) => void;
  previousTab?: string;
  onBack?: () => void;
}

type SettingsSection = 'profile' | 'security' | 'theme' | 'streaming' | 'data' | 'updates';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  history,
  favorites,
  onClearHistory,
  onNavigateTab,
  previousTab,
  onBack,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // User Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    return (
      getLocalProfile() || {
        name: 'Guest User',
        isGuest: true,
        createdAt: Date.now(),
      }
    );
  });

  const { theme, setTheme } = useTheme();
  const isLight = theme === 'light';
  const isCobalt = theme === 'cobalt';
  const [themeToast, setThemeToast] = useState(false);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (['F1', 'F2', 'F3', 'F4', 'F5'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'F1') setActiveSection('profile');
        if (e.key === 'F2') setActiveSection('security');
        if (e.key === 'F3') setActiveSection('theme');
        if (e.key === 'F4') setActiveSection('streaming');
        if (e.key === 'F5') setActiveSection('data');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editBio, setEditBio] = useState(profile.bio || 'Native Media Enthusiast');
  const [profileSavedToast, setProfileSavedToast] = useState(false);
  const [photoToast, setPhotoToast] = useState(false);
  const [logoutToast, setLogoutToast] = useState(false);

  const handleSelectTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    onUpdateSettings({ ...settings, theme: newTheme });
    saveSettings({ ...settings, theme: newTheme }).catch((e) => console.warn(e));
    setThemeToast(true);
    setTimeout(() => setThemeToast(false), 2400);

    if (!profile.isGuest && profile.username) {
      saveProfile({ ...profile, theme: newTheme });
      syncToCloud(profile.username, { theme: newTheme }).catch(console.warn);
    }
  };

  // Profile Image Upload & Crop Modal
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // Guest to Cloud Account Transition State
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [signinIdentifier, setSigninIdentifier] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Streaming settings state
  const [tmdbKey] = useState(settings.custom_tmdb_api_key || '');
  const [preferredServer, setPreferredServer] = useState(settings.preferred_server || 'vidsrc_ru');
  const [autoPlayNext, setAutoPlayNext] = useState(settings.auto_play_next ?? true);
  const [highQualityPosters, setHighQualityPosters] = useState(settings.high_quality_posters ?? true);
  const [serverSavedToast, setServerSavedToast] = useState(false);

  // Cloud Sync Status state
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncDoneToast, setSyncDoneToast] = useState(false);

  // App Cloud Updates state
  const [updateData, setUpdateData] = useState<AppUpdateData | null>(null);
  const [isUpdateChecking, setIsUpdateChecking] = useState(false);
  const [isUpdateAvail, setIsUpdateAvail] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('Just now');

  React.useEffect(() => {
    const unsub = subscribeToAppUpdates((up, newer) => {
      setUpdateData(up);
      setIsUpdateAvail(newer);
    });
    return () => unsub();
  }, []);

  const handleManualCheckUpdates = async () => {
    setIsUpdateChecking(true);
    try {
      const res = await checkAppUpdatesManual();
      setUpdateData(res.update);
      setIsUpdateAvail(res.isNewer);
      const now = new Date();
      setLastCheckedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsUpdateChecking(false);
    }
  };

  const localMusicCount = getLocalMusicFavorites().length;

  // Handle Image File Selection from Disk
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImageFile(e.target.files[0]);
      setCropModalOpen(true);
      e.target.value = ''; // Reset input to allow selecting same file again
    }
  };

  // Handle Photo Saved from Cropper
  const handleAvatarSaved = async (avatarUrl: string) => {
    const updated: UserProfile = {
      ...profile,
      avatarUrl,
    };
    await saveProfile(updated);
    setProfile(updated);
    if (!profile.isGuest && profile.username) {
      syncToCloud(profile.username, { avatarUrl }).catch(console.warn);
    }
    setPhotoToast(true);
    setTimeout(() => setPhotoToast(false), 2500);
  };

  // Handle Remove Photo
  const handleRemovePhoto = async () => {
    const updated: UserProfile = {
      ...profile,
      avatarUrl: undefined,
    };
    await saveProfile(updated);
    setProfile(updated);
    if (!profile.isGuest && profile.username) {
      syncToCloud(profile.username, { avatarUrl: '' }).catch(console.warn);
    }
    setPhotoToast(true);
    setTimeout(() => setPhotoToast(false), 2500);
  };

  // Handle Save Profile Information
  const handleSaveProfile = async () => {
    const chosenName = editName.trim() || profile.name;
    const chosenBio = editBio.trim() || profile.bio;
    const updated: UserProfile = {
      ...profile,
      name: chosenName,
      bio: chosenBio,
    };
    await saveProfile(updated);
    setProfile(updated);

    // Update directly in Cloud Firestore
    if (!profile.isGuest && profile.username) {
      syncToCloud(profile.username, { name: chosenName, bio: chosenBio }).catch(console.warn);
    }

    setIsEditingProfile(false);
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2500);
  };

  // Handle Sign Up from Guest Mode
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanUsername = signupUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setAuthError('Please choose a username.');
      return;
    }
    if (!USERNAME_REGEX.test(cleanUsername)) {
      setAuthError('Username must be 3-24 characters and only contain letters, numbers, dots, and hyphens (no slashes).');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    setIsAuthSubmitting(true);
    const chosenName = signupName.trim() || editName.trim() || cleanUsername;
    const res = await signUpUser({
      name: chosenName,
      username: cleanUsername,
      email: signupEmail.trim(),
      password: signupPassword.trim(),
      theme,
    });
    setIsAuthSubmitting(false);

    if (!res.success || !res.profile) {
      setAuthError(res.message || 'Failed to create account.');
      return;
    }

    // Create clean profile for new account
    const newProfile: UserProfile = {
      ...res.profile,
      name: chosenName,
      avatarUrl: profile.avatarUrl || res.profile.avatarUrl,
      bio: editBio || res.profile.bio || 'Media Enthusiast',
    };
    await saveProfile(newProfile, signupPassword.trim());
    setProfile(newProfile);
    setEditName(chosenName);

    // Initialize clean, isolated library state in Cloud Firestore
    syncToCloud(cleanUsername, {
      name: chosenName,
      favorites: [],
      movieFavorites: [],
      history: [],
      watchHistory: [],
      musicFavorites: [],
      theme,
      avatarUrl: newProfile.avatarUrl,
    }).catch(console.warn);

    // Switch active session to completely fresh library (no leakage from previous account)
    window.dispatchEvent(
      new CustomEvent('ovilo_account_switched', {
        detail: {
          profile: newProfile,
          data: {
            favorites: [],
            movieFavorites: [],
            history: [],
            watchHistory: [],
            musicFavorites: [],
            theme,
            avatarUrl: newProfile.avatarUrl,
          },
        },
      })
    );

    setAuthSuccessMsg(`Account @${cleanUsername} created and connected!`);
    setUpgradeSuccess(true);
    setTimeout(() => {
      setUpgradeSuccess(false);
      setAuthSuccessMsg(null);
    }, 3500);
  };

  // Handle Sign In from Guest Mode
  const handleSignInExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const identifier = signinIdentifier.trim();
    if (!identifier) {
      setAuthError('Please enter your username or email.');
      return;
    }
    if (identifier.includes('/')) {
      setAuthError('Invalid username or email format. Slashes are not allowed.');
      return;
    }
    if (!signinPassword.trim()) {
      setAuthError('Please enter your password.');
      return;
    }

    setIsAuthSubmitting(true);
    const res = await signInUser(identifier, signinPassword.trim());
    setIsAuthSubmitting(false);

    if (!res.success || !res.profile) {
      setAuthError(res.message || 'Invalid username or password.');
      return;
    }

    setProfile(res.profile);
    setEditName(res.profile.name);
    setEditBio(res.profile.bio || '');

    // Dispatch clear and reload event with the new account's data
    window.dispatchEvent(
      new CustomEvent('ovilo_account_switched', {
        detail: {
          profile: res.profile,
          data: res.data,
        },
      })
    );

    setAuthSuccessMsg(`Welcome back, ${res.profile.name}!`);
    setUpgradeSuccess(true);
    setTimeout(() => {
      setUpgradeSuccess(false);
      setAuthSuccessMsg(null);
    }, 3500);
  };

  // Handle Logout (Clear active session, wipe client caches, open Welcome / Auth modal)
  const handleLogout = async () => {
    // 1. Wipe all local user caches and state
    try {
      localStorage.removeItem('ovilo_favorites');
      localStorage.removeItem('ovilo_watch_history');
      localStorage.removeItem('ovilo_music_favorites');
      localStorage.removeItem('ovilo_cloud_accounts');
      localStorage.removeItem('ovilo_user_profile');
      localStorage.removeItem('ovilo_onboarding_completed');
    } catch {}

    // 2. Clear active session library across state, storage & Rust backend
    window.dispatchEvent(new Event('ovilo_clear_library'));

    setSignupUsername('');
    setSignupPassword('');
    setSigninIdentifier('');
    setSigninPassword('');
    setAuthError(null);
    setLogoutToast(true);
    setTimeout(() => {
      setLogoutToast(false);
      window.dispatchEvent(new Event('ovilo_open_login_modal'));
    }, 400);
  };

  // Handle Manual Cloud Sync
  const handleManualSync = async () => {
    if (!profile.username || profile.isGuest) return;
    setIsSyncingNow(true);
    try {
      await syncToCloud(profile.username, {
        favorites,
        history,
        musicFavorites: getLocalMusicFavorites(),
      });
      setSyncDoneToast(true);
      setTimeout(() => setSyncDoneToast(false), 2500);
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Save Streaming Server & TMDB Settings
  const handleSaveStreaming = async () => {
    const updated: AppSettings = {
      ...settings,
      custom_tmdb_api_key: tmdbKey.trim(),
      preferred_server: preferredServer,
      auto_play_next: autoPlayNext,
      high_quality_posters: highQualityPosters,
    };
    await saveSettings(updated);
    onUpdateSettings(updated);
    setServerSavedToast(true);
    setTimeout(() => setServerSavedToast(false), 2500);
  };

  const navItems: { id: SettingsSection; label: string; icon: any }[] = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'security', label: 'Cloud & Security', icon: Shield },
    { id: 'theme', label: 'Theme & Display', icon: Palette },
    { id: 'streaming', label: 'Streaming & Servers', icon: Server },
    { id: 'data', label: 'Storage & Cache', icon: HardDrive },
    { id: 'updates', label: 'About & Updates', icon: DownloadCloud },
  ];

  // Systematic Theme Surface Tokens (Color System & Dark Mode Design Skills)
  const containerClass = isLight
    ? 'bg-[#F4F5F7] text-neutral-900'
    : isCobalt
    ? 'bg-[#080D1A] text-white'
    : 'bg-[#0B0B0D] text-white';

  const cardClass = isLight
    ? 'bg-white border border-neutral-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-neutral-900'
    : 'bg-[#17181d] border border-white/8 text-white shadow-xl';

  const subCardClass = isLight
    ? 'bg-neutral-50 border border-neutral-200 text-neutral-900'
    : 'bg-[#202127] border border-white/8 text-white';

  const inputClass = isLight
    ? 'bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900'
    : isCobalt
    ? 'bg-[#16171F] border border-white/10 text-white placeholder-neutral-500 focus:border-[#2F6BFE]'
    : 'bg-[#121214] border border-white/10 text-white placeholder-neutral-500 focus:border-[#DCFF7D]';

  const primaryBtnClass = isLight
    ? 'bg-neutral-900 hover:bg-black text-white font-bold'
    : isCobalt
    ? 'bg-[#2F6BFE] hover:bg-[#437BFE] text-white font-bold'
    : 'bg-[#DCFF7D] hover:bg-[#cbf764] text-[#0B0B0D] font-bold';

  return (
    <div className={`min-h-full w-full ${containerClass} p-6 sm:p-8 space-y-8 select-none pb-28 transition-colors`}>
      {/* 1. Top Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${isLight ? 'border-neutral-200' : 'border-white/6'} pb-6`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                onNavigateTab(previousTab && previousTab !== 'settings' ? previousTab : 'dashboard');
              }
            }}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 border ${
              isLight
                ? 'bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-100 shadow-sm'
                : 'bg-[#161619] border-white/8 hover:border-[#DCFF7D]/40 text-neutral-300 hover:text-white'
            }`}
            title={
              previousTab && previousTab !== 'settings'
                ? `Back to ${previousTab.charAt(0).toUpperCase() + previousTab.slice(1)}`
                : 'Back to Dashboard'
            }
          >
            <ArrowLeft className={`w-5 h-5 ${isLight ? 'text-neutral-900' : 'text-neutral-300'}`} />
          </button>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>App & Account Settings</h1>
            <p className={`text-xs sm:text-sm mt-0.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'} max-w-prose`}>
              Manage your personal profile, cloud sync, security, and streaming preferences
            </p>
          </div>
        </div>

        {/* Global Sync Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              profile.isGuest
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-[#DCFF7D]/10 text-[#DCFF7D] border-[#DCFF7D]/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                profile.isGuest ? 'bg-amber-400' : 'bg-[#DCFF7D]'
              }`}
            />
            <span>{profile.isGuest ? 'Local Standalone Mode' : 'Cloud Sync Active'}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* LEFT COLUMN: Navigation Rail (3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? isLight
                        ? 'bg-neutral-900 text-white font-bold shadow-sm theme-btn-dark'
                        : isCobalt
                        ? 'bg-[#2F6BFE] text-white font-bold shadow-md shadow-[#2F6BFE]/25'
                        : 'bg-[#DCFF7D] text-[#0B0B0D] font-bold shadow-md shadow-[#DCFF7D]/20'
                      : isLight
                      ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent'
                      : 'text-neutral-400 hover:text-white hover:bg-[#161619] border border-transparent hover:border-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Danger zone / Reset action in left rail */}
          <div className={`pt-6 border-t ${isLight ? 'border-neutral-200' : 'border-white/6'} space-y-2`}>
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-2">
              Storage & Cache
            </p>
            <button
              onClick={onClearHistory}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Watch History</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Content Cards Area (9 cols) */}
        <div className="md:col-span-9 space-y-6">
          {/* ======================================================== */}
          {/* SECTION 1: MY PROFILE                                   */}
          {/* ======================================================== */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              {/* CARD 1: MAIN PROFILE HERO CARD */}
              <div className={`p-6 sm:p-8 rounded-3xl ${cardClass} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}>
                <div className="flex items-center gap-5 min-w-0">
                  {/* Interactive Avatar with Upload / Crop Camera Overlay */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative w-20 h-20 rounded-2xl overflow-hidden font-black text-2xl flex items-center justify-center flex-shrink-0 cursor-pointer border-2 transition-all ${
                      isLight
                        ? 'bg-neutral-900 text-white shadow-md border-neutral-300 hover:border-neutral-900 theme-btn-dark'
                        : 'bg-[#DCFF7D] text-[#0B0B0D] shadow-lg shadow-[#DCFF7D]/20 border-white/10 hover:border-[#DCFF7D]'
                    }`}
                    title="Click to update profile photo"
                  >
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span>{profile.name ? profile.name.slice(0, 2).toUpperCase() : 'OV'}</span>
                    )}

                    {/* Camera icon overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-xs">
                      <Camera className="w-5 h-5 text-[#DCFF7D]" />
                      <span className="text-[9px] font-bold text-white uppercase tracking-wider">Change</span>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                        {profile.name}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          profile.isGuest
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                            : 'bg-[#DCFF7D]/15 text-[#DCFF7D] border border-[#DCFF7D]/25'
                        }`}
                      >
                        {profile.isGuest ? 'Guest (Local Only)' : 'Cloud Synced'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-400 font-medium">
                      {editBio}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-[#DCFF7D]/15 border border-white/10 hover:border-[#DCFF7D]/30 text-[11px] font-semibold text-neutral-300 hover:text-[#DCFF7D] transition-all cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{profile.avatarUrl ? 'Update Photo' : 'Upload Photo'}</span>
                      </button>
                      {profile.avatarUrl && (
                        <button
                          onClick={handleRemovePhoto}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Right Action Buttons: Edit Profile & Log Out */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto flex-shrink-0">
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-[#DCFF7D]/15 border border-white/10 hover:border-[#DCFF7D]/40 text-neutral-300 hover:text-[#DCFF7D] text-xs font-bold transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingProfile ? 'Cancel' : 'Edit Profile'}</span>
                  </button>

                  {!profile.isGuest && (
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                      title="Log out of cloud account"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  )}
                </div>
              </div>

              {/* INLINE EDIT FORM IF ACTIVE */}
              {isEditingProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-3xl ${subCardClass} border space-y-4`}
                >
                  <h3 className="text-sm font-bold text-white">Edit Your Profile</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-400 block mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors border ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-400 block mb-1">
                        Bio / Status
                      </label>
                      <input
                        type="text"
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="e.g. Media Collector & Movie Lover"
                        className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors border ${inputClass}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs cursor-pointer transition-all shadow-md ${primaryBtnClass}`}
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* CARD 2: PERSONAL INFORMATION */}
              <div className={`p-6 sm:p-8 rounded-3xl ${cardClass} space-y-6`}>
                <div className="flex items-center justify-between border-b border-white/6 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Personal Information</h3>
                    <p className="text-xs text-neutral-400">Account identity and device details</p>
                  </div>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-xs text-neutral-500 font-medium block mb-1">
                      Display Name
                    </span>
                    <p className="text-sm font-bold text-white">{profile.name}</p>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 font-medium block mb-1">
                      Username
                    </span>
                    <p className="text-sm font-bold text-white">
                      {profile.username ? `@${profile.username}` : 'Not Set (Guest)'}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 font-medium block mb-1">
                      Account Type
                    </span>
                    <p className="text-sm font-bold text-[#DCFF7D]">
                      {profile.isGuest ? 'Local Standalone' : 'Cloud Synchronized'}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 font-medium block mb-1">
                      Storage Architecture
                    </span>
                    <p className="text-sm font-bold text-white">Local Cache + Cloud Sync</p>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 font-medium block mb-1">
                      Cloud Backup Status
                    </span>
                    <p className="text-sm font-bold text-[#DCFF7D]">
                      {profile.isGuest ? 'Local Standalone' : 'Active & Synchronized'}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-500 font-medium block mb-1">
                      Member Since
                    </span>
                    <p className="text-sm font-bold text-white">
                      {new Date(profile.createdAt || Date.now()).toLocaleDateString(undefined, {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 3: CLOUD SYNC & ACCOUNT STATUS */}
              <div className={`p-6 sm:p-8 rounded-3xl ${cardClass} space-y-6`}>
                <div className="flex items-center justify-between border-b border-white/6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#DCFF7D]/10 text-[#DCFF7D] flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Cloud Account & Synchronization</h3>
                      <p className="text-xs text-neutral-400">
                        {profile.isGuest
                          ? 'Currently saving to this device only'
                          : 'Connected and synchronized across your devices'}
                      </p>
                    </div>
                  </div>

                  {!profile.isGuest && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleManualSync}
                        disabled={isSyncingNow}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          isLight
                            ? 'bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 theme-btn-dark'
                            : 'bg-[#DCFF7D] text-[#0B0B0D] shadow-md shadow-[#DCFF7D]/20 hover:bg-[#cbf168]'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                        <span>{isSyncingNow ? 'Syncing...' : 'Sync Now'}</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                        title="Log Out of Cloud Account"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>

                {profile.isGuest ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 flex-shrink-0 mt-0.5">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-amber-300">Guest Mode Active: </strong>
                        Your library is stored locally on this machine. Create a free account or sign in below to sync your movies, music, playlists, and theme across all your devices.
                      </div>
                    </div>

                    {/* Mode Switcher Tabs */}
                    <div className="flex items-center gap-2 border-b border-white/8 pb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setAuthError(null);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          authMode === 'signup'
                            ? 'bg-[#DCFF7D] text-[#0B0B0D] shadow-md shadow-[#DCFF7D]/20'
                            : 'bg-[#1C1D22] text-neutral-400 hover:text-white border border-white/8'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create New Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setAuthError(null);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          authMode === 'signin'
                            ? 'bg-[#DCFF7D] text-[#0B0B0D] shadow-md shadow-[#DCFF7D]/20'
                            : 'bg-[#1C1D22] text-neutral-400 hover:text-white border border-white/8'
                        }`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In to Existing</span>
                      </button>
                    </div>

                    {/* SIGN UP TAB */}
                    {authMode === 'signup' && (
                      <form onSubmit={handleCreateAccount} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-neutral-400 block mb-1">
                              Your Name
                            </label>
                            <div className="relative">
                              <User className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={signupName}
                                onChange={(e) => setSignupName(e.target.value)}
                                placeholder="e.g. Alex"
                                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs transition-colors border ${inputClass}"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-neutral-400 block mb-1">
                              Choose Username <span className="text-[#DCFF7D]">*</span>
                            </label>
                            <div className="relative">
                              <UserPlus className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={signupUsername}
                                onChange={(e) => setSignupUsername(e.target.value)}
                                placeholder="e.g. alex24"
                                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs transition-colors border ${inputClass}"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-neutral-400 block mb-1">
                              Email <span className="text-neutral-500">(Optional)</span>
                            </label>
                            <div className="relative">
                              <Mail className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="email"
                                value={signupEmail}
                                onChange={(e) => setSignupEmail(e.target.value)}
                                placeholder="alex@example.com"
                                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs transition-colors border ${inputClass}"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-neutral-400 block mb-1">
                              Password <span className="text-[#DCFF7D]">*</span>
                            </label>
                            <div className="relative">
                              <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="password"
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs transition-colors border ${inputClass}"
                              />
                            </div>
                          </div>
                        </div>

                        {authError && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-300">
                            {authError}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            type="submit"
                            disabled={isAuthSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#DCFF7D] text-[#0B0B0D] font-bold text-xs hover:bg-[#cbf168] transition-all cursor-pointer disabled:opacity-60 shadow-lg shadow-[#DCFF7D]/20"
                          >
                            <Cloud className="w-4 h-4" />
                            <span>{isAuthSubmitting ? 'Creating Account...' : 'Create Account & Sync Library'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new Event('ovilo_open_login_modal'))}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                          >
                            <LogIn className="w-3.5 h-3.5 text-[#DCFF7D]" />
                            <span>Open Fullscreen Dialog</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* SIGN IN TAB */}
                    {authMode === 'signin' && (
                      <form onSubmit={handleSignInExisting} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-neutral-400 block mb-1">
                              Username or Email <span className="text-[#DCFF7D]">*</span>
                            </label>
                            <div className="relative">
                              <User className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={signinIdentifier}
                                onChange={(e) => setSigninIdentifier(e.target.value)}
                                placeholder="Username or email"
                                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs transition-colors border ${inputClass}"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-neutral-400 block mb-1">
                              Password <span className="text-[#DCFF7D]">*</span>
                            </label>
                            <div className="relative">
                              <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="password"
                                value={signinPassword}
                                onChange={(e) => setSigninPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs transition-colors border ${inputClass}"
                              />
                            </div>
                          </div>
                        </div>

                        {authError && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-300">
                            {authError}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            type="submit"
                            disabled={isAuthSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#DCFF7D] text-[#0B0B0D] font-bold text-xs hover:bg-[#cbf168] transition-all cursor-pointer disabled:opacity-60 shadow-lg shadow-[#DCFF7D]/20"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>{isAuthSubmitting ? 'Signing In...' : 'Sign In & Restore Library'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new Event('ovilo_open_login_modal'))}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-[#DCFF7D]" />
                            <span>Open Fullscreen Dialog</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl ${subCardClass}">
                        <span className="text-xs text-neutral-400 block mb-1">Status</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-[#DCFF7D]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Active & Connected</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl ${subCardClass}">
                        <span className="text-xs text-neutral-400 block mb-1">Cloud ID</span>
                        <span className="text-sm font-bold text-white">@{profile.username}</span>
                      </div>

                      <div className="p-4 rounded-2xl ${subCardClass}">
                        <span className="text-xs text-neutral-400 block mb-1">Cloud Infrastructure</span>
                        <span className="text-sm font-bold text-white">Global Edge Network</span>
                      </div>
                    </div>

                    {/* Account Session Logout Row */}
                    <div className="pt-4 border-t border-white/6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">Log Out / Switch Account</p>
                        <p className="text-xs text-neutral-400">
                          Disconnect from @{profile.username}. Your watch history and favorites remain safe locally.
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out of Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: SECURITY & CLOUD                             */}
          {/* ======================================================== */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className={`p-6 sm:p-8 rounded-3xl ${cardClass} space-y-6`}>
                <div className="flex items-center justify-between border-b border-white/6 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Cloud Authentication & Security</h3>
                    <p className="text-xs text-neutral-400">Manage your encrypted backup and sync preferences</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl ${subCardClass}">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">End-to-End Encryption</p>
                        <p className="text-xs text-neutral-400">
                          Local credentials and watch sessions encrypted securely
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#DCFF7D]">Active</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl ${subCardClass}">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Real-Time Cloud Synchronization</p>
                        <p className="text-xs text-neutral-400">
                          Continuous bidirectional backup for your watch history and music
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleManualSync}
                      className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-[#DCFF7D] cursor-pointer"
                    >
                      Force Sync
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 3: THEME & APPEARANCE                           */}
          {/* ======================================================== */}
          {activeSection === 'theme' && (
            <div className="space-y-6">
              <div className={`p-6 sm:p-8 rounded-3xl ${cardClass} space-y-6`}>
                <div className="border-b border-white/6 pb-4">
                  <h3 className="text-base font-bold text-white">Theme & Visual Experience</h3>
                  <p className="text-xs text-neutral-400">App appearance and styling preferences</p>
                </div>

                <div className="space-y-5">
                  {/* Theme Accent Preview */}
                  <div>
                    <label className={`text-xs font-semibold ${isLight ? 'text-neutral-500' : 'text-neutral-400'} block mb-3`}>
                      Choose Appearance & Color Palette
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Theme 1: Obsidian Titanium (Default App Theme) */}
                      <button
                        type="button"
                        onClick={() => handleSelectTheme('classic')}
                        className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          theme === 'classic'
                            ? 'bg-[#151515] border-2 border-white'
                            : isLight
                            ? 'bg-neutral-50 hover:bg-white border-neutral-200 hover:border-neutral-300'
                            : 'bg-[#151515]/60 hover:bg-[#151515] border-white/6 hover:border-white/15'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#080808] border border-white/20 flex items-center justify-center relative flex-shrink-0">
                          <div className="w-3.5 h-3.5 rounded-full bg-white theme-swatch-classic" style={{ backgroundColor: '#FFFFFF' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>Obsidian Titanium</p>
                            {theme === 'classic' && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <p className={`text-[11px] ${isLight ? 'text-neutral-500' : 'text-neutral-400'} mt-0.5 line-clamp-2`}>
                            Signature dark graphite with pure white monochrome contrast
                          </p>
                          {theme === 'classic' ? (
                            <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white text-black border border-white">
                              Default Theme
                            </span>
                          ) : (
                            <span className={`inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                              isLight ? 'bg-neutral-100 text-neutral-500 border border-neutral-200' : 'bg-white/5 text-neutral-400 border border-white/10'
                            }`}>
                              Default
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Theme 2: Obsidian Lime */}
                      <button
                        type="button"
                        onClick={() => handleSelectTheme('dark')}
                        className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-[#1C1D22] border-2 border-[#DCFF7D]'
                            : isLight
                            ? 'bg-neutral-50 hover:bg-white border-neutral-200 hover:border-neutral-300'
                            : 'bg-[#1C1D22]/60 hover:bg-[#1C1D22] border-white/6 hover:border-white/15'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#0B0B0D] border border-white/20 flex items-center justify-center relative flex-shrink-0">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#DCFF7D] theme-swatch-lime" style={{ backgroundColor: '#DCFF7D' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>Obsidian Lime</p>
                            {theme === 'dark' && <Check className="w-4 h-4 text-[#DCFF7D]" style={{ color: '#DCFF7D' }} />}
                          </div>
                          <p className={`text-[11px] ${isLight ? 'text-neutral-500' : 'text-neutral-400'} mt-0.5 line-clamp-2`}>
                            High-contrast obsidian surface with energetic lime highlights
                          </p>
                          {theme === 'dark' ? (
                            <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#DCFF7D]/20 text-[#DCFF7D] border border-[#DCFF7D]/40" style={{ backgroundColor: 'rgba(220, 255, 125, 0.2)', color: '#DCFF7D', borderColor: 'rgba(220, 255, 125, 0.4)' }}>
                              Active Theme
                            </span>
                          ) : (
                            <span className={`inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                              isLight ? 'bg-neutral-100 text-neutral-500 border border-neutral-200' : 'bg-white/5 text-neutral-400 border border-white/10'
                            }`}>
                              Lime Accent
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Theme 3: Studio Porcelain */}
                      <button
                        type="button"
                        onClick={() => handleSelectTheme('light')}
                        className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          theme === 'light'
                            ? isLight
                              ? 'bg-white border-2 border-neutral-900'
                              : 'bg-neutral-100 border-2 border-neutral-900'
                            : isLight
                            ? 'bg-neutral-50 hover:bg-white border-neutral-200 hover:border-neutral-300'
                            : 'bg-[#1C1D22]/60 hover:bg-[#1C1D22] border-white/6 hover:border-white/15'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#F4F5F7] border border-neutral-300 flex items-center justify-center relative flex-shrink-0">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#111111]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>Studio Porcelain</p>
                            {theme === 'light' && <Check className="w-4 h-4 text-neutral-900" />}
                          </div>
                          <p className={`text-[11px] ${isLight ? 'text-neutral-500' : 'text-neutral-400'} mt-0.5 line-clamp-2`}>
                            Clean architectural light canvas with pure white & deep onyx contrast
                          </p>
                          {theme === 'light' ? (
                            <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white border border-neutral-800">
                              Active Theme
                            </span>
                          ) : (
                            <span className="inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10">
                              Light Studio
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Theme 4: Midnight Cobalt */}
                      <button
                        type="button"
                        onClick={() => handleSelectTheme('cobalt')}
                        className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          theme === 'cobalt'
                            ? 'bg-[#17181D] border-2 border-[#2F6BFE]'
                            : isLight
                            ? 'bg-neutral-50 hover:bg-white border-neutral-200 hover:border-neutral-300'
                            : 'bg-[#1C1D22]/60 hover:bg-[#1C1D22] border-white/6 hover:border-white/15'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#090A0F] border border-[#2F6BFE]/30 flex items-center justify-center relative flex-shrink-0">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#2F6BFE]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>Midnight Cobalt</p>
                            {theme === 'cobalt' && <Check className="w-4 h-4 text-[#2F6BFE]" />}
                          </div>
                          <p className={`text-[11px] ${isLight ? 'text-neutral-500' : 'text-neutral-400'} mt-0.5 line-clamp-2`}>
                            Aerospace navy slate paired with electric cobalt blue highlights
                          </p>
                          {theme === 'cobalt' ? (
                            <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#2F6BFE]/20 text-[#6993FF] border border-[#2F6BFE]/40">
                              Active Theme
                            </span>
                          ) : (
                            <span className={`inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                              isLight ? 'bg-neutral-100 text-neutral-500 border border-neutral-200' : 'bg-white/5 text-neutral-400 border border-white/10'
                            }`}>
                              Cobalt Accent
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* High Quality Posters */}
                  <div className="flex items-center justify-between p-4 rounded-2xl ${subCardClass}">
                    <div>
                      <p className="text-sm font-bold text-white">Ultra HD Movie Artwork</p>
                      <p className="text-xs text-neutral-400">
                        Load crisp w500 backdrops and high-res album covers
                      </p>
                    </div>
                    <button
                      onClick={() => setHighQualityPosters(!highQualityPosters)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        highQualityPosters ? 'bg-[#DCFF7D]' : 'bg-neutral-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-[#0B0B0D] transition-transform ${
                          highQualityPosters ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: STREAMING & SERVERS                          */}
          {/* ======================================================== */}
          {activeSection === 'streaming' && (
            <div className="space-y-6">
              <div className={`p-6 sm:p-8 rounded-3xl ${cardClass} space-y-6`}>
                <div className="border-b border-white/6 pb-4">
                  <h3 className="text-base font-bold text-white">Streaming Server & Failover</h3>
                  <p className="text-xs text-neutral-400">Configure primary server and multi-source redundancy</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-2">
                      Primary Server Priority
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'vidsrc_ru', name: 'Server Alpha (Fast 1080p)', badge: 'Recommended' },
                        { id: 'vidlink', name: 'Server Beta (Ad-Free & Fast)', badge: 'Ultra HD' },
                        { id: 'vidsrc_cc', name: 'Server Gamma (Multi-Sub)', badge: 'Subtitles' },
                        { id: 'vidsrc_to', name: 'Server Delta (Direct CDN)', badge: 'Direct' },
                      ].map((srv) => (
                        <div
                          key={srv.id}
                          onClick={() => setPreferredServer(srv.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            preferredServer === srv.id
                              ? 'bg-[#DCFF7D]/10 border-[#DCFF7D] text-white'
                              : 'bg-[#1C1D22] border-white/6 text-neutral-300 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{srv.name}</p>
                            <span className="text-[10px] text-neutral-500 font-semibold">{srv.badge}</span>
                          </div>
                          {preferredServer === srv.id && (
                            <Check className="w-4 h-4 text-[#DCFF7D]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto Play Next */}
                  <div className="flex items-center justify-between p-4 rounded-2xl ${subCardClass}">
                    <div>
                      <p className="text-sm font-bold text-white">Auto-Play Next Episode</p>
                      <p className="text-xs text-neutral-400">
                        Automatically advance to next episode when series binge-watching
                      </p>
                    </div>
                    <button
                      onClick={() => setAutoPlayNext(!autoPlayNext)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        autoPlayNext ? 'bg-[#DCFF7D]' : 'bg-neutral-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-[#0B0B0D] transition-transform ${
                          autoPlayNext ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveStreaming}
                      className={`px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md ${primaryBtnClass}`}
                    >
                      Save Streaming Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 5: DATA & STORAGE                               */}
          {/* ======================================================== */}
          {activeSection === 'data' && (
            <div className="space-y-6">
              <div className={`p-6 sm:p-8 rounded-3xl ${cardClass} space-y-6`}>
                <div className="border-b border-white/6 pb-4">
                  <h3 className="text-base font-bold text-white">Media Storage & Offline Cache</h3>
                  <p className="text-xs text-neutral-400">Overview of your locally cached items</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl ${subCardClass}">
                    <div className="flex items-center gap-2.5 text-neutral-400 mb-1">
                      <Film className="w-4 h-4 text-[#DCFF7D]" />
                      <span className="text-xs font-medium">Watch History</span>
                    </div>
                    <p className="text-xl font-bold text-white">{history.length} items</p>
                  </div>

                  <div className="p-4 rounded-2xl ${subCardClass}">
                    <div className="flex items-center gap-2.5 text-neutral-400 mb-1">
                      <Film className="w-4 h-4 text-[#DCFF7D]" />
                      <span className="text-xs font-medium">Saved Movies</span>
                    </div>
                    <p className="text-xl font-bold text-white">{favorites.length} saved</p>
                  </div>

                  <div className="p-4 rounded-2xl ${subCardClass}">
                    <div className="flex items-center gap-2.5 text-neutral-400 mb-1">
                      <Music className="w-4 h-4 text-[#DCFF7D]" />
                      <span className="text-xs font-medium">Favorite Music</span>
                    </div>
                    <p className="text-xl font-bold text-white">{localMusicCount} tracks</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Reset Local Watch History</p>
                    <p className="text-xs text-neutral-400">
                      Permanently clear your continue watching queue
                    </p>
                  </div>
                  <button
                    onClick={onClearHistory}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. APP UPDATES & VERSION MANAGEMENT */}
          {activeSection === 'updates' && (
            <div className="space-y-6">
              <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${cardClass}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/6 pb-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                      isLight
                        ? 'bg-neutral-100 border border-neutral-200 text-neutral-900'
                        : isCobalt
                        ? 'bg-[#2F6BFE]/20 text-[#60A5FA] border border-[#2F6BFE]/30'
                        : 'bg-[#DCFF7D]/15 text-[#DCFF7D] border border-[#DCFF7D]/30'
                    }`}>
                      <DownloadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-extrabold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                        App Updates & Release Channel
                      </h3>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        Manage native desktop client updates and check for the latest releases.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleManualCheckUpdates}
                    disabled={isUpdateChecking}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all border ${
                      isLight
                        ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200'
                        : isCobalt
                        ? 'bg-[#202127] hover:bg-[#282932] text-slate-200 hover:text-white border-white/8'
                        : 'bg-[#202127] hover:bg-[#282932] text-neutral-200 hover:text-white border-white/8'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUpdateChecking ? 'animate-spin' : ''}`} />
                    <span>{isUpdateChecking ? 'Checking Cloud...' : 'Check for Updates'}</span>
                  </button>
                </div>

                {/* Status Hero Card */}
                {isUpdateAvail && updateData ? (
                  /* Update Available Card */
                  <div className={`p-6 rounded-2xl border space-y-4 ${
                    isLight
                      ? 'bg-sky-50 border-sky-200 text-sky-950'
                      : isCobalt
                      ? 'bg-[#2F6BFE]/10 border-[#2F6BFE]/30 text-white'
                      : 'bg-[#DCFF7D]/10 border-[#DCFF7D]/30 text-white'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          isLight
                            ? 'bg-sky-500 text-white'
                            : isCobalt
                            ? 'bg-[#2F6BFE] text-white'
                            : 'bg-[#DCFF7D] text-[#0B0B0D]'
                        }`}>
                          New Update: v{updateData.version}
                        </span>
                        {updateData.releaseDate && (
                          <span className="text-xs text-neutral-400 font-medium">Released {updateData.releaseDate}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDownloadLink(updateData.downloadUrl)}
                          className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                            isLight
                              ? 'bg-neutral-900 hover:bg-neutral-800 text-white'
                              : 'bg-white hover:bg-neutral-200 text-black'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          Download Update (v{updateData.version})
                        </button>
                        <button
                          onClick={() => openDownloadLink('https://ovilo.netlify.app/')}
                          className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors border flex items-center gap-2 cursor-pointer ${
                            isLight
                              ? 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-800'
                              : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Website
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">{updateData.title || `Ovilo v${updateData.version}`}</h4>
                      {updateData.notes && (
                        <div className={`mt-2 p-3.5 rounded-xl text-xs font-mono whitespace-pre-line leading-relaxed ${subCardClass}`}>
                          {updateData.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Up-To-Date Card */
                  <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${subCardClass}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                            You&apos;re up to date
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Current
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                          Ovilo v{APP_CURRENT_VERSION} is currently the latest version.
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-neutral-400">
                      <span>Last checked: {lastCheckedTime}</span>
                    </div>
                  </div>
                )}

                {/* Build Specifications Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className={`p-4 rounded-2xl ${subCardClass}`}>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                      Installed Version
                    </span>
                    <span className={`text-xl font-black font-mono ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                      v{APP_CURRENT_VERSION}
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl ${subCardClass}`}>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                      Release Channel
                    </span>
                    <span className={`text-xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                      Stable
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl ${subCardClass}`}>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                      Platform Target
                    </span>
                    <span className={`text-xl font-black font-mono ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                      Linux x86_64
                    </span>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${subCardClass} ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  <strong>Automatic Cloud Updates:</strong> Whenever a new build is released by the administrator, Ovilo will immediately notify you with release notes and a direct download link. You can also trigger a manual check anytime.
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelect}
        className="hidden"
      />

      {/* Interactive Crop Modal */}
      <ProfileImageCropModal
        isOpen={cropModalOpen}
        imageFile={selectedImageFile}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedImageFile(null);
        }}
        onSelectAnother={() => {
          fileInputRef.current?.click();
        }}
        onSaved={handleAvatarSaved}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {(profileSavedToast || serverSavedToast || syncDoneToast || upgradeSuccess || photoToast || logoutToast || themeToast) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-50 px-5 py-3 rounded-2xl bg-[#1C1C20] border border-[#DCFF7D]/50 text-white flex items-center gap-3 shadow-2xl backdrop-blur-xl"
          >
            <CheckCircle2 className="w-5 h-5 text-[#DCFF7D]" />
            <span className="text-xs font-bold">
              {photoToast && 'Profile photo updated successfully!'}
              {logoutToast && 'Logged out successfully. Switched to Guest Mode.'}
              {themeToast && `Switched theme to ${theme === 'classic' ? 'Obsidian Titanium' : theme === 'dark' ? 'Obsidian Lime' : theme === 'light' ? 'Studio Porcelain' : 'Midnight Cobalt'}!`}
              {profileSavedToast && 'Profile updated successfully!'}
              {serverSavedToast && 'Streaming settings saved!'}
              {syncDoneToast && 'Cloud sync completed!'}
              {upgradeSuccess && (authSuccessMsg || 'Connected to cloud account!')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
