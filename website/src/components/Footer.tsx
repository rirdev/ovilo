import React from 'react';
import {
  ShieldCheck,
  ChevronUp,
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#060608] border-t border-white/8 pt-16 pb-12 relative select-none">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/8">
          {/* Col 1: Brand & Description */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/logos/app_logo.png" alt="Ovilo" className="h-9 w-auto object-contain" />
              <span className="font-display font-extrabold text-xl text-white tracking-tight">
                OVILO
              </span>
            </div>

            <p className="text-sm text-zinc-300 max-w-sm leading-relaxed">
              The high-performance universal media center for Windows, Linux, and Android. Engineered with native Rust, Tauri v2, and React.
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 border border-white/10 text-xs font-mono text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>v1.0.0 Stable • Zero Telemetry</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <span className="font-mono text-xs font-bold text-zinc-200 block mb-3 uppercase tracking-wider">
              NAVIGATION
            </span>
            <ul className="space-y-2.5 text-sm text-zinc-400 font-medium">
              <li><a href="#features" className="hover:text-white transition-colors">The Core Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How to Use</a></li>
              <li><a href="#downloads" className="hover:text-white transition-colors">Files &amp; Downloads</a></li>
            </ul>
          </div>

          {/* Col 3: Distribution Packages */}
          <div className="md:col-span-4 space-y-3">
            <span className="font-mono text-xs font-bold text-zinc-200 block mb-3 uppercase tracking-wider">
              AVAILABLE PLATFORMS
            </span>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>Windows 10 / 11 (Setup Wizard &amp; Portable .exe)</li>
              <li>Linux (Debian / Ubuntu .deb &amp; Universal .tar.gz)</li>
              <li>Android 10+ (Universal APK)</li>
            </ul>

            <div className="pt-3 flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-full bg-[#141418] border border-white/10 text-neutral-300 hover:text-white transition-all hover:scale-105"
                title="GitHub"
              >
                <GithubIcon className="w-4 h-4" />
              </a>
              <button
                onClick={scrollToTop}
                className="p-2.5 rounded-full bg-[#141418] border border-white/10 text-neutral-300 hover:text-white transition-all hover:scale-105 cursor-pointer"
                title="Back to Top"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div>
            &copy; {new Date().getFullYear()} Ovilo Project &bull; Free &amp; Open Source Media Player.
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>SHA-256 Verified Release</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
