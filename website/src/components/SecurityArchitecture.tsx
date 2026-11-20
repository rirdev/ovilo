import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  FileCheck,
  CheckCircle2,
  Database,
  EyeOff,
  Terminal,
} from 'lucide-react';

export const SecurityArchitecture: React.FC = () => {
  const [activeAudit, setActiveAudit] = useState<number>(0);

  const securityPillars = [
    {
      title: 'Local Loopback Origin Isolation',
      category: 'CORS & SYSTEM DEFENSE',
      status: 'VERIFIED HARDENED',
      icon: Lock,
      description:
        'The internal local media server (127.0.0.1:4545) verifies every incoming request origin. Rogue web pages in Chrome or Firefox attempting to fetch internal media or system files receive an immediate 403 Forbidden. External cross-origin access is completely blocked.',
      guarantees: [
        'Browser Same-Origin Policy strictly enforced',
        'External websites cannot query your local audio/video stream',
        'Zero remote access to local computer files or credentials',
        'Wildcard CORS (*) completely eliminated',
      ],
      impact: 'Prevents rogue websites from probing your computer or reading local documents while Ovilo is running in the background.',
    },
    {
      title: 'Canonical Path Boundary Enforcement',
      category: 'STORAGE & DIRECTORY PROTECTION',
      status: 'VERIFIED HARDENED',
      icon: FileCheck,
      description:
        'All media file streaming and disk deletion commands enforce canonical path verification. File paths containing directory traversal tricks (such as ../) or pointing outside the designated ~/Downloads/Ovilo folder are blocked before any system operations can occur.',
      guarantees: [
        'File deletions strictly confined to ~/Downloads/Ovilo',
        'Cannot read or delete system files or SSH keys',
        'Safe disk management with automated path canonicalization',
        'Path traversal exploits neutralised at the kernel level',
      ],
      impact: 'Guarantees that cleaning up or deleting a download can never harm personal files or system configuration directories.',
    },
    {
      title: 'Safe Protocol & Argument Isolation',
      category: 'DOWNLOAD DAEMON SECURITY',
      status: 'VERIFIED HARDENED',
      icon: Terminal,
      description:
        'User-provided URLs passed into the yt-dlp downloader are validated against legitimate protocols (http:// and https://). All commands enforce POSIX option boundaries (--) so that malicious input cannot be misinterpreted as executable shell flags.',
      guarantees: [
        'Blocks argument injection attacks (e.g. --exec commands)',
        'Only standard web protocols (HTTP/HTTPS) permitted',
        'Safe process spawning in an isolated child thread',
        'Zero arbitrary shell command execution',
      ],
      impact: 'Protects your system from rogue download links attempting to run background shell commands.',
    },
    {
      title: 'Owner-Bound Firestore Rules',
      category: 'DATABASE PRIVACY',
      status: 'VERIFIED HARDENED',
      icon: Database,
      description:
        'Cloud Firestore Security Rules require genuine Firebase Authentication. Your watch history, bookmarks, and playlists are bound to your user ID. Sensitive credentials and passwords are handled strictly by Google Auth and never stored in readable database collections.',
      guarantees: [
        'Only you can read or edit your personal watch history',
        'Zero plaintext passwords or hashes stored in Firestore',
        'Authenticated token expiration and refresh rotation',
        'Full GDPR and personal data sovereignty compliance',
      ],
      impact: 'Ensures no other user or crawler can access your viewing habits or account data.',
    },
    {
      title: 'Executable Launcher Whitelisting',
      category: 'BINARY EXECUTION SAFETY',
      status: 'VERIFIED HARDENED',
      icon: EyeOff,
      description:
        'The desktop file opener strictly validates file extensions against approved media formats (.mp4, .mkv, .mp3, .flac). Executable binaries (.exe, .sh, .bat, .desktop) are refused execution to safeguard your host operating system from untrusted scripts.',
      guarantees: [
        'Only verified audio and video containers opened natively',
        'Refuses execution of downloaded script or executable payloads',
        'Safe delegation to default system media players',
        'Host OS privileges protected against payload delivery',
      ],
      impact: 'Stops malicious downloads from executing arbitrary scripts when you click "Open File".',
    },
  ];

  const current = securityPillars[activeAudit];

  return (
    <section id="security" className="py-24 bg-[#0B0B0D] border-t border-white/8 relative">
      <div className="w-full px-5 sm:px-8 lg:px-10 xl:px-14">
        {/* Section Header */}
        <div
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 relative"
          data-choreo
        >
          <div>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/12 mb-4"
              data-draw-eyebrow
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span className="hud-label text-zinc-200 font-bold tracking-wider">HARDENED SECURITY SUITE</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight" data-reveal>
              Privacy by Default. <span className="text-zinc-200">Hardened by Design.</span>
            </h2>
          </div>
          <p className="text-base text-zinc-300 max-w-lg leading-relaxed font-normal" data-reveal>
            Full-stack vulnerability assessment remediated. Zero unauthenticated ports, zero directory traversal, and zero shell injections.
          </p>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" data-draw-rule />
        </div>

        {/* Security Tabs & Visual Card Layout (No Raw Code) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-10 items-start">
          {/* Left Column: Security Pillars Selector */}
          <div className="lg:col-span-5 space-y-3.5" data-reveal-group>
            {securityPillars.map((p, idx) => {
              const Icon = p.icon;
              const isSelected = activeAudit === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveAudit(idx)}
                  data-reveal
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative group hover:-translate-y-0.5 ${
                    isSelected
                      ? 'bg-[#18181E] border-white/35 shadow-[0_12px_36px_rgba(0,0,0,0.85)]'
                      : 'bg-[#111114] border-white/8 hover:border-white/20 hover:bg-[#15151A]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-zinc-400 font-semibold uppercase tracking-wider">{p.category}</span>
                    <span className="flex items-center gap-1.5 text-xs font-mono text-zinc-200 bg-zinc-800 px-2.5 py-0.5 rounded-md border border-zinc-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>{p.status}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-white flex-shrink-0" />
                    <h4
                      className={`font-display text-base font-extrabold transition-colors ${
                        isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                      }`}
                    >
                      {p.title}
                    </h4>
                  </div>
                  {isSelected && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Clean Explanation Card */}
          <div
            className="lg:col-span-7 p-8 sm:p-10 rounded-3xl bg-[#151515] border border-white/12 relative overflow-hidden glow-card interactive-spotlight hover-lift"
            data-reveal
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/8">
                <div>
                  <span className="font-mono text-xs text-zinc-400 block mb-1 uppercase tracking-wider font-semibold">SECURITY GUARANTEE</span>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {current.title}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-200 px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">
                  PROTECTED
                </span>
              </div>

              <p className="text-base sm:text-lg text-zinc-200 leading-relaxed font-normal">
                {current.description}
              </p>

              {/* Guarantees Checklist */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider block">
                  TECHNICAL ASSURANCES
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {current.guarantees.map((g, gIdx) => (
                    <div
                      key={gIdx}
                      className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#1C1C22] border border-white/8 text-xs sm:text-sm text-zinc-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-World User Impact Box */}
              <div className="p-4 rounded-xl bg-[#121216] border border-white/10 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                <span className="text-white font-bold block mb-1">User Protection:</span>
                {current.impact}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
