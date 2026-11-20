import React from 'react';
import {
  Film,
  Server,
  Download,
  Headphones,
  Check,
  ArrowRight,
} from 'lucide-react';

export const FeaturesBento: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-[#080808] border-t border-white/8 relative">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 border border-white/12 mb-4">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-bold">
                THE CORE FEATURES
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight" data-reveal>
              Everything you need. <span className="text-zinc-400">Zero bloat.</span>
            </h2>
          </div>
          <p className="text-base text-zinc-300 max-w-md leading-relaxed font-normal" data-reveal>
            Engineered around four high-performance pillars for movies, optical networks, music, and media extraction.
          </p>
        </div>

        {/* 4 Clean Feature Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12" data-reveal-group>
          {/* Feature 1: Cinema Streaming */}
          <div
            data-reveal
            className="p-8 sm:p-10 rounded-3xl bg-[#121215] border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/8 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-bold shadow-sm">
                    <Film className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-mono text-xs text-zinc-400 block font-semibold uppercase tracking-wider">
                      CINEMA HUB
                    </span>
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                      Ad-Free Movies &amp; Shows
                    </h3>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full bg-white/10 text-xs font-mono text-zinc-200 font-semibold border border-white/10">
                  Auto-Failover
                </span>
              </div>

              <p className="text-base text-zinc-300 leading-relaxed">
                Browse trending movies and full TV seasons indexed live with <strong className="text-white font-semibold">TMDB</strong>. If any host experiences buffering, Ovilo automatically switches to an alternative server with <strong className="text-white font-semibold">zero disruption and zero ads</strong>.
              </p>

              {/* Highlighted Bullets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">4K &amp; 1080p</strong> multi-source stream</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Zero popups</strong> &amp; ad blockers</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Auto-Resume</strong> exact timestamp</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Full episodes</strong> &amp; season picker</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-white/8 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Servers: VidLink • VidSrc • Embed.su</span>
              <span className="text-white font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Instant Play</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Feature 2: Gigabit BDIX Peering */}
          <div
            data-reveal
            className="p-8 sm:p-10 rounded-3xl bg-[#121215] border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/8 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-bold shadow-sm">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-mono text-xs text-zinc-400 block font-semibold uppercase tracking-wider">
                      LOCAL PEERING
                    </span>
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                      Gigabit BDIX Network
                    </h3>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full bg-white/10 text-xs font-mono text-zinc-200 font-semibold border border-white/10">
                  100 Mbps Line
                </span>
              </div>

              <p className="text-base text-zinc-300 leading-relaxed">
                Connect directly to your local ISP’s optical media cache. Browse and stream high-bitrate movies, complete series, and disk images at <strong className="text-white font-semibold">100 Mbps optical speeds</strong> with zero buffering and <strong className="text-white font-semibold">0 MB data deduction</strong>.
              </p>

              {/* Highlighted Bullets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">80–100 Mbps</strong> high-speed transfer</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Zero data cap</strong> on peered lines</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Automatic ping</strong> &amp; latency testing</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Direct optical</strong> 4K REMUX streaming</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-white/8 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Latency: 4–8 ms Local Ping</span>
              <span className="text-white font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Browse Files</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Feature 3: Music & Live Lyrics */}
          <div
            data-reveal
            className="p-8 sm:p-10 rounded-3xl bg-[#121215] border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/8 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-bold shadow-sm">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-mono text-xs text-zinc-400 block font-semibold uppercase tracking-wider">
                      AUDIO ENGINE
                    </span>
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                      Studio Music &amp; Lyrics
                    </h3>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full bg-white/10 text-xs font-mono text-zinc-200 font-semibold border border-white/10">
                  Synced Karaoke
                </span>
              </div>

              <p className="text-base text-zinc-300 leading-relaxed">
                Listen to your offline music library or online audio streams in studio quality. Ovilo features an interactive <strong className="text-white font-semibold">floating dynamic notch</strong> and automatically downloads <strong className="text-white font-semibold">millisecond-synced karaoke lyrics</strong>.
              </p>

              {/* Highlighted Bullets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">LRCLIB karaoke</strong> live time-sync</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Floating notch</strong> movable anywhere</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">ID3 album art</strong> cache &amp; metadata</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">320kbps Lossless</strong> audio playback</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-white/8 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Engine: Native Audio Pipeline</span>
              <span className="text-white font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Play Sound</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Feature 4: 4K & MP3 Downloader */}
          <div
            data-reveal
            className="p-8 sm:p-10 rounded-3xl bg-[#121215] border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/8 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-bold shadow-sm">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-mono text-xs text-zinc-400 block font-semibold uppercase tracking-wider">
                      UNIVERSAL EXTRACTOR
                    </span>
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                      4K Video &amp; MP3 Downloader
                    </h3>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full bg-white/10 text-xs font-mono text-zinc-200 font-semibold border border-white/10">
                  yt-dlp + FFmpeg
                </span>
              </div>

              <p className="text-base text-zinc-300 leading-relaxed">
                Paste any link from YouTube, Vimeo, or 1,000+ supported sites. Ovilo executes asynchronous extraction with <strong className="text-white font-semibold">automatic FFmpeg track multiplexing</strong>, delivering ready-to-play <strong className="text-white font-semibold">4K MP4 or 320kbps MP3</strong> files.
              </p>

              {/* Highlighted Bullets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Up to 4K 60FPS</strong> video resolution</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Studio 320k</strong> MP3 audio extraction</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">Live progress</strong>, speed &amp; ETA display</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span><strong className="text-white">One-click folder</strong> reveal in Explorer</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-white/8 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Engines: POSIX yt-dlp &amp; FFmpeg</span>
              <span className="text-white font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Save Media</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
