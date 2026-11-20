import {
  themeFromSourceColor,
  argbFromHex,
  hexFromArgb,
  sourceColorFromImage,
} from '@material/material-color-utilities';

export interface M3ThemeColors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  background: string;
  onBackground: string;
}

// Default OVILO signature seed color: #ffd24d (Kino Showcase Yellow)
export const DEFAULT_THEME_COLOR = '#ffd24d';

export function generateM3DarkTheme(sourceHex: string): M3ThemeColors {
  try {
    const argb = argbFromHex(sourceHex);
    const theme = themeFromSourceColor(argb);
    const dark = theme.schemes.dark;
    const neutral = theme.palettes.neutral;
    const neutralVariant = theme.palettes.neutralVariant;

    return {
      primary: hexFromArgb(dark.primary),
      onPrimary: hexFromArgb(dark.onPrimary),
      primaryContainer: hexFromArgb(dark.primaryContainer),
      onPrimaryContainer: hexFromArgb(dark.onPrimaryContainer),
      secondary: hexFromArgb(dark.secondary),
      secondaryContainer: hexFromArgb(dark.secondaryContainer),
      onSecondaryContainer: hexFromArgb(dark.onSecondaryContainer),
      tertiary: hexFromArgb(dark.tertiary),
      tertiaryContainer: hexFromArgb(dark.tertiaryContainer),
      onTertiaryContainer: hexFromArgb(dark.onTertiaryContainer),
      surface: hexFromArgb(dark.surface),
      surfaceDim: hexFromArgb(neutral.tone(6)),
      surfaceBright: hexFromArgb(neutral.tone(24)),
      surfaceContainerLowest: hexFromArgb(neutral.tone(4)),
      surfaceContainerLow: hexFromArgb(neutral.tone(10)),
      surfaceContainer: hexFromArgb(neutral.tone(12)),
      surfaceContainerHigh: hexFromArgb(neutral.tone(17)),
      surfaceContainerHighest: hexFromArgb(neutral.tone(22)),
      onSurface: hexFromArgb(dark.onSurface),
      onSurfaceVariant: hexFromArgb(neutralVariant.tone(80)),
      outline: hexFromArgb(neutralVariant.tone(60)),
      outlineVariant: hexFromArgb(neutralVariant.tone(30)),
      background: hexFromArgb(dark.background),
      onBackground: hexFromArgb(dark.onBackground),
    };
  } catch (err) {
    console.error('Error generating M3 theme:', err);
    return getFallbackTheme();
  }
}

export function getFallbackTheme(): M3ThemeColors {
  return {
    primary: '#ffb3b5',
    onPrimary: '#561d24',
    primaryContainer: '#733339',
    onPrimaryContainer: '#ffd8db',
    secondary: '#e5bdbe',
    secondaryContainer: '#5d3f41',
    onSecondaryContainer: '#ffd8db',
    tertiary: '#e7bf91',
    tertiaryContainer: '#5e411b',
    onTertiaryContainer: '#ffddb8',
    surface: '#111315',
    surfaceDim: '#0d0f11',
    surfaceBright: '#37393d',
    surfaceContainerLowest: '#0c0e10',
    surfaceContainerLow: '#191b1f',
    surfaceContainer: '#1d2024',
    surfaceContainerHigh: '#282a2e',
    surfaceContainerHighest: '#333539',
    onSurface: '#e2e2e6',
    onSurfaceVariant: '#c4c6cb',
    outline: '#8e9095',
    outlineVariant: '#44474b',
    background: '#111315',
    onBackground: '#e2e2e6',
  };
}

export function applyM3ThemeToCss(theme: M3ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty('--md-sys-color-primary', theme.primary);
  root.style.setProperty('--md-sys-color-on-primary', theme.onPrimary);
  root.style.setProperty('--md-sys-color-primary-container', theme.primaryContainer);
  root.style.setProperty('--md-sys-color-on-primary-container', theme.onPrimaryContainer);
  root.style.setProperty('--md-sys-color-secondary', theme.secondary);
  root.style.setProperty('--md-sys-color-secondary-container', theme.secondaryContainer);
  root.style.setProperty('--md-sys-color-on-secondary-container', theme.onSecondaryContainer);
  root.style.setProperty('--md-sys-color-tertiary', theme.tertiary);
  root.style.setProperty('--md-sys-color-tertiary-container', theme.tertiaryContainer);
  root.style.setProperty('--md-sys-color-on-tertiary-container', theme.onTertiaryContainer);
  root.style.setProperty('--md-sys-color-surface', theme.surface);
  root.style.setProperty('--md-sys-color-surface-dim', theme.surfaceDim);
  root.style.setProperty('--md-sys-color-surface-bright', theme.surfaceBright);
  root.style.setProperty('--md-sys-color-surface-container-lowest', theme.surfaceContainerLowest);
  root.style.setProperty('--md-sys-color-surface-container-low', theme.surfaceContainerLow);
  root.style.setProperty('--md-sys-color-surface-container', theme.surfaceContainer);
  root.style.setProperty('--md-sys-color-surface-container-high', theme.surfaceContainerHigh);
  root.style.setProperty('--md-sys-color-surface-container-highest', theme.surfaceContainerHighest);
  root.style.setProperty('--md-sys-color-on-surface', theme.onSurface);
  root.style.setProperty('--md-sys-color-on-surface-variant', theme.onSurfaceVariant);
  root.style.setProperty('--md-sys-color-outline', theme.outline);
  root.style.setProperty('--md-sys-color-outline-variant', theme.outlineVariant);
  root.style.setProperty('--md-sys-color-background', theme.background);
  root.style.setProperty('--md-sys-color-on-background', theme.onBackground);
}

/**
 * Extracts the dominant color from an image URL (using an offscreen HTMLImageElement + Canvas)
 * and applies the dynamic Material 3 dark palette.
 */
export async function extractAndApplyThemeFromImage(imageUrl: string): Promise<M3ThemeColors> {
  if (!imageUrl) {
    const fallback = generateM3DarkTheme(DEFAULT_THEME_COLOR);
    applyM3ThemeToCss(fallback);
    return fallback;
  }

  return new Promise<M3ThemeColors>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = async () => {
      try {
        const sourceColor = await sourceColorFromImage(img);
        const hex = hexFromArgb(sourceColor);
        const theme = generateM3DarkTheme(hex);
        applyM3ThemeToCss(theme);
        resolve(theme);
      } catch (err) {
        console.warn('Could not extract source color directly, falling back to canvas sampling', err);
        const sampledColor = sampleCanvasDominantColor(img);
        const theme = generateM3DarkTheme(sampledColor);
        applyM3ThemeToCss(theme);
        resolve(theme);
      }
    };

    img.onerror = () => {
      const fallback = generateM3DarkTheme(DEFAULT_THEME_COLOR);
      applyM3ThemeToCss(fallback);
      resolve(fallback);
    };
  });
}

function sampleCanvasDominantColor(img: HTMLImageElement): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return DEFAULT_THEME_COLOR;

    const size = 64;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 25 && brightness < 235) {
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }

    if (count === 0) return DEFAULT_THEME_COLOR;

    const r = Math.round(rSum / count).toString(16).padStart(2, '0');
    const g = Math.round(gSum / count).toString(16).padStart(2, '0');
    const b = Math.round(bSum / count).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  } catch {
    return DEFAULT_THEME_COLOR;
  }
}
