import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserProfile,
  saveProfile,
  signInUser,
  signUpUser,
  getLocalProfile,
} from '../services/firebaseSync';

interface MotionSplashScreenProps {
  isOpen: boolean;
  onFinish: (profile?: UserProfile) => void;
}

export const MotionSplashScreen: React.FC<MotionSplashScreenProps> = ({
  isOpen,
  onFinish,
}) => {
  const [closing, setClosing] = useState(false);

  const handleComplete = useCallback(async (action: any) => {
    try {
      localStorage.setItem('ovilo_motion_splash_v0.2.0_seen', 'true');
      localStorage.setItem('ovilo_motion_splash_seen', 'true');
      localStorage.setItem('ovilo_onboarding_completed', 'true');
    } catch {}

    if (action.type === 'ovilo_guest' || action.type === 'ovilo_close') {
      const current = getLocalProfile();
      const guestProfile: UserProfile = current || {
        name: 'Guest',
        isGuest: true,
        createdAt: Date.now(),
      };
      await saveProfile(guestProfile);
      setClosing(true);
      setTimeout(() => onFinish(guestProfile), 400);
      return;
    }

    if (action.type === 'ovilo_signin') {
      try {
        const res = await signInUser(action.identifier, action.password);
        if (res.success && res.profile) {
          setClosing(true);
          setTimeout(() => onFinish(res.profile), 400);
          return;
        }
      } catch (err) {
        console.warn('Sign in error during splash:', err);
      }
      // Fallback
      const p = getLocalProfile() || {
        name: action.identifier?.split('@')[0] || 'User',
        isGuest: false,
        createdAt: Date.now(),
      };
      await saveProfile(p);
      setClosing(true);
      setTimeout(() => onFinish(p), 400);
      return;
    }

    if (action.type === 'ovilo_signup') {
      try {
        const res = await signUpUser({
          name: action.name || 'User',
          username: action.username || 'user',
          email: action.email || 'user@ovilo.local',
          password: action.password,
        });
        if (res.success && res.profile) {
          setClosing(true);
          setTimeout(() => onFinish(res.profile), 400);
          return;
        }
      } catch (err) {
        console.warn('Sign up error during splash:', err);
      }
      const p: UserProfile = {
        name: action.name || 'User',
        username: action.username || 'user',
        isGuest: false,
        createdAt: Date.now(),
      };
      await saveProfile(p);
      setClosing(true);
      setTimeout(() => onFinish(p), 400);
      return;
    }

    // Default close
    setClosing(true);
    setTimeout(() => onFinish(), 400);
  }, [onFinish]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.data && typeof e.data.type === 'string' && e.data.type.startsWith('ovilo_')) {
        handleComplete(e.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, handleComplete]);

  if (!isOpen && !closing) return null;

  return (
    <AnimatePresence>
      {!closing && (
        <motion.div
          key="motion-splash-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] bg-[#0d0d0d] overflow-hidden select-none flex items-center justify-center"
        >
          <iframe
            src="/motion_splash.html"
            title="Ovilo Splash Screen"
            className="w-full h-full border-0 outline-none"
            allow="autoplay"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
