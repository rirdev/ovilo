import React from 'react';
import { Compass, Search, LayoutGrid, Film, Heart } from 'lucide-react';

interface FloatingDockProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({ activeTab, onTabChange }) => {
  const dockItems = [
    { id: 'music_home', icon: Compass, label: 'Home' },
    { id: 'music_search', icon: Search, label: 'Search' },
    { id: 'music_library', icon: LayoutGrid, label: 'Library' },
    { id: 'cinema', icon: Film, label: 'Cinema' },
    { id: 'favorite', icon: Heart, label: 'Favorites' },
  ];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-md w-full px-4 select-none">
      <div className="flex items-center justify-around py-2 px-3 rounded-full bg-m3-surface-container/95 border border-m3-outline-variant/30 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
        {dockItems.map((item) => {
          const Icon = item.icon;
          // Determine if active
          let isActive = false;
          if (item.id === 'cinema') {
            isActive = activeTab === 'home' || activeTab === 'movies' || activeTab === 'tv';
          } else if (item.id === 'favorite') {
            isActive = activeTab === 'favorite';
          } else if (item.id === 'music_home') {
            isActive = activeTab === 'music' || activeTab === 'music_home';
          } else if (item.id === 'music_search') {
            isActive = activeTab === 'music_search';
          } else if (item.id === 'music_library') {
            isActive = activeTab === 'music_library';
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'cinema') onTabChange('home');
                else onTabChange(item.id);
              }}
              title={item.label}
              className="flex flex-col items-center gap-1 group cursor-pointer transition-transform active:scale-95 py-0.5"
            >
              {/* Material 3 Expressive Active Pill Indicator */}
              <div
                className={`flex items-center justify-center px-4 py-1 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-m3-secondary-container text-m3-on-secondary-container shadow-sm w-14'
                    : 'text-m3-on-surface-variant hover:text-white hover:bg-white/5 w-14'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  isActive ? 'text-m3-primary font-bold' : 'text-m3-on-surface-variant group-hover:text-white'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
