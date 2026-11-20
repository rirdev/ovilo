/**
 * Kino Motion Showcase - Motion Engine
 * Verbatim implementation from Kino_motion_showcase.html
 */

export const EZ = {
  std: 'cubic-bezier(.2,0,0,1)',
  dec: 'cubic-bezier(.05,.7,.1,1)',
  acc: 'cubic-bezier(.3,0,.8,.15)',
  spring: 'cubic-bezier(.34,1.5,.5,1)',
};

export const COL = ['var(--coral)', 'var(--yellow)', 'var(--peri)', 'var(--mint)'];

export const RM = () => false;

export const A = (el: HTMLElement, kf: Keyframe[] | PropertyIndexedKeyframes, o: KeyframeAnimationOptions = {}) =>
  el.animate(kf, {
    fill: 'both',
    ...o,
    duration: RM() ? 1 : (o.duration ?? 300),
    delay: RM() ? 0 : (o.delay ?? 0),
  });

export const raf = (fn: (...args: any[]) => void) => {
  let q = false;
  return (...a: any[]) => {
    if (q) return;
    q = true;
    requestAnimationFrame(() => {
      q = false;
      fn(...a);
    });
  };
};

/**
 * Trigger Like Button 450ms Spring Pop + 8 Particle Burst
 */
