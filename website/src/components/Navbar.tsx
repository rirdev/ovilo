import React, { useState, useEffect } from 'react';
import {
  Download,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How to Use', href: '#how-it-works' },
    { label: 'Files & Downloads', href: '#downloads' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#080808]/90 backdrop-blur-xl border-b border-white/8 shadow-2xl py-3.5'
          : 'bg-transparent border-b border-white/5 py-5'
      }`}
    >
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between w-full">
          {/* Left Side: Brand Logo & Main Navigation */}
          <div className="flex items-center gap-6 lg:gap-8">
            <a href="#" className="flex items-center group py-0.5" title="Ovilo">
              <img
                src="/logos/app_logo.png"
                alt="Ovilo"
                className="h-9 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </a>

            <div className="hidden lg:block h-5 w-px bg-white/10" />

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/8 rounded-full transition-all duration-200"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right Side: GitHub & Rounded Pill CTA */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full bg-[#141418] border border-white/10 text-zinc-300 hover:text-white hover:border-white/30 transition-all hover:scale-105 hidden sm:flex items-center justify-center"
              title="GitHub Repository"
            >
              <GithubIcon className="w-4 h-4" />
            </a>

            <a
              href="#downloads"
              className="group relative inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm transition-all duration-300 hover:bg-zinc-200 active:scale-95 shadow-sm"
            >
              <Download className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
              <span>Get Ovilo</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 font-mono font-bold">
                Free
              </span>
            </a>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full bg-[#141418] border border-white/10 text-neutral-300 hover:text-white ml-2"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pt-4 border-t border-white/10 flex flex-col gap-2 pb-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/8 rounded-2xl transition-colors flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </a>
            ))}
            <div className="pt-3 border-t border-white/10 flex items-center gap-2">
              <a
                href="#downloads"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-3 rounded-full bg-white text-black font-semibold text-xs text-center hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Ovilo Desktop</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Top Scroll Progress Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/5 overflow-hidden">
        <div
          className="h-full bg-white/60 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
    </header>
  );
};
