export interface BdixFile {
  name: string;
  url: string;
  extension: string;
  folder?: string;
}

export interface BdixPackage {
  id: number;
  title: string;
  folder: string;
  thumbnailUrl?: string | null;
  category: string;
  primaryExtension: string;
  fileCount: number;
  files: BdixFile[];
  source: 'server1' | 'server2';
  year?: string;
}

export interface BdixResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  packages: BdixPackage[];
  source: string;
  query: string;
  activeCategory?: string;
  activeExtension?: string | null;
}

const API_BASE = 'https://rirtech.netlify.app/api/downloads';

import { invoke } from '@tauri-apps/api/core';

function generateQueryVariants(q: string): string[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const variants: string[] = [trimmed];

  const lower = trimmed.toLowerCase();
  let normalized = lower;
  const wordPairs: [RegExp, string][] = [
    [/\bspiderman\b/g, 'spider-man'],
    [/\bspider man\b/g, 'spider-man'],
    [/\bspiderverse\b/g, 'spider-verse'],
    [/\bspider verse\b/g, 'spider-verse'],
    [/\bbatman\b/g, 'bat-man'],
    [/\bsuperman\b/g, 'super-man'],
    [/\bironman\b/g, 'iron-man'],
    [/\bxmen\b/g, 'x-men'],
    [/\bavengers\b/g, 'avenger'],
  ];

  for (const [re, rep] of wordPairs) {
    normalized = normalized.replace(re, rep);
  }
  if (normalized !== lower && !variants.includes(normalized)) {
    variants.push(normalized);
  }

  // Without hyphens
  const unhyphen = trimmed.replace(/-/g, ' ');
  if (unhyphen !== trimmed && !variants.includes(unhyphen)) {
    variants.push(unhyphen);
  }

  // Hyphenated variant of multi-words
  const hyphenated = trimmed.replace(/\s+/g, '-');
  if (hyphenated !== trimmed && !variants.includes(hyphenated)) {
    variants.push(hyphenated);
  }

  return variants;
}

