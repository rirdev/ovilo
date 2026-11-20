import React, { useState } from 'react';
import {
  Download,
  Check,
  Monitor,
  Smartphone,
  HardDrive,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const PlatformDownloads: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<'windows' | 'linux' | 'android'>('windows');

  const packages = {
    windows: [
      {
        name: 'Ovilo-0.1.0-Setup.exe',
        title: 'Windows Setup Wizard (Installer)',
        type: 'Official guided setup wizard for Windows 10 & 11 (64-bit)',
        size: '4.2 MB',
        fileUrl: '/downloads/Ovilo-0.1.0-Setup.exe',
        recommended: true,
        tag: 'RECOMMENDED INSTALLER',
        highlights: [
          'Automatic Desktop icon & Start Menu shortcut',
          'Guided step-by-step installation wizard',
          'Clean uninstaller integration in Windows Settings',
          'Zero background telemetry or external services',
        ],
      },
      {
        name: 'ovilo.exe',
        title: 'Portable Windows Executable',
        type: 'Standalone binary without installation for any 64-bit PC',
        size: '6.9 MB',
        fileUrl: '/downloads/ovilo.exe',
        recommended: false,
        tag: 'PORTABLE STANDALONE',
        highlights: [
          'No installation needed — runs directly from any folder',
          'Perfect for USB thumb drives and portable drives',
          'Zero registry changes or system modifications',
        ],
      },
    ],
    linux: [
      {
        name: 'OVILO_0.1.0_amd64.deb',
        title: 'Debian / Ubuntu Package (.deb)',
        type: 'Native package for Debian, Ubuntu, Mint, Pop!_OS, and Kali',
        size: '7.8 MB',
        fileUrl: '/downloads/OVILO_0.1.0_amd64.deb',
        recommended: true,
        tag: 'RECOMMENDED FOR UBUNTU / DEBIAN',
        highlights: [
          'Native system desktop launcher and application menu',
          'Automatic dependency management via apt or dpkg',
          'Full hardware-accelerated playback integration',
        ],
      },
      {
        name: 'ovilo-0.1.0-linux-x86_64.tar.gz',
        title: 'Universal Linux Tarball (.tar.gz)',
        type: 'Standalone binary for Arch Linux, Fedora, openSUSE & Manjaro',
        size: '4.8 MB',
        fileUrl: '/downloads/ovilo-0.1.0-linux-x86_64.tar.gz',
        recommended: false,
        tag: 'PORTABLE LINUX ARCHIVE',
        highlights: [
          'Extract and execute directly with no root privileges needed',
          'Compatible across modern Linux distributions (glibc 2.31+)',
          'Lightweight and self-contained binary footprint',
        ],
      },
    ],
    android: [
      {
        name: 'ovilo-release.apk',
        title: 'Android Universal Release APK',
        type: 'Optimized build for Android phones and tablets (Android 10+)',
        size: '62 MB',
        fileUrl: '/downloads/ovilo-release.apk',
        recommended: true,
        tag: 'OFFICIAL ANDROID BUILD',
        highlights: [
          'Material 3 high-contrast UI with ArchiveTune settings design',
          'Dynamic yt-dlp downloader & background audio playback',
          'Multi-server cinema failover & local optical media streaming',
          'Zero ads and zero tracking for complete mobile privacy',
        ],
      },
    ],
  };

  const currentPackages = packages[activePlatform];

  return (
    <section id="downloads" className="py-24 bg-[#080808] border-t border-white/8 relative">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 border border-white/12 mb-4">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-bold">
                FILES &amp; RELEASES
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight" data-reveal>
              Download Ovilo. <span className="text-zinc-400">100% Free.</span>
            </h2>
          </div>
          <p className="text-base text-zinc-300 max-w-md leading-relaxed font-normal" data-reveal>
            Choose your operating system below to download the latest verified stable packages directly.
          </p>
        </div>

        {/* Platform Selector Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-10" data-reveal>
          <button
            onClick={() => setActivePlatform('windows')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer active:scale-95 ${
              activePlatform === 'windows'
                ? 'bg-white text-black shadow-md'
                : 'bg-[#141418] text-zinc-300 border border-white/10 hover:border-white/25 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Windows (Setup &amp; Exe)</span>
          </button>

          <button
            onClick={() => setActivePlatform('linux')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer active:scale-95 ${
              activePlatform === 'linux'
                ? 'bg-white text-black shadow-md'
                : 'bg-[#141418] text-zinc-300 border border-white/10 hover:border-white/25 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Linux (.deb &amp; .tar.gz)</span>
          </button>

          <button
            onClick={() => setActivePlatform('android')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer active:scale-95 ${
              activePlatform === 'android'
                ? 'bg-white text-black shadow-md'
                : 'bg-[#141418] text-zinc-300 border border-white/10 hover:border-white/25 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (APK)</span>
          </button>
        </div>

        {/* Download Package Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8" data-reveal-group>
          {currentPackages.map((pkg, idx) => (
            <div
              key={idx}
              data-reveal
              className={`p-8 sm:p-10 rounded-3xl bg-[#121215] border transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 ${
                pkg.recommended
                  ? 'border-white/20 bg-gradient-to-b from-[#16161c] to-[#121215] shadow-md'
                  : 'border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-white/8 mb-6">
                  <div>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-mono text-zinc-200 font-bold border border-white/10 uppercase">
                      {pkg.tag}
                    </span>
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight mt-3">
                      {pkg.title}
                    </h3>
                  </div>
                  <span className="text-sm font-mono text-white font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                    {pkg.size}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  {pkg.type}
                </p>

                {/* Highlights */}
                <div className="space-y-2.5 mt-6 pt-4 border-t border-white/8">
                  {pkg.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-zinc-200">
                      <Check className="w-4 h-4 text-white flex-shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <a
                  href={pkg.fileUrl}
                  download
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-300 active:scale-95 ${
                    pkg.recommended
                      ? 'bg-white text-black hover:bg-zinc-200 shadow-md'
                      : 'bg-[#18181f] text-white border border-white/15 hover:border-white/30 hover:bg-[#20202a]'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Download {pkg.name}</span>
                </a>

                <span className="text-xs font-mono text-zinc-400">
                  SHA256 Verified • Direct Download
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
