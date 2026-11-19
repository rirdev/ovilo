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

export async function fetchBdixData(params: {
  q?: string;
  category?: string;
  extension?: string;
  source?: 'all' | 'server1' | 'server2';
  page?: number;
  limit?: number;
}): Promise<BdixResponse> {
  const queryParams = new URLSearchParams();

  if (params.q && params.q.trim()) {
    queryParams.set('q', params.q.trim());
  }

  if (params.category && params.category !== 'all') {
    queryParams.set('category', params.category);
  }

  if (params.extension && params.extension !== 'all') {
    queryParams.set('extension', params.extension);
  }

  if (params.source && params.source !== 'all') {
    queryParams.set('source', params.source);
  }

  queryParams.set('page', String(params.page || 1));
  queryParams.set('limit', String(params.limit || 24));

  const url = `${API_BASE}?${queryParams.toString()}`;

  // Invoke native Rust reqwest client to bypass webview CORS restrictions
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
