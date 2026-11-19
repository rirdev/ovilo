import React from 'react';
import { Film, Search, SlidersHorizontal, Bookmark, History, Home, Tv, Clapperboard } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  favoritesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenSettings,
  favoritesCount,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'movies', label: 'Movies', icon: Clapperboard },
    { id: 'tv', label: 'TV Shows', icon: Tv },
    { id: 'favorites', label: 'Favorites', icon: Bookmark, badge: favoritesCount },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-nav border-b border-white/5 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => onTabChange('home')}
          className="flex items-center gap-3 group text-left focus:outline-none cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#DCFF7D] flex items-center justify-center shadow-md shadow-[#DCFF7D]/25 group-hover:scale-105 transition-transform duration-300">
            <Film className="w-5 h-5 text-[#0B0B0D] stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              Ovilo
            </span>
            <span className="hidden sm:block text-[10px] uppercase tracking-widest text-[#DCFF7D] font-semibold -mt-1">
              Desktop Edition
            </span>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] p-1.5 rounded-full border border-white/10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#DCFF7D] text-[#0B0B0D] font-bold shadow-md shadow-[#DCFF7D]/25'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-[#DCFF7D]/20 text-[#DCFF7D] rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer group"
          >
            <Search className="w-4 h-4 text-neutral-400 group-hover:text-[#DCFF7D] transition-colors" />
            <span className="hidden sm:inline text-xs font-medium text-neutral-400 group-hover:text-neutral-200">
              Search movies & shows...
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 bg-white/5 border border-white/10 rounded">
              /
            </kbd>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