export function triggerLikeBurst(lk: HTMLElement) {
  const on = lk.classList.toggle('on');
  const svg = lk.querySelector('svg');
  if (svg) {
    A(
      svg as unknown as HTMLElement,
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.45)', offset: 0.4 },
        { transform: 'scale(.9)', offset: 0.7 },
        { transform: 'scale(1)' },
      ],
      { duration: 450, easing: EZ.spring }
    );
  }

  if (on) {
    for (let i = 0; i < 8; i++) {
      const d = document.createElement('i');
      d.className = 'bp';
      lk.appendChild(d);
      const a = (i / 8) * Math.PI * 2;
      A(
        d,
        [
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${Math.cos(a) * 40}px),calc(-50% + ${Math.sin(a) * 40}px)) scale(0)`,
            opacity: 0,
          },
        ],
        { duration: 600, easing: EZ.dec }
      ).finished.then(() => d.remove());
    }
  }
}

/**
 * Spawn a Kino Toast with 400ms spring-in and 250ms slide-out
 */
export function showKinoToast(msg: string) {
  let box = document.getElementById('kino-toasts-container');
  if (!box) {
    box = document.createElement('div');
    box.id = 'kino-toasts-container';
    box.className = 'toasts';
    document.body.appendChild(box);
  }

  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<i></i><span>${msg}</span>`;
  box.appendChild(t);

  A(t, [{ transform: 'translateY(26px) scale(.95)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
    duration: 400,
    easing: EZ.spring,
  });

  setTimeout(async () => {
    const h = t.offsetHeight;
    await A(t, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(30px)', opacity: 0 }], {
      duration: 250,
      easing: EZ.acc,
    }).finished.catch(() => {});

    await A(
      t,
      [
        { height: h + 'px', marginBottom: '0px', paddingTop: '12px', paddingBottom: '12px' },
        { height: '0px', marginBottom: '-8px', paddingTop: '0px', paddingBottom: '0px' },
      ],
      { duration: 200, easing: EZ.std }
    ).finished.catch(() => {});

    t.remove();
  }, 2600);
}

/**
 * Initialize all global motion event delegations across the whole app
 */
export function initKinoMotion() {
  if (typeof window === 'undefined') return;

  // 1. Global Ripple Effect for all buttons, chips, and clickable controls
  document.addEventListener('pointerdown', (e) => {
    const b = (e.target as HTMLElement)?.closest(
      '.rip, .b, .kino-btn, .btn, button, .like, .segc button, .alb, .dlb'
    ) as HTMLElement | null;
    if (!b || b.classList.contains('no-rip')) return;

    const r = b.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s);

    A(s, [{ transform: 'scale(0)', opacity: 0.3 }, { transform: 'scale(1)', opacity: 0 }], {
      duration: 600,
      easing: EZ.dec,
    }).finished.then(() => s.remove());
  });

  // 2. Global 3D Card Tilt with Specular Radial Highlight
  let activeTiltEl: HTMLElement | null = null;
  document.addEventListener('pointermove', (e) => {
    const t = (e.target as HTMLElement)?.closest('.tilt, .kino-stat') as HTMLElement | null;
    if (t !== activeTiltEl) {
      if (activeTiltEl) {
        activeTiltEl.classList.remove('mv');
        activeTiltEl.style.setProperty('--rx', '0deg');
        activeTiltEl.style.setProperty('--ry', '0deg');
        activeTiltEl.style.setProperty('--go', '0');
      }
      activeTiltEl = t;
    }
    if (!t) return;
    const r = t.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    t.classList.add('mv');
    t.style.setProperty('--ry', `${(x - 0.5) * 24}deg`);
    t.style.setProperty('--rx', `${(0.5 - y) * 24}deg`);
    t.style.setProperty('--gx', `${x * 100}%`);
    t.style.setProperty('--gy', `${y * 100}%`);
    t.style.setProperty('--go', '1');
  });

  window.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget && activeTiltEl) {
      activeTiltEl.classList.remove('mv');
      activeTiltEl.style.setProperty('--rx', '0deg');
      activeTiltEl.style.setProperty('--ry', '0deg');
      activeTiltEl.style.setProperty('--go', '0');
      activeTiltEl = null;
    }
  });

  // 3. Scroll Reveal Observer with dynamic MutationObserver for React components
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
        }
      });
    },
    { threshold: 0.1 }
  );

  const observeElements = () => {
    document.querySelectorAll('.rc:not(.in), .kino-reveal:not(.in), .eprow:not(.in)').forEach((el) => {
      io.observe(el);
      // If already in viewport or parent has height, trigger reveal
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('in');
      }
    });
  };

  observeElements();

  const mo = new MutationObserver(() => {
    observeElements();
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // 4. Global Switch Toggles
  document.addEventListener('click', (e) => {
    const s = (e.target as HTMLElement)?.closest('.sw.tg') as HTMLElement | null;
    if (s) {
      s.classList.toggle('on');
    }
  });

  // 5. Global Like Button 450ms Spring Pop + 8 Particle Burst
  document.addEventListener('click', (e) => {
    const lk = (e.target as HTMLElement)?.closest('.like') as HTMLElement | null;
    if (lk) {
      triggerLikeBurst(lk);
    }
  });

  // 6. Global Play/Pause Morph (.ppb) - Controlled by React AudioContext isPlaying state

  // 7. Global Download Button Progress Morph (.dlb)
  document.addEventListener('click', (e) => {
    const dl = (e.target as HTMLElement)?.closest('.dlb:not([data-react-managed])') as HTMLElement | null;
    if (dl) {
      if (dl.classList.contains('run') || dl.classList.contains('done')) return;
      dl.classList.add('run');
      const pr = dl.querySelector('.prg') as SVGGeometryElement | null;
      const C2 = 2 * Math.PI * 20;
      if (pr) {
        pr.style.strokeDasharray = `${C2}`;
        pr.style.strokeDashoffset = `${C2}`;
      }
      const t0 = performance.now();
      const D = RM() ? 50 : 2200;
      function f(t: number) {
        const p = Math.min(1, (t - t0) / D);
        if (pr) pr.style.strokeDashoffset = `${C2 * (1 - p)}`;
        if (p < 1) requestAnimationFrame(f);
        else {
          dl?.classList.remove('run');
          dl?.classList.add('done');
          setTimeout(() => {
            dl?.classList.remove('done');
            if (pr) pr.style.strokeDashoffset = `${C2}`;
          }, 1800);
        }
      }
      requestAnimationFrame(f);
    }
  });

  // 8. Global Add to List Morph (.alb)
  document.addEventListener('click', (e) => {
    const alb = (e.target as HTMLElement)?.closest('.alb:not([data-react-managed])') as HTMLElement | null;
    if (alb) {
      alb.classList.toggle('on');
    }
  });

  // 9. Global Extended FAB (.fab)
  document.addEventListener('click', (e) => {
    const fab = (e.target as HTMLElement)?.closest('.fab') as HTMLElement | null;
    if (fab) {
      fab.classList.toggle('sm');
    }
  });

  // 10. Global Segmented Control (.segc) Indicator
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement)?.closest('.segc button') as HTMLElement | null;
    if (b) {
      const seg = b.closest('.segc') as HTMLElement;
      const ind = seg?.querySelector('.ind') as HTMLElement | null;
      seg?.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      if (ind) {
        ind.style.left = `${b.offsetLeft}px`;
        ind.style.width = `${b.offsetWidth}px`;
      }
    }
  });

  // 11. Global Dialog & Sheet Close
  document.addEventListener('click', (e) => {
    const closer = (e.target as HTMLElement)?.closest('[data-close], .scrim') as HTMLElement | null;
    if (closer) {
      document.querySelectorAll('.scrim, .dlg, .sheet').forEach((el) => el.classList.remove('on'));
    }
  });

  // 12. Global Search Expand Animation
  document.addEventListener('click', (e) => {
    const srch = (e.target as HTMLElement)?.closest('.srch') as HTMLElement | null;
    if (srch) {
      srch.classList.add('open');
      const input = srch.querySelector('input');
      input?.focus();
    }
  });

  document.addEventListener('focusout', (e) => {
    const srch = (e.target as HTMLElement)?.closest('.srch') as HTMLElement | null;
    if (srch) {
      const input = srch.querySelector('input');
      if (input && !input.value.trim()) {
        srch.classList.remove('open');
      }
    }
  });

  // 13. Listen for custom kino toasts
  window.addEventListener('ovilo_toast', ((e: CustomEvent) => {
    if (e.detail?.message) {
      showKinoToast(e.detail.message);
    }
  }) as EventListener);
}
