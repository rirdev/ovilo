import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  saveProfile,
  signUpUser,
  signInUser,
  USERNAME_REGEX,
  UserProfile,
  CloudUserData,
} from '../services/firebaseSync';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: UserProfile, cloudData?: CloudUserData) => void;
  onClose?: () => void;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  onComplete,
  onClose,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<'form' | 'loading'>('form');

  // Form Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Status & error handling
  const [loadingText, setLoadingText] = useState('Signing you in...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedProfile, setResolvedProfile] = useState<UserProfile | null>(null);
  const [resolvedCloudData, setResolvedCloudData] = useState<CloudUserData | null>(null);

  // Segment indicator ref
  const signInBtnRef = useRef<HTMLButtonElement>(null);
  const signUpBtnRef = useRef<HTMLButtonElement>(null);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setErrorMsg(null);
      setToastMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Auto-hide toast message
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // Loading state delay to show smooth animation before completing
  useEffect(() => {
    if (step === 'loading') {
      const timer = setTimeout(() => {
        if (resolvedProfile) {
          onComplete(resolvedProfile, resolvedCloudData || undefined);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, resolvedProfile, resolvedCloudData, onComplete]);

  if (!isOpen) return null;

  // 1. Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    const identifier = username.trim();
    if (!identifier) {
      setErrorMsg('Please enter your username or email.');
      return;
    }

    if (identifier.includes('/')) {
      setErrorMsg('Invalid username format. Slashes are not allowed.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    setLoadingText('Connecting to cloud & verifying account...');
    const res = await signInUser(identifier, password.trim());
    setIsSubmitting(false);

    if (!res.success || !res.profile) {
      setErrorMsg(res.message || 'Invalid username or password.');
      return;
    }

    setResolvedProfile(res.profile);
    if (res.data) {
      setResolvedCloudData(res.data);
    }
    try {
      localStorage.setItem('ovilo_onboarding_completed', 'true');
    } catch {}
    setStep('loading');
  };

  // 2. Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    const trimmedUsername = username.trim().toLowerCase();
    const isGuest = !trimmedUsername;

    if (isGuest) {
      handleContinueAsGuest();
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setErrorMsg('Username must be 3-24 characters (letters, numbers, dots, hyphens only).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setLoadingText('Creating your account & setting up cloud library...');
    const res = await signUpUser({
      name: name.trim(),
      username: trimmedUsername,
      email: `${trimmedUsername}@ovilo.local`,
      password: password.trim(),
    });
    setIsSubmitting(false);

    if (!res.success || !res.profile) {
      setErrorMsg(res.message || 'Failed to create account.');
      return;
    }

    setResolvedProfile(res.profile);
    setResolvedCloudData({
      favorites: [],
      movieFavorites: [],
      history: [],
      watchHistory: [],
      musicFavorites: [],
      theme: 'dark',
      avatarUrl: '',
    });
    try {
      localStorage.setItem('ovilo_onboarding_completed', 'true');
    } catch {}
    setStep('loading');
  };

  // 3. Continue as Guest
  const handleContinueAsGuest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    const guestProfile: UserProfile = {
      name: name.trim() || 'Guest',
      isGuest: true,
      createdAt: Date.now(),
    };
    await saveProfile(guestProfile);
    setResolvedProfile(guestProfile);
    setResolvedCloudData({
      favorites: [],
      movieFavorites: [],
      history: [],
      watchHistory: [],
      musicFavorites: [],
      theme: 'dark',
      avatarUrl: '',
    });
    try {
      localStorage.setItem('ovilo_onboarding_completed', 'true');
    } catch {}
    setStep('loading');
    setIsSubmitting(false);
  };

  const isUp = mode === 'signup';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-6 md:p-8 select-none overflow-x-hidden selection:bg-[#FFD54F] selection:text-[#111111]">
        {/* Ambient Blurred Background Glow Orbs */}
        <div
          className="absolute w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] bg-[#FFD54F]/[0.08] -top-24 -left-24 rounded-full pointer-events-none filter blur-[110px]"
          aria-hidden="true"
        />
        <div
          className="absolute w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] bg-[#FFB300]/[0.06] top-1/3 -right-28 rounded-full pointer-events-none filter blur-[110px]"
          aria-hidden="true"
        />
        <div
          className="absolute w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] bg-[#FFD54F]/[0.05] -bottom-24 left-1/4 rounded-full pointer-events-none filter blur-[110px]"
          aria-hidden="true"
        />

        {/* CSS for Gentle Floating Sparkles */}
        <style>{`
          @keyframes gentleFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          .modal-float-slow {
            animation: gentleFloat 5s ease-in-out infinite;
          }
          .modal-float-delayed {
            animation: gentleFloat 6.2s ease-in-out 1.2s infinite;
          }
        `}</style>

        {/* Main Split-Screen Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-[900px] rounded-[24px] border border-white/[0.08] bg-[#121212] shadow-[0_32px_90px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.03)] overflow-hidden flex flex-col md:flex-row"
        >
          {/* =========================================================
               LEFT PANEL: Brand & Minimalist Vector Illustration (50%)
               ========================================================= */}
          <section className="w-full md:w-1/2 bg-[#FFD54F] text-[#111111] p-8 sm:p-10 md:p-11 flex flex-col justify-between relative overflow-hidden select-none">
            {/* Top Brand & Hero Copy */}
            <div className="relative z-10">
              {/* Brand Logo Header */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-[11px] bg-white flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                  aria-hidden="true"
                >
                  {/* Minimalist Black Bunny Silhouette SVG */}
                  <svg className="w-5 h-5 text-[#111111]" viewBox="0 0 32 32" fill="currentColor">
                    <path
                      d="M11.1 4.2c-1.5 0-2.5 1.5-2.2 3.7l1.05 6.35C8.1 15.7 7 17.9 7 20.4 7 24.75 11 28 16 28s9-3.25 9-7.6c0-2.5-1.1-4.7-2.95-6.15l1.05-6.35c.3-2.2-.7-3.7-2.2-3.7-1.35 0-2.45 1.15-2.85 3.05l-1.02 4.85c-.34-.05-.68-.08-1.03-.08s-.69.03-1.03.08l-1.02-4.85c-.4-1.9-1.5-3.05-2.85-3.05z"
                    />
                    <circle cx="13.2" cy="20.2" r="1.15" fill="#FFFFFF" />
                    <circle cx="18.8" cy="20.2" r="1.15" fill="#FFFFFF" />
                  </svg>
                </div>
                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[21px] font-extrabold tracking-[-0.03em] text-[#111111]">
                  Ovilo
                </span>
              </div>

              {/* Hero Headline */}
              <h1 className="font-['Plus_Jakarta_Sans',sans-serif] mt-7 text-[34px] sm:text-[38px] font-extrabold leading-[1.06] tracking-[-0.035em] text-[#111111]">
                Watch it.<br />
                Hear it.<br />
                Keep it.
              </h1>

              {/* Subtitle */}
              <p className="mt-3.5 text-[13.5px] leading-[1.55] font-medium text-[#1E1E1E]/85 max-w-[270px]">
                Movies, series, music and downloads in one fast, local-first hub.
              </p>
            </div>

            {/* Centerpiece Minimalist Thin-Line Vector Illustration */}
            <div className="relative z-10 my-7 sm:my-8 flex items-center justify-center">
              <svg
                className="w-full max-w-[275px] h-auto overflow-visible"
                viewBox="0 0 280 185"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Minimalist media player illustration"
              >
                <defs>
                  <linearGradient id="screenGrad" x1="103" y1="22" x2="177" y2="152" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#FFF9E6" />
                  </linearGradient>
                  <linearGradient id="playGrad" x1="130" y1="74" x2="154" y2="100" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4A6B82" />
                    <stop offset="100%" stopColor="#2F4858" />
                  </linearGradient>
                </defs>

                {/* Delicate Sweeping Curved Wave Line Behind Smartphone */}
                <path
                  d="M18 134 C 52 84, 92 94, 140 96 C 188 98, 224 92, 256 46"
                  stroke="#1C1C1C"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  opacity="0.72"
                />

                {/* Soft Circular Accents & Minimal Sparkles (Left Side) */}
                <g className="modal-float-slow">
                  <circle cx="62" cy="128" r="8.5" fill="#4A6B82" stroke="#1A1A1A" strokeWidth="1.2" />
                  <circle cx="62" cy="128" r="12.5" stroke="#1A1A1A" strokeWidth="0.7" strokeDasharray="2 3" opacity="0.35" />
                  <circle cx="74" cy="30" r="2.2" fill="#1A1A1A" />
                  <circle cx="52" cy="56" r="1.5" fill="#1A1A1A" opacity="0.65" />
                  <circle cx="44" cy="100" r="1.4" fill="#1A1A1A" opacity="0.45" />
                  <circle cx="84" cy="150" r="1.6" fill="#FFFFFF" opacity="0.85" />
                  <path
                    d="M54 74 L55.5 78.5 L60 80 L55.5 81.5 L54 86 L52.5 81.5 L48 80 L52.5 78.5 Z"
                    fill="#FFFDF5"
                    stroke="#1A1A1A"
                    strokeWidth="0.6"
                    opacity="0.9"
                  />
                </g>

                {/* Soft Circular Accents & Minimal Sparkles (Right Side) */}
                <g className="modal-float-delayed">
                  <circle cx="212" cy="74" r="9.5" fill="#F2AE30" fillOpacity="0.55" stroke="#1A1A1A" strokeWidth="1" strokeOpacity="0.35" />
                  <path
                    d="M206 24 L208.2 30.8 L215 33 L208.2 35.2 L206 42 L203.8 35.2 L197 33 L203.8 30.8 Z"
                    fill="#FFFDF5"
                    opacity="0.92"
                  />
                  <path
                    d="M225 41 L226.4 45.1 L230.5 46.5 L226.4 47.9 L225 52 L223.6 47.9 L219.5 46.5 L223.6 45.1 Z"
                    fill="#FFFDF5"
                    opacity="0.8"
                  />
                  <circle cx="211" cy="126" r="3.2" fill="none" stroke="#1A1A1A" strokeWidth="1.35" />
                  <circle cx="233" cy="112" r="1.6" fill="#1A1A1A" opacity="0.55" />
                  <circle cx="228" cy="64" r="1.3" fill="#1A1A1A" opacity="0.5" />
                </g>

                {/* Sleek Minimalist Smartphone Body */}
                <g>
                  <ellipse cx="140" cy="174" rx="34" ry="3.5" fill="#111111" opacity="0.09" />
                  <rect
                    x="98"
                    y="14"
                    width="84"
                    height="154"
                    rx="13"
                    fill="#FFD54F"
                    stroke="#1A1A1A"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="131"
                    y1="21.5"
                    x2="149"
                    y2="21.5"
                    stroke="#1A1A1A"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <rect
                    x="104"
                    y="28"
                    width="72"
                    height="125"
                    rx="6"
                    fill="url(#screenGrad)"
                    stroke="#1A1A1A"
                    strokeWidth="1.25"
                  />
                  <line
                    x1="130"
                    y1="160.5"
                    x2="150"
                    y2="160.5"
                    stroke="#1A1A1A"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    opacity="0.85"
                  />

                  {/* Centered Play Triangle Icon */}
                  <g transform="translate(140, 89)">
                    <line x1="-18" y1="-10" x2="-13" y2="-7" stroke="#E0A82E" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="12" y1="-14" x2="15" y2="-10" stroke="#4A6B82" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
                    <line x1="11" y1="12" x2="15" y2="15" stroke="#E0A82E" strokeWidth="1.2" strokeLinecap="round" />
                    <path
                      d="M-6.5 -10.5 L12 0.5 L-6.5 11.5 Z"
                      transform="translate(2, 2)"
                      fill="#FFD54F"
                      opacity="0.45"
                    />
                    <path
                      d="M-7 -11.5 C-7 -12.6 -5.8 -13.3 -4.8 -12.7 L13 -1.2 C13.9 -0.6 13.9 0.6 13 1.2 L-4.8 12.7 C-5.8 13.3 -7 12.6 -7 11.5 Z"
                      fill="url(#playGrad)"
                      stroke="#1A1A1A"
                      strokeWidth="1.35"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M-3.5 -6.5 L5.5 -0.8"
                      stroke="#FFFFFF"
                      strokeWidth="1.1"
                      strokeLinecap="round"
                      opacity="0.55"
                    />
                  </g>
                </g>
              </svg>
            </div>

            {/* Bottom Row of 4 Compact Black Pill Badges */}
            <div className="relative z-10 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-[#0D0D0D] text-white text-[11px] font-semibold tracking-[-0.01em] shadow-sm">
                Ad-free
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#0D0D0D] text-white text-[11px] font-semibold tracking-[-0.01em] shadow-sm">
                1080p &amp; 4K
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#0D0D0D] text-white text-[11px] font-semibold tracking-[-0.01em] shadow-sm">
                Lossless audio
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#0D0D0D] text-white text-[11px] font-semibold tracking-[-0.01em] shadow-sm">
                Cloud sync
              </span>
            </div>
          </section>

          {/* =========================================================
               RIGHT PANEL: Dark Charcoal Auth Form (50%)
               ========================================================= */}
          <section className="w-full md:w-1/2 bg-[#121212] p-8 sm:p-10 md:p-11 flex flex-col justify-between relative">
            {/* Top-Right Circular Close Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="absolute top-5 right-5 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] text-neutral-400 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {step === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 my-auto">
                <Loader2 className="w-10 h-10 animate-spin text-[#FFD54F]" />
                <h3 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  {loadingText}
                </h3>
                <p className="text-xs text-neutral-400">Please wait while your profile is synced...</p>
              </div>
            ) : (
              <div>
                {/* Top-Left Pill-Shaped Segmented Toggle */}
                <div
                  className="inline-flex items-center p-1 rounded-full bg-[#1A1A1A] border border-white/[0.08] relative"
                  role="tablist"
                  aria-label="Authentication mode"
                >
                  {/* Sliding Active Pill Background */}
                  <motion.div
                    layout
                    className="absolute top-1 bottom-1 rounded-full bg-[#FFD54F] shadow-sm pointer-events-none"
                    style={{
                      left: isUp ? '50%' : '4px',
                      right: isUp ? '4px' : '50%',
                    }}
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />

                  <button
                    ref={signInBtnRef}
                    type="button"
                    role="tab"
                    aria-selected={!isUp}
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg(null);
                    }}
                    className={`relative z-10 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors duration-200 cursor-pointer focus:outline-none ${
                      !isUp ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    ref={signUpBtnRef}
                    type="button"
                    role="tab"
                    aria-selected={isUp}
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg(null);
                    }}
                    className={`relative z-10 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors duration-200 cursor-pointer focus:outline-none ${
                      isUp ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Sign up
                  </button>
                </div>

                {/* Heading & Subtitle */}
                <div className="mt-7">
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[28px] sm:text-[30px] font-bold tracking-[-0.025em] text-white leading-tight">
                    {isUp ? 'Create account' : 'Welcome back'}
                  </h2>
                  <p className="mt-1.5 text-[13.5px] text-neutral-400">
                    {isUp
                      ? 'Sync your history, favorites and settings everywhere.'
                      : 'Sign in to pick up right where you left off.'}
                  </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Authentication Form */}
                <form onSubmit={isUp ? handleSignUp : handleSignIn} className="mt-6 space-y-4" noValidate>
                  {/* Display Name Field (Only visible in Sign Up mode) */}
                  {isUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label htmlFor="displayName" className="block text-[12.5px] font-medium text-neutral-300 mb-1.5">
                        Display Name
                      </label>
                      <div className="relative group">
                        <span className="absolute inset-y-0 left-3.5 flex items-center text-neutral-500 group-focus-within:text-[#FFD54F] transition-colors pointer-events-none">
                          <User className="w-4 h-4" />
                        </span>
                        <input
                          id="displayName"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Rivera"
                          className="w-full h-11 pl-10 pr-4 rounded-[10px] bg-[#1A1A1A] border border-white/[0.08] text-[14px] text-white placeholder-neutral-500 transition-all duration-200 focus:outline-none focus:border-[#FFD54F] focus:ring-2 focus:ring-[#FFD54F]/15"
                          required={isUp}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Email or Username Field */}
                  <div>
                    <label htmlFor="emailInput" className="block text-[12.5px] font-medium text-neutral-300 mb-1.5">
                      {isUp ? 'Username' : 'Email or Username'}
                    </label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-3.5 flex items-center text-neutral-500 group-focus-within:text-[#FFD54F] transition-colors pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        id="emailInput"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={isUp ? 'username (e.g. alex24)' : 'username or email'}
                        className="w-full h-11 pl-10 pr-4 rounded-[10px] bg-[#1A1A1A] border border-white/[0.08] text-[14px] text-white placeholder-neutral-500 transition-all duration-200 focus:outline-none focus:border-[#FFD54F] focus:ring-2 focus:ring-[#FFD54F]/15"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Password Field with Eye Toggle */}
                  <div>
                    <label htmlFor="passwordInput" className="block text-[12.5px] font-medium text-neutral-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-3.5 flex items-center text-neutral-500 group-focus-within:text-[#FFD54F] transition-colors pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        id="passwordInput"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full h-11 pl-10 pr-11 rounded-[10px] bg-[#1A1A1A] border border-white/[0.08] text-[14px] text-white placeholder-neutral-500 transition-all duration-200 focus:outline-none focus:border-[#FFD54F] focus:ring-2 focus:ring-[#FFD54F]/15"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-1.5 px-2.5 flex items-center text-neutral-500 hover:text-neutral-200 transition-colors focus:outline-none cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password Row */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label
                      onClick={() => setRememberMe(!rememberMe)}
                      className="inline-flex items-center gap-2.5 cursor-pointer select-none group"
                    >
                      <div
                        className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all duration-150 ${
                          rememberMe
                            ? 'bg-[#FFD54F] border-[#FFD54F]'
                            : 'bg-[#1A1A1A] border-white/20 group-hover:border-[#FFD54F]/70'
                        }`}
                      >
                        {rememberMe && (
                          <svg
                            className="w-3 h-3 text-[#111111]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[12.5px] text-neutral-400 group-hover:text-neutral-200 transition-colors">
                        Remember me
                      </span>
                    </label>

                    {!isUp && (
                      <button
                        type="button"
                        onClick={() => setToastMsg('Password reset is available through your administrator.')}
                        className="text-[12.5px] font-medium text-[#FFD54F] hover:text-[#FFDF73] transition-colors focus:outline-none cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  {/* Primary Submit Pill Button */}
                  <div className="pt-1.5">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 rounded-full bg-[#FFD54F] hover:bg-[#FFDF73] text-[#111111] font-bold text-[14px] tracking-[-0.01em] shadow-[0_6px_20px_-6px_rgba(255,213,79,0.45)] transition-all duration-200 active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2 focus:outline-none"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#111111]" />
                      ) : (
                        <span>{isUp ? 'Create account' : 'Sign in'}</span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Horizontal Divider */}
                <div className="my-5 flex items-center gap-3.5" aria-hidden="true">
                  <div className="h-px flex-1 bg-white/[0.08]" />
                  <span className="text-[11px] font-medium tracking-[0.08em] text-neutral-500 uppercase">OR</span>
                  <div className="h-px flex-1 bg-white/[0.08]" />
                </div>

                {/* Secondary Outlined Dark Pill Button: Continue as Guest */}
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-full bg-[#181818] hover:bg-[#202020] border border-white/[0.1] hover:border-white/[0.18] text-white font-medium text-[13.5px] flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.985] cursor-pointer focus:outline-none"
                >
                  <User className="w-4 h-4 text-[#FFD54F]" />
                  <span>Continue as Guest</span>
                </button>
              </div>
            )}

            {/* Bottom Switch-Mode Link */}
            {step !== 'loading' && (
              <p className="mt-6 text-center text-[12.5px] text-neutral-400">
                <span>{isUp ? 'Already have an account?' : 'New to Ovilo?'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode(isUp ? 'signin' : 'signup');
                    setErrorMsg(null);
                  }}
                  className="ml-1 font-semibold text-[#FFD54F] hover:text-[#FFDF73] transition-colors focus:outline-none cursor-pointer"
                >
                  {isUp ? 'Sign in' : 'Create account'}
                </button>
              </p>
            )}
          </section>
        </motion.div>

        {/* Clean Non-Intrusive Floating Toast */}
        {toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#1A1A1A]/95 backdrop-blur-md border border-white/[0.1] shadow-[0_14px_40px_rgba(0,0,0,0.65)] transition-all duration-300 max-w-[90vw]">
            <span className="w-2 h-2 rounded-full bg-[#FFD54F] shrink-0" />
            <span className="text-[13px] font-medium text-neutral-100 truncate">{toastMsg}</span>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
