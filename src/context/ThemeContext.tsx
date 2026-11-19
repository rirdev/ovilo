import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'classic' | 'dark' | 'light' | 'cobalt';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: (e?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = 'ovilo_app_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'cobalt') {
        return saved as AppTheme;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return 'dark';
  });

  const applyThemeToDOM = (newTheme: AppTheme) => {
    try {
      const effectiveTheme = (newTheme === 'cobalt') ? 'cobalt' : 'dark';
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      document.documentElement.classList.remove('light', 'dark', 'cobalt', 'classic');
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-cobalt', 'theme-classic');

      if (effectiveTheme === 'cobalt') {
        document.documentElement.classList.add('dark', 'cobalt');
        document.body.classList.add('theme-dark', 'theme-cobalt');
      } else {
        document.documentElement.classList.add('dark');
        document.body.classList.add('theme-dark');
      }
    } catch (err) {
      console.warn('Error applying theme classes:', err);
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = (newTheme: AppTheme) => {
    const effective = (newTheme === 'cobalt') ? 'cobalt' : 'dark';
    setThemeState(effective);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, effective);
    } catch (e) {
      // Ignore localStorage errors
    }
    applyThemeToDOM(effective);
    window.dispatchEvent(new CustomEvent('ovilo_theme_changed', { detail: { theme: effective } }));
  };

  const toggleTheme = (e?: React.MouseEvent) => {
    const x = e ? e.clientX : window.innerWidth / 2;
    const y = e ? e.clientY : 30;
    const nextTheme: AppTheme = theme === 'dark' ? 'cobalt' : 'dark';

    if (!(document as any).startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const t = (document as any).startViewTransition(() => {
      setTheme(nextTheme);
    });
    t.ready
      ?.then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 700, easing: 'cubic-bezier(.2,0,0,1)', pseudoElement: '::view-transition-new(root)' }
        )
      )
      .catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
