import React from 'react';
import {
  Database,
  Server,
  Music,
  Film,
  Globe,
  CheckCircle2,
} from 'lucide-react';

export const ApiIntegrations: React.FC = () => {
  const apis = [
    {
      name: 'TMDB Catalog Proxy',
      category: 'GLOBAL MEDIA METADATA',
      icon: Film,
      desc: 'All movie and television discovery, cast details, high-res posters, and genre search queries route through an internal cached proxy to prevent DNS blocking.',
      badge: 'AUTO-CACHED',
      features: ['50,000+ indexed titles', 'Live trending and top-rated lists', 'Multi-language audio and subtitle tags'],
    },
    {
      name: 'BDIX Optical Peering',
      category: 'LOCAL GIGABIT ROUTING',
      icon: Server,
      desc: 'Scans local ISP optical subnets to discover media servers. Automatically indexes folders for zero-buffer 100Mbps local video streaming.',
      badge: 'OPTICAL PEERING',
      features: ['Sub-10ms ping latency', 'Zero ISP data cap deduction', 'Direct high-bitrate video streaming'],
    },
    {
      name: 'LRCLIB Synced Lyrics',
      category: 'AUDIO INTELLIGENCE',
      icon: Music,
      desc: 'Queries open-source community lyrics databases using embedded ID3 tags, providing millisecond-accurate synchronized lyrics for karaoke playback.',
      badge: 'TIME-SYNCED',
      features: ['Word-by-word karaoke highlighting', 'Over 10 million indexed songs', 'Offline lyrics cache on disk'],
    },
    {
      name: 'Multi-Mirror Failover',
      category: 'STREAMING REDUNDANCY',
      icon: Globe,
      desc: 'Dynamic streaming engine resolves multi-source fallback URLs. Automatically selects the lowest latency host and removes ad embeds.',
      badge: 'ZERO RESTRICTIONS',
      features: ['Automatic host failover (<200ms)', 'Clean playback without popup redirects', 'Full season & episode selectors'],
    },
    {
      name: 'Cloud History Sync',
      category: 'ENCRYPTED SYNC',
      icon: Database,
      desc: 'Real-time synchronization for watch history, resume timestamps, and favorites bound strictly to your authenticated session.',
      badge: 'ENCRYPTED',
      features: ['Google Firebase Auth backed', 'Cross-platform state restoration', 'Zero advertising profiles or tracking'],
    },
  ];

  return (
    <section id="apis" className="py-24 bg-[#080808] border-t border-white/8 relative">
      <div className="w-full px-5 sm:px-8 lg:px-10 xl:px-14">
        {/* Header */}
        <div
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 relative"
          data-choreo
        >
          <div>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/12 mb-4"
              data-draw-eyebrow
            >
              <span className="w-2 h-2 rounded-full bg-white ring-2 ring-white/20" />
              <span className="hud-label text-zinc-200 font-bold tracking-wider">INTEGRATIONS &bull; PIPELINES</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight" data-reveal>
              Open APIs &amp; <span className="text-zinc-200">Native Pipelines</span>
            </h2>
          </div>
          <p className="text-base text-zinc-300 max-w-lg leading-relaxed font-normal" data-reveal>
            Transparently documented network protocols powering Ovilo's multi-source media ecosystem.
          </p>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" data-draw-rule />
        </div>

        {/* API Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10" data-reveal-group>
          {apis.map((api, idx) => {
            const Icon = api.icon;
            return (
              <div
                key={idx}
                data-reveal
                className="p-7 sm:p-8 rounded-3xl bg-[#151515] border border-white/10 relative flex flex-col justify-between glow-card interactive-spotlight hover-lift group"
              >
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/8 mb-4">
                    <span className="font-mono text-xs text-zinc-400 font-semibold uppercase tracking-wider">{api.category}</span>
                    <span className="px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-200">
                      {api.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 mb-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center text-white group-hover:border-white/30 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-extrabold text-lg sm:text-xl text-white group-hover:text-zinc-200 transition-colors">
                      {api.name}
                    </h3>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed font-normal mb-5">
                    {api.desc}
                  </p>

                  {/* Clean Feature List */}
                  <div className="space-y-2 pt-3 border-t border-white/8">
                    {api.features.map((f, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
