import React from 'react';

const TICKER_ITEMS = [
  'RUST CORE HIGH-PERFORMANCE ENGINE',
  '0% TELEMETRY & ZERO DATA RETENTION',
  '45MB IDLE RAM FOOTPRINT',
  '4K HDR AD-FREE MULTI-MIRROR STREAMING',
  'LOW-LATENCY BDIX ISP PEERING',
  'SYNCHRONIZED REAL-TIME LRCLIB LYRICS',
  'CANONICAL PATH SECURITY BOUNDS',
  'NATIVE TAURI v2 DESKTOP ARCHITECTURE',
  'LOCAL AUDIO LOOPBACK PROXY',
  'CROSS-PLATFORM LINUX & WINDOWS BUILDS',
];

export const MarqueeTicker: React.FC = () => {
  return (
    <div className="relative w-full border-y border-white/8 bg-[#0C0C0E] py-3.5 overflow-hidden select-none">
      {/* Edge gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-[#080808] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-[#080808] to-transparent z-10 pointer-events-none" />

      <div className="flex w-max animate-marquee space-x-12 hover:[animation-play-state:paused] cursor-default">
        {/* Repeating sequence 1 */}
        <div className="flex items-center space-x-12">
          {TICKER_ITEMS.map((item, idx) => (
            <div key={`t1-${idx}`} className="flex items-center space-x-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400 font-medium hover:text-white transition-colors">
                {item}
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-600 inline-block" />
            </div>
          ))}
        </div>

        {/* Repeating sequence 2 (seamless loop) */}
        <div className="flex items-center space-x-12">
          {TICKER_ITEMS.map((item, idx) => (
            <div key={`t2-${idx}`} className="flex items-center space-x-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400 font-medium hover:text-white transition-colors">
                {item}
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-600 inline-block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