async function fetchRawBdixUrl(url: string): Promise<BdixResponse> {
  try {
    const raw = await invoke<string>('fetch_bdix_api', { url });
    return JSON.parse(raw);
  } catch (tauriErr) {
    console.warn('Native fetch_bdix_api fallback to browser fetch:', tauriErr);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch media data: ${res.statusText}`);
    }
    return await res.json();
  }
}

export async function fetchBdixData(params: {
  q?: string;
  category?: string;
  extension?: string;
  source?: 'all' | 'server1' | 'server2';
  page?: number;
  limit?: number;
}): Promise<BdixResponse> {
  const query = params.q?.trim();

  // If no query string, perform simple direct fetch
  if (!query) {
    const qp = new URLSearchParams();
    if (params.category && params.category !== 'all') qp.set('category', params.category);
    if (params.extension && params.extension !== 'all') qp.set('extension', params.extension);
    if (params.source && params.source !== 'all') qp.set('source', params.source);
    qp.set('page', String(params.page || 1));
    qp.set('limit', String(params.limit || 30));
    return fetchRawBdixUrl(`${API_BASE}?${qp.toString()}`);
  }

  // Multi-variant search to catch spelling variations (hyphens, spaces, compound words)
  const variants = generateQueryVariants(query);

  const fetchPromises = variants.map((v) => {
    const qp = new URLSearchParams();
    qp.set('q', v);
    if (params.category && params.category !== 'all') qp.set('category', params.category);
    if (params.extension && params.extension !== 'all') qp.set('extension', params.extension);
    if (params.source && params.source !== 'all') qp.set('source', params.source);
    qp.set('page', '1');
    qp.set('limit', String(params.limit || 50));
    return fetchRawBdixUrl(`${API_BASE}?${qp.toString()}`).catch(() => null);
  });

  const responses = await Promise.all(fetchPromises);
  const packageMap = new Map<number, BdixPackage>();
  let baseResponse: BdixResponse | null = null;

  for (const r of responses) {
    if (r && r.packages) {
      if (!baseResponse) baseResponse = r;
      for (const pkg of r.packages) {
        if (!packageMap.has(pkg.id)) {
          packageMap.set(pkg.id, pkg);
        }
      }
    }
  }

  // Token fallback for multi-word phrases (e.g. "spiderman into the spiderverse")
  if (packageMap.size === 0 && query.includes(' ')) {
    const stopWords = ['into', 'the', 'and', 'from', 'with', 'movie', 'series', '2018', '2024'];
    const tokens = query
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.includes(w));

    const tokenPromises = tokens.slice(0, 3).map((token) => {
      const qp = new URLSearchParams();
      const tokenVar = generateQueryVariants(token)[1] || token;
      qp.set('q', tokenVar);
      if (params.category && params.category !== 'all') qp.set('category', params.category);
      if (params.extension && params.extension !== 'all') qp.set('extension', params.extension);
      if (params.source && params.source !== 'all') qp.set('source', params.source);
      qp.set('page', '1');
      qp.set('limit', '50');
      return fetchRawBdixUrl(`${API_BASE}?${qp.toString()}`).catch(() => null);
    });

    const tokenResponses = await Promise.all(tokenPromises);
    for (const r of tokenResponses) {
      if (r && r.packages) {
        if (!baseResponse) baseResponse = r;
        for (const pkg of r.packages) {
          if (!packageMap.has(pkg.id)) {
            packageMap.set(pkg.id, pkg);
          }
        }
      }
    }
  }

  const mergedPackages = Array.from(packageMap.values());

  return {
    success: true,
    total: mergedPackages.length,
    page: params.page || 1,
    limit: params.limit || mergedPackages.length,
    totalPages: 1,
    packages: mergedPackages,
    source: params.source || 'all',
    query,
  };
}

/**
 * Returns prioritized candidate thumbnail URLs for an item.
 */
export function getThumbnailCandidates(item: BdixPackage): string[] {
  const candidates: string[] = [];

  // 1. Explicit thumbnail URL if present
  if (item.thumbnailUrl) {
    candidates.push(item.thumbnailUrl);
  }

  // 2. Server 1 (Dhaka mirror) folder patterns
  if (item.source === 'server1' || item.folder?.includes('172.16.50')) {
    const rawFolder = (item.folder || '').trim().replace(/\/?$/, '/');
    if (rawFolder.startsWith('http')) {
      if (item.category === 'game') {
        candidates.push(`${rawFolder}000.jpg`);
        candidates.push(`${rawFolder}000.png`);
        candidates.push(`${rawFolder}002.jpg`);
        candidates.push(`${rawFolder}a_VL_.jpg`);
        candidates.push(`${rawFolder}cover.png`);
        candidates.push(`${rawFolder}poster.png`);
      } else if (item.category === 'app') {
        candidates.push(`${rawFolder}000.jpg`);
        candidates.push(`${rawFolder}000.png`);
        candidates.push(`${rawFolder}icon.png`);
        candidates.push(`${rawFolder}cover.jpg`);
      } else {
        // Movies & series
        candidates.push(`${rawFolder}a_AL_.jpg`);
        candidates.push(`${rawFolder}a_VL_.jpg`);
        candidates.push(`${rawFolder}000.jpg`);
        candidates.push(`${rawFolder}000.png`);
        candidates.push(`${rawFolder}poster.jpg`);
        candidates.push(`${rawFolder}cover.jpg`);
      }
    }
  }

  return candidates;
}

/**
 * Cleans up noisy filenames for clean UI display.
 */
export function formatMediaTitle(raw: string): string {
  if (!raw) return 'Untitled Media';
  return raw
    .replace(/^(\d+\.?\s*)/, '')
    .replace(/\.(mkv|mp4|avi|rar|zip|iso|apk|exe)$/i, '')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
