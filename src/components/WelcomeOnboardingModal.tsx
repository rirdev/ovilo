import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
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
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');

  // Form Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Status & error handling
  const [loadingText, setLoadingText] = useState('Signing you in...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedProfile, setResolvedProfile] = useState<UserProfile | null>(null);
  const [resolvedCloudData, setResolvedCloudData] = useState<CloudUserData | null>(null);

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
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-5xl rounded-[32px] overflow-hidden border border-[var(--kino-line,#25252b)] shadow-[0_30px_90px_rgba(0,0,0,0.9)]"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '600px',
            background: 'var(--kino-surface, #141417)',
          }}
        >
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* LEFT COLUMN: YELLOW BRAND PANEL */}
          <div
            className="relative overflow-hidden flex flex-col justify-between p-8 sm:p-10 select-none"
            style={{
              background: 'var(--kino-yellow, #ffd24d)',
              color: '#000',
            }}
          >
            <div>
              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center bg-black shadow-md">
                  <img
                    src="/logos/logo.png"
                    alt="Ovilo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-black font-['Plus_Jakarta_Sans',sans-serif]">
                  Ovilo
                </span>
              </div>

              {/* Tagline */}
              <h1 className="text-3xl sm:text-4xl font-black leading-[1.05] tracking-tight mt-6 text-black font-['Plus_Jakarta_Sans',sans-serif]">
                Watch it.<br />Hear it.<br />Keep it.
              </h1>
              <p className="max-w-[28ch] mt-2.5 font-semibold text-xs sm:text-sm text-black/75 leading-relaxed">
                Movies, series, music and downloads in one fast, local-first hub.
              </p>
            </div>

            {/* Stacked Tilted Poster Cards Showcase (Strictly non-overlapping) */}
            <div className="relative w-full h-44 my-4 flex items-center justify-center">
              <div className="relative w-[240px] h-[160px]">
                {/* Poster 1 (Left - Deadpool) */}
                <div
                  className="absolute rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-end p-2.5 border border-black/15 transition-transform"
                  style={{
                    background: '#ff7a64',
                    width: '105px',
                    height: '148px',
                    left: '8px',
                    top: '10px',
                    transform: 'rotate(-8deg)',
                  }}
                >
                  <img
                    src="https://image.tmdb.org/t/p/w342/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg"
                    alt="Movie"
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                  <b className="relative z-10 text-[10px] font-bold text-white drop-shadow truncate">
                    Deadpool &amp; Wolverine
                  </b>
                </div>

                {/* Poster 2 (Right - Dune) */}
                <div
                  className="absolute rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-end p-2.5 border border-black/15 transition-transform"
                  style={{
                    background: '#9fa8ff',
                    width: '105px',
                    height: '148px',
                    left: '124px',
                    top: '4px',
                    transform: 'rotate(7deg)',
                    zIndex: 2,
                  }}
                >
                  <img
                    src="https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg"
                    alt="Dune"
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                  <b className="relative z-10 text-[10px] font-bold text-white drop-shadow truncate">
                    Dune: Part Two
                  </b>
                </div>

                {/* Poster 3 (Center - Music) */}
                <div
                  className="absolute rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-end p-2.5 border border-black/15 transition-transform"
                  style={{
                    background: '#000',
                    color: '#ffd24d',
                    width: '105px',
                    height: '148px',
                    left: '68px',
                    top: '18px',
                    transform: 'rotate(-1deg)',
                    zIndex: 3,
                  }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop"
                    alt="Music"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                  <b className="relative z-10 text-[10px] font-bold text-[#ffd24d] drop-shadow truncate">
                    Slow Harbour
                  </b>
                </div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mt-auto">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black text-white">
                Ad-free
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black text-white">
                1080p &amp; 4K
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black text-white">
                Lossless audio
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black text-white">
                Cloud sync
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: AUTH FORM (.af) */}
          <div className="af flex flex-col justify-center p-10 sm:p-12 text-[var(--kino-on,#f2efe9)]">
            {step === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--kino-yellow,#ffd24d)]" />
                <h3 className="text-xl font-bold">{loadingText}</h3>
                <p className="text-xs text-[var(--kino-on-var,#a9a7a2)]">Please wait while your profile is synced...</p>
              </div>
            ) : (
              <>
                {/* Segmented Sign in / Sign up Switcher */}
                <div className="seg self-start mb-4">
                  <span
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg(null);
                    }}
                    className={!isUp ? 'on' : ''}
                  >
                    Sign in
                  </span>
                  <span
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg(null);
                    }}
                    className={isUp ? 'on' : ''}
                  >
                    Sign up
                  </span>
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight mb-1 font-['Bricolage_Grotesque',sans-serif]">
                  {isUp ? 'Create your account' : 'Welcome back'}
                </h1>
                <p className="sub text-xs text-[var(--kino-on-var,#a9a7a2)] mb-5">
                  {isUp
                    ? 'Start watching and listening in under a minute.'
                    : 'Sign in to pick up right where you left off.'}
                </p>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={isUp ? handleSignUp : handleSignIn} className="space-y-3.5">
                  {/* Display Name (Only in Sign Up) */}
                  {isUp && (
                    <div className="fld">
                      <label>Display name</label>
                      <div className="in2">
                        <User className="w-4 h-4 text-[var(--kino-on-var,#a9a7a2)]" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Hunter"
                          className="w-full bg-transparent border-none outline-none text-white text-sm"
                          required={isUp}
                        />
                      </div>
                    </div>
                  )}

                  {/* Username or Email */}
                  <div className="fld">
                    <label>{isUp ? 'Username' : 'Email or Username'}</label>
                    <div className="in2">
                      <Mail className="w-4 h-4 text-[var(--kino-on-var,#a9a7a2)]" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={isUp ? 'username (e.g. alex24)' : 'username or email'}
                        className="w-full bg-transparent border-none outline-none text-white text-sm"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="fld">
                    <label>Password</label>
                    <div className="in2">
                      <Lock className="w-4 h-4 text-[var(--kino-on-var,#a9a7a2)]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-transparent border-none outline-none text-white text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 border-none bg-transparent text-[var(--kino-on-var,#a9a7a2)] hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Options row */}
                  {isUp ? (
                    <div className="rw flex items-center justify-between text-xs text-[var(--kino-on-var,#a9a7a2)]">
                      <label
                        onClick={() => setAgreeTerms(!agreeTerms)}
                        className="l flex items-center gap-2 cursor-pointer"
                      >
                        <div className={`cbx ${agreeTerms ? 'checked' : ''} flex items-center justify-center`}>
                          {agreeTerms && <Check className="w-3.5 h-3.5 text-black" />}
                        </div>
                        <span>I agree to the Terms &amp; Privacy Policy</span>
                      </label>
                    </div>
                  ) : (
                    <div className="rw flex items-center justify-between text-xs text-[var(--kino-on-var,#a9a7a2)]">
                      <label
                        onClick={() => setRememberMe(!rememberMe)}
                        className="l flex items-center gap-2 cursor-pointer"
                      >
                        <div className={`cbx ${rememberMe ? 'checked' : ''} flex items-center justify-center`}>
                          {rememberMe && <Check className="w-3.5 h-3.5 text-black" />}
                        </div>
                        <span>Remember me</span>
                      </label>
                      <span className="cursor-pointer text-[var(--kino-yellow,#ffd24d)] hover:underline font-semibold">
                        Forgot password?
                      </span>
                    </div>
                  )}

                  {/* Big Action CTA Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="big-btn w-full mt-2 cursor-pointer flex items-center justify-center gap-2 text-black font-bold"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{isUp ? 'Create account' : 'Sign in'}</span>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Prominent Continue as Guest Button */}
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  className="w-full py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <User className="w-4 h-4 text-[var(--kino-yellow,#ffd24d)]" />
                  <span>Continue as Guest</span>
                </button>

                {/* Alternate Actions */}
                <div className="alt mt-4 text-xs text-center text-[var(--kino-on-var,#a9a7a2)]">
                  {isUp ? (
                    <span>
                      Already have an account?{' '}
                      <b onClick={() => setMode('signin')} className="text-[var(--kino-yellow,#ffd24d)] cursor-pointer">
                        Sign in
                      </b>
                    </span>
                  ) : (
                    <span>
                      New to Ovilo?{' '}
                      <b onClick={() => setMode('signup')} className="text-[var(--kino-yellow,#ffd24d)] cursor-pointer">
                        Create account
                      </b>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
