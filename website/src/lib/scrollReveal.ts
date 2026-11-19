import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export function initSmoothScrollAndReveal() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Initialize Lenis Smooth Scrolling
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.6,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // If user prefers reduced motion, reveal everything immediately
  if (prefersReducedMotion) {
    const allReveal = document.querySelectorAll<HTMLElement>('[data-reveal]');
    gsap.set(allReveal, { autoAlpha: 1, y: 0, scale: 1 });
    return () => lenis.destroy();
  }

  // 2. High-Performance Hardware-Accelerated Reveal Presets (Compositor only: opacity + transform)
  const initialHidden = {
    autoAlpha: 0,
    y: 24,
    scale: 0.985,
  };

  const targetVisible = {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.7,
    ease: 'power2.out',
    overwrite: 'auto' as const,
  };

  // 3. Hero Entrance - Staggered Cascade
  const heroItems = document.querySelectorAll<HTMLElement>('#hero [data-reveal]');
  if (heroItems.length) {
    gsap.set(heroItems, initialHidden);
    gsap.to(heroItems, {
      ...targetVisible,
      stagger: 0.08,
      delay: 0.05,
    });
  }

  // 4. Hero 3D Perspective Tilt on Scroll (Continuous Scrub)
  const heroShowcase = document.querySelector<HTMLElement>('[data-hero-showcase]');
  const heroText = document.querySelector<HTMLElement>('[data-hero-text]');

  if (heroShowcase) {
    gsap.to(heroShowcase, {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom 20%',
        scrub: 1,
      },
      rotateX: 5,
      rotateY: -2,
      scale: 0.95,
      y: 35,
      transformOrigin: 'center center',
      ease: 'power1.out',
    });
  }

  if (heroText) {
    gsap.to(heroText, {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom 20%',
        scrub: 1,
      },
      y: -20,
      opacity: 0.9,
      ease: 'none',
    });
  }

  // 5. Staggered Groups ([data-reveal-group])
  const groups = document.querySelectorAll<HTMLElement>('[data-reveal-group]');
  groups.forEach((group) => {
    if (group.closest('#hero')) return;
    const items = group.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!items.length) return;

    gsap.set(items, initialHidden);

    ScrollTrigger.create({
      trigger: group,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          ...targetVisible,
          stagger: 0.08,
        });
      },
    });
  });

  // 6. Standalone Reveal Elements
  const standaloneReveals = document.querySelectorAll<HTMLElement>('[data-reveal]');
  standaloneReveals.forEach((el) => {
    if (el.closest('#hero') || el.closest('[data-reveal-group]')) return;

    gsap.set(el, initialHidden);

    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(el, targetVisible);
      },
    });
  });

  return () => {
    ScrollTrigger.getAll().forEach((t) => t.kill());
    lenis.destroy();
  };
}
