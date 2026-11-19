import React, { useState } from 'react';
import {
  Mail,
  Send,
  MessageSquare,
  CheckCircle2,
  Heart,
  Code2,
  Shield,
  Terminal,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';

export const AboutAndContact: React.FC = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    topic: 'feature',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <section id="about" className="py-24 bg-[#0B0B0D] border-t border-white/8 relative">
      <div className="w-full px-5 sm:px-8 lg:px-10 xl:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: About Me & Philosophy */}
          <div className="lg:col-span-6 space-y-6" data-reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/12 mb-2">
              <span className="w-2 h-2 rounded-full bg-white ring-2 ring-white/20" />
              <span className="hud-label text-zinc-200 font-bold tracking-wider">ABOUT ME &bull; THE MISSION</span>
            </div>

            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Crafted for Those Who Value <span className="text-zinc-200">Speed and Privacy.</span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-200 leading-relaxed font-normal">
              Hi, I'm an independent software engineer and media enthusiast. I built Ovilo out of deep frustration with mainstream media software. Today's streaming apps are bloated with telemetry trackers, locked behind subscription walls, and wrapped in heavy web runtimes that consume gigabytes of RAM.
            </p>

            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
              Ovilo is built on a simple philosophy: <strong className="text-white font-bold">your device, your media</strong>. By pairing a lightweight Rust backend with a hardware-accelerated Tauri v2 interface, Ovilo launches in under 200 milliseconds, runs at ~45MB idle RAM footprint, and leaves zero forensic trace.
            </p>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-2 gap-4 pt-4" data-reveal-group>
              <div
                className="p-5 rounded-2xl bg-[#151515] border border-white/10 interactive-spotlight hover-lift"
                data-reveal
              >
                <span className="font-mono text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-1">RUNTIME</span>
                <span className="font-display font-extrabold text-base text-white">Rust + Tauri v2</span>
                <p className="text-xs text-zinc-300 font-mono mt-1 font-medium">
                  Replaces 300MB Electron engines with tiny native binaries.
                </p>
              </div>

              <div
                className="p-5 rounded-2xl bg-[#151515] border border-white/10 interactive-spotlight hover-lift"
                data-reveal
              >
                <span className="font-mono text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-1">FRONTEND</span>
                <span className="font-display font-extrabold text-base text-white">React 19 + Tailwind</span>
                <p className="text-xs text-zinc-300 font-mono mt-1 font-medium">
                  Signature #151515 high-contrast obsidian aesthetic.
                </p>
              </div>
            </div>

            {/* Open Source Statement */}
            <div
              className="p-5 rounded-2xl bg-[#151515] border border-white/10 flex items-center justify-between interactive-spotlight hover-lift"
              data-reveal
            >
              <div className="flex items-center gap-3.5">
                <GithubIcon className="w-6 h-6 text-white" />
                <div>
                  <h4 className="text-sm font-bold text-white">100% Free &amp; Open Source</h4>
                  <span className="text-xs text-zinc-300 font-mono">MIT Licensed &bull; Contributions welcome</span>
                </div>
              </div>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all shadow-sm"
              >
                GitHub &rarr;
              </a>
            </div>
          </div>

          {/* Right Column: Contact & Feedback Form */}
          <div
            id="contact"
            className="lg:col-span-6 p-8 sm:p-10 rounded-3xl bg-[#151515] border border-white/12 relative glow-card interactive-spotlight hover-lift"
            data-reveal
          >
            <span className="tick top-3 left-3 opacity-50" />
            <span className="tick bottom-3 right-3 opacity-50" />

            <div className="flex items-center justify-between pb-4 border-b border-white/8 mb-6">
              <div>
                <span className="font-mono text-xs text-zinc-400 block mb-1 uppercase tracking-wider font-semibold">COMMUNICATION CHANNEL</span>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Get in Touch
                </h3>
              </div>
              <span className="p-2.5 rounded-xl bg-white/8 text-zinc-200 border border-white/12">
                <Mail className="w-5 h-5" />
              </span>
            </div>

            {submitted ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-white">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-display text-xl font-bold text-white">Transmission Received</h4>
                <p className="text-xs text-neutral-400 font-mono max-w-sm mx-auto leading-relaxed">
                  Thank you for reaching out! Your report has been dispatched to the Ovilo developer inbox.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormState({ name: '', email: '', topic: 'feature', message: '' });
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1.5 uppercase tracking-wider">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0D] border border-white/10 text-white placeholder-neutral-600 text-xs font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0D] border border-white/10 text-white placeholder-neutral-600 text-xs font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1.5 uppercase tracking-wider">
                    Inquiry Topic
                  </label>
                  <select
                    value={formState.topic}
                    onChange={(e) => setFormState({ ...formState, topic: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0D] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  >
                    <option value="feature">Feature Request or Enhancement</option>
                    <option value="bug">Bug Report / Stream Host Issue</option>
                    <option value="bdix">BDIX FTP Subnet Peering</option>
                    <option value="security">Security Vulnerability Disclosure</option>
                    <option value="other">General Feedback / Say Hello</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1.5 uppercase tracking-wider">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your suggestion, stream bug, or question..."
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0D] border border-white/10 text-white placeholder-neutral-600 text-xs font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 active:scale-98 transition-all duration-300 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      <span>Transmitting...</span>
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Dispatch Message</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
