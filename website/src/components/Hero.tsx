import React from 'react';
import {
  Download,
  Film,
  Headphones,
  Server,
  HardDrive,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section id="hero" className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-grid">
      {/* Container Aligned to Edges */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center w-full">
          
          {/* =========================================================================
              LEFT COLUMN: Clean Typography, Highlighted Words, Smooth Rounded Buttons
              ========================================================================= */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-start text-left" data-hero-text>
            {/* Version Pill */}
            <div
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#141418] border border-white/10 mb-8 shadow-sm"
              data-reveal
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-200 font-bold">
                OVILO v1.0.0 STABLE
              </span>
              <span className="text-white/20">•</span>
              <span className="font-mono text-xs text-zinc-400 font-medium">
                Windows • Linux • Android
              </span>
            </div>

            {/* Headline with Highlighted Important Words */}
            <h1
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[2.6rem] xl:text-[3.1rem] font-extrabold tracking-tight text-white leading-[1.15]"
              data-reveal
            >
              <span>Watch </span>
              <span className="text-white underline decoration-white/30 decoration-2 underline-offset-4">Movies Ad-Free</span>.
              <br />
              <span>Explore </span>
              <span className="text-white underline decoration-white/30 decoration-2 underline-offset-4">Gigabit BDIX</span>.
              <br />
              <span className="text-zinc-200">Download in </span>
              <span className="text-white bg-white/10 px-2.5 py-0.5 rounded-xl border border-white/15">4K UHD</span>.
            </h1>

            {/* Crisp, Focused Subtitle */}
            <p
              className="mt-7 text-base sm:text-lg text-zinc-300 max-w-xl leading-relaxed font-normal"
              data-reveal
            >
              The all-in-one open media center. Stream trending cinema with <strong className="text-white font-semibold">automatic multi-server failover</strong>, explore <strong className="text-white font-semibold">100 Mbps optical media</strong>, listen with live karaoke lyrics, and save any audio/video with a built-in <strong className="text-white font-semibold">4K lossless downloader</strong>.
            </p>

            {/* Smooth Rounded Buttons */}
            <div
              className="mt-9 flex flex-wrap items-center gap-4 w-full sm:w-auto"
              data-reveal
            >
              <a
                href="#downloads"
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold text-sm sm:text-base transition-all duration-300 hover:bg-zinc-200 active:scale-95 shadow-md"
              >
                <Download className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                <span>Download Free</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-black/10 font-bold">
                  Setup &amp; Standalone
                </span>
              </a>

              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#141418] border border-white/10 text-zinc-200 font-semibold text-sm sm:text-base hover:text-white hover:border-white/30 hover:bg-[#1a1a22] active:scale-95 transition-all duration-300"
              >
                <span>The Features</span>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            {/* 4 Clean Value Pills with Smooth Rounded Corners */}
            <div
              className="mt-12 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full border-t border-white/10"
              data-reveal
            >
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#121215] border border-white/8">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Ad-Free Movies</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Multi-server failover</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#121215] border border-white/8">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Studio Music</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Live karaoke lyrics</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#121215] border border-white/8">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Gigabit BDIX</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">100 Mbps optical lines</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#121215] border border-white/8">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">4K Downloader</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Built-in yt-dlp &amp; FFmpeg</p>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: Clean Desktop Showcase (No Neon, 3D Scroll Tilt)
              ========================================================================= */}
          <div className="lg:col-span-6 xl:col-span-7 relative w-full [perspective:1400px]" data-reveal>
            <div
              data-hero-showcase
              className="relative rounded-2xl overflow-hidden border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.9)] bg-[#09090b] will-change-transform origin-center"
            >
              <img
                src="/screenshots/dashboard_preview.png"
                alt="Ovilo Desktop Dashboard"
                className="w-full h-auto block object-cover"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
