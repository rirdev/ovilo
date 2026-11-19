import React, { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeaturesBento } from './components/FeaturesBento';
import { InteractiveHowItWorks } from './components/InteractiveHowItWorks';
import { PlatformDownloads } from './components/PlatformDownloads';
import { Footer } from './components/Footer';
import { initSmoothScrollAndReveal } from './lib/scrollReveal';

export const App: React.FC = () => {
  useEffect(() => {
    const cleanup = initSmoothScrollAndReveal();
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col selection:bg-white selection:text-black antialiased">
      {/* Sticky Header */}
      <Navbar />

      {/* Main Flow: Hero -> Features -> How to Use -> Files & Downloads */}
      <main className="flex-1">
        <Hero />
        <FeaturesBento />
        <InteractiveHowItWorks />
        <PlatformDownloads />
      </main>

      {/* Clean Minimalist Footer */}
      <Footer />
    </div>
  );
};

export default App;
