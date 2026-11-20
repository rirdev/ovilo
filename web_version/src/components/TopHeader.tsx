import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Sun, Moon, Minus, Square, X, LogIn, Maximize2 } from 'lucide-react';
import { UserProfile } from '../services/firebaseSync';
import { useTheme } from '../context/ThemeContext';
import { isTauri } from '../services/platform';

interface TopHeaderProps {
  onOpenSearch?: () => void;
  onOpenSettings: () => void;
  onNavigateTab?: (tab: string) => void;
  profile?: UserProfile | null;
  activeTab?: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenSearch,
  onNavigateTab,
  profile,
  activeTab = 'dashboard',
  searchQuery = '',
  onSearchChange,
}) => {
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
      if (!isInput && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpenSearch?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  const searchPlaceholder = activeTab?.startsWith('music')
    ? 'Search songs or artists...'
    : activeTab === 'movies'
    ? 'Search movies & series...'
    : activeTab === 'downloads'
    ? 'Search downloads & FTP files...'
    : 'Quick search...';

  const isGuest = !profile || profile.isGuest || !profile.username;
  const userInitial = profile?.username ? profile.username[0].toUpperCase() : 'O';

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (err) {
      console.warn('Minimize window:', err);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch (err) {
      console.warn('Toggle maximize window:', err);
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (err) {
      console.warn('Close window:', err);
    }
  };

  const handleAuthClick = () => {
    if (isGuest) {
      window.dispatchEvent(new Event('ovilo_open_login_modal'));
    } else {
      onNavigateTab?.('settings');
    }
  };

  return (
    <div className="topbar" style={{ gap: '8px', paddingRight: '12px' }}>
      {/* In-Page Real Search Bar (.srch with 500ms expand) */}
      <div
        className={`srch ${searchQuery || isSearchFocused ? 'open' : ''}`}
        onClick={() => searchInputRef.current?.focus()}
      >
        <Search className="w-4 h-4 flex-shrink-0" style={{ margin: '0 13px', color: 'var(--on-var)' }} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSearchChange?.('');
            }}
            className="p-1 border-0 bg-transparent text-neutral-400 hover:text-white cursor-pointer mr-2 flex-shrink-0"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="sp" />

      {/* Theme Toggle Button */}
      <div onClick={(e) => toggleTheme(e)} className="ib rip flex-shrink-0" style={{ cursor: 'pointer' }} title="Toggle theme">
        {theme === 'light' ? (
          <Moon className="w-4.5 h-4.5 text-[#ffd24d]" />
        ) : (
          <Sun className="w-4.5 h-4.5 text-[#ffd24d]" />
        )}
      </div>

      {/* Notifications Button */}
      <div className="ib rip flex-shrink-0" style={{ cursor: 'pointer' }} title="Notifications">
        <Bell className="w-4.5 h-4.5 text-[#f2efe9]" />
      </div>

      {/* Login Button if Guest */}
      {isGuest && (
        <button
          onClick={() => window.dispatchEvent(new Event('ovilo_open_login_modal'))}
          className="b rip flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs cursor-pointer transition-all hover:scale-105 active:scale-95 flex-shrink-0 border-0"
          style={{
            background: 'var(--kino-yellow)',
            color: 'var(--kino-ink)',
          }}
          title="Sign in or register for cloud sync"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
      )}

      {/* User Cloudinary Avatar */}
      <div
        onClick={handleAuthClick}
        className="avatar rip flex-shrink-0 overflow-hidden"
        style={{ cursor: 'pointer' }}
        title={isGuest ? 'Click to Sign In' : `@${profile?.username || 'User'} (Settings & Profile)`}
      >
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.name || profile.username || 'User'}
            className="w-full h-full object-cover"
          />
        ) : isGuest ? (
          'G'
        ) : (
          userInitial
        )}
      </div>

      {/* Window Controls or Web Fullscreen Toggle */}
      {isTauri() ? (
        <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-white/10 flex-shrink-0">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
            title="Minimize Window"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleMaximize}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
            title="Maximize / Restore Window"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer border-0 bg-transparent"
            title="Close Window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-white/10 flex-shrink-0">
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
