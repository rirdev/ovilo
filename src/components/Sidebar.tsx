import React from 'react';
import {
  LayoutDashboard,
  Film,
  Headphones,
  DownloadCloud,
  Settings,
  LogIn,
} from 'lucide-react';
import { useDownloadManager } from '../services/downloadManager';
import { UserProfile } from '../services/firebaseSync';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  history?: any[];
  onPlayHistory?: (item: any) => void;
  favoritesCount?: number;
  onOpenSettings?: () => void;
  profile?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  profile,
}) => {
  const { activeCount } = useDownloadManager();
  const isGuest = !profile || profile.isGuest || !profile.username;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'movies', label: 'Movies & Series', icon: Film },
    { id: 'music', label: 'Music Player', icon: Headphones },
    { id: 'downloads', label: 'Downloads', icon: DownloadCloud, badge: activeCount },
    { id: 'settings', label: 'Settings & Profile', icon: Settings },
  ];

  const isNavActive = (id: string) => {
    if (id === 'dashboard') return activeTab === 'dashboard';
    if (id === 'movies') return activeTab === 'movies' || activeTab === 'home' || activeTab === 'explore' || activeTab === 'favorites';
    if (id === 'music') return activeTab === 'music' || activeTab.startsWith('music');
    if (id === 'downloads') return activeTab === 'downloads' || activeTab === 'ytdlp' || activeTab === 'ftp';
    if (id === 'settings') return activeTab === 'settings' || activeTab === 'support';
    return activeTab === id;
  };

  return (
    <aside className="side">
      {/* Real Ovilo Brand Logo & Name */}
      <div
        onClick={() => onTabChange('dashboard')}
        className="select-none cursor-pointer flex items-center"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '52px',
          padding: '0 6px 12px',
          gap: '10px',
        }}
        title="Ovilo Home"
      >
        <img
          src="/logos/logo.png"
          alt="Ovilo"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            flexShrink: 0,
            display: 'block',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/logos/logo-dark.png';
          }}
        />
        <span
          style={{
            fontFamily: 'var(--display, "DM Sans", sans-serif)',
            fontSize: '21px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--on, #ffffff)',
            lineHeight: 1,
            margin: 0,
          }}
        >
          OVILO
        </span>
      </div>

      {/* 5 Primary Navigation Items */}
      {navItems.map((n) => {
        const Icon = n.icon;
        const active = isNavActive(n.id);

        return (
          <div
            key={n.id}
            onClick={() => onTabChange(n.id)}
            className={`nv rip ${active ? 'on' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge !== undefined && n.badge > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '99px',
                  background: active ? 'var(--kino-ink)' : 'var(--kino-surface-top)',
                  color: active ? 'var(--kino-yellow)' : 'var(--kino-peri)',
                }}
              >
                {n.badge}
              </span>
            )}
          </div>
        );
      })}

      {/* User Cloudinary Profile or Sign In Quick Access */}
      {!isGuest ? (
        <div
          onClick={() => onTabChange('settings')}
          className="mt-3 px-2 py-2 rounded-xl flex items-center gap-2.5 cursor-pointer transition-all hover:bg-white/5 border border-white/5"
          title={`@${profile?.username || 'user'} - Click to Open Profile & Settings`}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center font-bold text-xs text-[#ffd24d] border border-white/10">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (profile?.username || 'U')[0].toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-[#f2efe9] truncate">
              {profile?.name || profile?.username}
            </div>
            <div className="text-[10px] text-[#ffd24d]">Cloud Synchronized</div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => window.dispatchEvent(new Event('ovilo_open_login_modal'))}
          className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2.5 cursor-pointer transition-all hover:bg-white/5 border border-dashed border-white/10"
          title="Sign in to sync your library across devices"
        >
          <div className="w-6 h-6 rounded-full bg-[#ffd24d]/15 flex items-center justify-center flex-shrink-0">
            <LogIn className="w-3.5 h-3.5 text-[#ffd24d]" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[#f2efe9]">Sign In</div>
            <div className="text-[9px] text-[#a9a7a2]">Cloud Library Backup</div>
          </div>
        </div>
      )}
    </aside>
  );
};
