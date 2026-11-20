import React, { useState } from 'react';
import {
  Download,
  Film,
  Server,
  Play,
  Check,
  ChevronRight,
  Monitor,
  Sparkles,
} from 'lucide-react';

export const InteractiveHowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      num: '01',
      id: 1,
      title: 'Install & Launch',
      tagline: 'Zero configuration, ready in 10 seconds',
      description:
        'Download the official Windows Setup Wizard (.exe) or native Linux package (.deb / .tar.gz). The installer automatically creates your Desktop and Start Menu shortcuts with zero background bloat.',
      highlights: [
        'One-click guided setup wizard for Windows 10 & 11',
        'Native Debian / Ubuntu package or portable tarball for Linux',
        'Automatic desktop shortcut and start menu launcher',
        'Clean uninstaller integration with zero leftover files',
      ],
      badge: 'Step 1: Installation',
      previewTitle: 'Ovilo Setup Wizard',
      previewSubtitle: 'Ready to launch on your machine',
      previewMetric: '10s Setup',
    },
    {
      num: '02',
      id: 2,
      title: 'Choose Your Media',
      tagline: 'Cinema, local optical BDIX, or music',
      description:
        'Open the clean dashboard and pick your mode. Explore thousands of trending movies indexed live with TMDB, browse high-speed local optical BDIX servers at 100 Mbps, or listen to your lossless music library.',
      highlights: [
        'Instant multi-server failover (VidLink, VidSrc, Embed.su)',
        'Automatic local subnet discovery for high-speed BDIX files',
        'Complete season and episode selectors for TV series',
        'ID3 album art caching and offline music playlist organization',
      ],
      badge: 'Step 2: Source Discovery',
      previewTitle: 'Multi-Source Router',
      previewSubtitle: 'Automatic failover & local peering',
      previewMetric: '100 Mbps BDIX',
    },
    {
      num: '03',
      id: 3,
      title: 'Stream or Download in 4K',
      tagline: 'Buffer-free playback or lossless local save',
      description:
        'Click to play instantly with zero ads, auto-resume, and live synchronized karaoke lyrics. Or paste any media link into the Universal Downloader to extract crystal-clear 4K MP4 or 320kbps MP3 directly to your storage.',
      highlights: [
        'Zero ads, zero intrusive popups, and no stream hijacking',
        'Synchronized LRCLIB karaoke lyrics with real-time text highlighting',
        'Asynchronous yt-dlp & FFmpeg 4K video extraction engine',
        'Direct file reveal in your system file explorer with one click',
      ],
      badge: 'Step 3: Play & Archive',
      previewTitle: 'Lossless Engine',
      previewSubtitle: 'Live karaoke & 4K extraction',
      previewMetric: '4K UHD / 320k',
    },
  ];

  const current = steps.find((s) => s.id === activeStep) || steps[0];

  return (
    <section id="how-it-works" className="py-24 bg-[#0a0a0d] border-t border-white/8 relative">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 border border-white/12 mb-4">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-bold">
                HOW TO USE
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight" data-reveal>
              Three Simple Steps. <span className="text-zinc-400">Total Freedom.</span>
            </h2>
          </div>
          <p className="text-base text-zinc-300 max-w-md leading-relaxed font-normal" data-reveal>
            Get started with Ovilo in seconds with zero complicated setup, zero command line knowledge, and zero ads.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="flex flex-wrap items-center gap-3 mt-10" data-reveal>
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#141418] text-zinc-300 border border-white/10 hover:border-white/25 hover:text-white'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                    isActive ? 'bg-black text-white' : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {step.num}
                </span>
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Step Card */}
        <div
          key={current.id}
          className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#121215] border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-300 shadow-sm"
        >
          {/* Left Column: Step Details */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 text-zinc-300 text-xs font-mono font-semibold border border-white/10 mb-5">
                <span>{current.badge}</span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {current.title} — <span className="text-zinc-300">{current.tagline}</span>
              </h3>

              <p className="mt-5 text-base sm:text-lg text-zinc-300 leading-relaxed">
                {current.description}
              </p>

              {/* Highlights List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-8 pt-6 border-t border-white/8">
                {current.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-200">
                    <Check className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 flex items-center gap-4">
              <a
                href="#downloads"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-sm"
              >
                <span>Get Started Now</span>
                <ChevronRight className="w-4 h-4" />
              </a>
              <span className="text-xs font-mono text-zinc-400">
                Works on Windows 10/11, Linux &amp; Android
              </span>
            </div>
          </div>

          {/* Right Column: Visual HUD Preview Box */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="p-7 rounded-2xl bg-[#18181e] border border-white/10 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <span className="text-xs font-mono text-zinc-400 uppercase font-semibold">
                    STATUS PREVIEW
                  </span>
                  <h4 className="text-lg font-bold text-white mt-0.5">
                    {current.previewTitle}
                  </h4>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-mono text-white font-bold border border-white/10">
                  {current.previewMetric}
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/8 flex items-center justify-between text-xs font-mono text-zinc-300">
                  <span>Engine Pipeline</span>
                  <span className="text-white font-bold">100% Native Rust &amp; Tauri</span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/8 flex items-center justify-between text-xs font-mono text-zinc-300">
                  <span>Telemetry &amp; Ads</span>
                  <span className="text-white font-bold">Zero • 100% Private</span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/8 flex items-center justify-between text-xs font-mono text-zinc-300">
                  <span>Failover Mirrors</span>
                  <span className="text-white font-bold">Automatic Hot-Swap</span>
                </div>
              </div>

              <p className="mt-6 text-xs text-zinc-400 text-center">
                {current.previewSubtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
