import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { YtDlpProgressPayload } from './ytdlp';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  uploader?: string;
  thumbnail?: string;
  formatType: string;
  formatLabel: string;
  progress: number;
  speed: string;
  eta: string;
  totalSize: string;
  status: 'fetching' | 'downloading' | 'processing' | 'completed' | 'error';
  filePath?: string;
  errorMessage?: string;
  createdAt: number;
}

const STORAGE_KEY = 'ovilo_ytdlp_history';
const EVENT_NAME = 'ovilo_downloads_sync';

let memoryDownloads: DownloadItem[] = [];
let initialized = false;
let unlistenProgress: UnlistenFn | null = null;

function loadFromStorage(): DownloadItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse download history from localStorage:', err);
  }
  return [];
}

function saveToStorage(items: DownloadItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 60)));
  } catch (err) {
    console.error('Failed to save downloads to localStorage:', err);
  }
}

function notifyUpdate() {
  saveToStorage(memoryDownloads);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    window.dispatchEvent(new CustomEvent('ovilo_download_update'));
  }
}

export function initDownloadManager() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  memoryDownloads = loadFromStorage();

  listen<YtDlpProgressPayload>('ytdlp_progress', (event) => {
    const payload = event.payload;
    let found = false;

    memoryDownloads = memoryDownloads.map((item) => {
      if (item.id === payload.download_id) {
        found = true;
        return {
          ...item,
          progress: Math.min(100, Math.max(0, payload.percent || item.progress)),
          speed: payload.speed || item.speed,
          eta: payload.eta || item.eta,
          totalSize: payload.total_size || item.totalSize,
          status: payload.status as any,
          filePath: payload.file_path || item.filePath,
          errorMessage: payload.error || item.errorMessage,
        };
      }
      return item;
    });

    if (found) {
      notifyUpdate();
    }
  }).then((unlisten) => {
    unlistenProgress = unlisten;
  });
}

export function destroyDownloadManager() {
  if (unlistenProgress) {
    unlistenProgress();
    unlistenProgress = null;
    initialized = false;
  }
}

export async function startDownload(params: {
  url: string;
  title: string;
  formatType?: string;
  formatLabel?: string;
  thumbnail?: string;
  uploader?: string;
}): Promise<string> {
  initDownloadManager();

  // Guard against starting concurrent duplicate downloads of the exact same URL
  const existingActive = memoryDownloads.find(
    (d) => d.url === params.url && (d.status === 'downloading' || d.status === 'fetching' || d.status === 'processing')
  );
  if (existingActive) {
    console.warn('Download already in progress for URL:', params.url);
    return existingActive.id;
  }

  const id = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const formatType = params.formatType || 'best';
  const formatLabel = params.formatLabel || (formatType.includes('audio') ? 'Audio' : 'Direct Media');

  const newItem: DownloadItem = {
    id,
    url: params.url,
    title: params.title,
    uploader: params.uploader,
    thumbnail: params.thumbnail,
    formatType,
    formatLabel,
    progress: 0,
    speed: 'Connecting...',
    eta: '--',
    totalSize: '--',
    status: 'downloading',
    createdAt: Date.now(),
  };

  memoryDownloads = [newItem, ...memoryDownloads.filter((d) => d.id !== id)];
  notifyUpdate();

  try {
    await invoke<string>('ytdlp_start_download', {
      downloadId: id,
      url: params.url,
      formatType,
    });
  } catch (err: any) {
    console.error('Failed to trigger download process:', err);
    memoryDownloads = memoryDownloads.map((d) =>
      d.id === id ? { ...d, status: 'error', errorMessage: String(err) } : d
    );
    notifyUpdate();
    throw err;
  }

  return id;
}

export async function downloadMusicTrack(params: {
  title: string;
  artist: string;
  streamUrl?: string;
  videoId?: string;
  thumbnail?: string;
}): Promise<string> {
  initDownloadManager();

  const id = `dl_music_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const title = `${params.title} - ${params.artist}`;

  const newItem: DownloadItem = {
    id,
    url: params.streamUrl || `music:${params.title}`,
    title,
    uploader: params.artist,
    thumbnail: params.thumbnail,
    formatType: 'audio_m4a',
    formatLabel: 'Direct Audio Stream',
    progress: 0,
    speed: 'Connecting...',
    eta: '--',
    totalSize: '--',
    status: 'downloading',
    createdAt: Date.now(),
  };

  memoryDownloads = [newItem, ...memoryDownloads.filter((d) => d.id !== id)];
  notifyUpdate();

  try {
    await invoke<string>('download_music_track', {
      downloadId: id,
      title: params.title,
      artist: params.artist,
      streamUrl: params.streamUrl || null,
      videoId: params.videoId || null,
    });
  } catch (err: any) {
    console.error('Failed to trigger music download:', err);
    memoryDownloads = memoryDownloads.map((d) =>
      d.id === id ? { ...d, status: 'error', errorMessage: String(err) } : d
    );
    notifyUpdate();
    throw err;
  }

  return id;
}

export function parseSizeToBytes(sizeStr?: string): number | null {
  if (!sizeStr || sizeStr === 'NA' || sizeStr === '--' || sizeStr === 'Starting') return null;
  const match = sizeStr.trim().match(/^([0-9.]+)\s*([a-zA-Z]+)$/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (isNaN(val)) return null;
  const unit = match[2].toLowerCase();
  if (unit.startsWith('k')) return val * 1024;
  if (unit.startsWith('m')) return val * 1024 * 1024;
  if (unit.startsWith('g')) return val * 1024 * 1024 * 1024;
  if (unit.startsWith('t')) return val * 1024 * 1024 * 1024 * 1024;
  if (unit.startsWith('b')) return val;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface FormattedProgress {
  percent: number;
  percentStr: string;
  speed: string;
  downloadedStr: string;
  totalStr: string;
  remainingStr: string;
  etaStr: string;
}

export function computeProgressMetrics(
  percent: number,
  speedStr?: string,
  totalSizeStr?: string,
  etaStr?: string
): FormattedProgress {
  const safePercent = Math.max(0, Math.min(100, isNaN(percent) ? 0 : percent));
  const totalBytes = parseSizeToBytes(totalSizeStr);

  let downloadedStr = '';
  let totalStr = totalSizeStr && totalSizeStr !== '--' && totalSizeStr !== 'NA' && totalSizeStr !== 'Starting'
    ? totalSizeStr
    : '';
  let remainingStr = '';

  if (totalBytes && totalBytes > 0) {
    const downloadedBytes = (safePercent / 100) * totalBytes;
    const remainingBytes = Math.max(0, totalBytes - downloadedBytes);
    downloadedStr = formatBytes(downloadedBytes);
    totalStr = formatBytes(totalBytes);
    remainingStr = formatBytes(remainingBytes);
  }

  // Format speed cleanly
  let cleanSpeed = speedStr && speedStr !== '--' && speedStr !== 'Connecting...' ? speedStr : '';
  if (cleanSpeed && !cleanSpeed.startsWith('↓')) {
    cleanSpeed = `↓ ${cleanSpeed}`;
  }

  // Format ETA cleanly
  let cleanEta = etaStr && etaStr !== '--' && etaStr !== '--:--' && etaStr !== '00:00' ? etaStr : '';
  if (cleanEta) {
    // If format is like 01:25 or 00:45
    cleanEta = cleanEta.replace(/^00:/, '');
  }

  return {
    percent: safePercent,
    percentStr: `${safePercent.toFixed(1)}%`,
    speed: cleanSpeed,
    downloadedStr,
    totalStr,
    remainingStr,
    etaStr: cleanEta,
  };
}

export function removeDownload(id: string) {
  memoryDownloads = memoryDownloads.filter((d) => d.id !== id);
  notifyUpdate();
}

export function clearDownloadsHistory() {
  memoryDownloads = memoryDownloads.filter((d) => d.status === 'downloading' || d.status === 'fetching');
  notifyUpdate();
}

export interface DiskFileItem {
  name: string;
  path: string;
  size_bytes: number;
  size_str: string;
  extension: string;
  modified_timestamp: number;
  thumbnail_url?: string;
}

export async function getDiskDownloads(): Promise<DiskFileItem[]> {
  try {
    return await invoke<DiskFileItem[]>('get_disk_downloads');
  } catch (err) {
    console.warn('Failed to get disk downloads:', err);
    return [];
  }
}

export async function deleteDiskDownload(path: string): Promise<void> {
  try {
    await invoke<void>('delete_disk_download', { path });
    // Also remove from in-memory history if present
    const baseName = path.split('/').pop()?.split('\\').pop() || path;
    const fileStem = baseName.replace(/\.[^/.]+$/, '');
    memoryDownloads = memoryDownloads.filter(
      (d) => !d.filePath?.includes(baseName) && !d.title?.includes(fileStem)
    );
    notifyUpdate();
  } catch (err) {
    console.warn('Failed to delete file from disk:', err);
    throw err;
  }
}

export async function openDownloadsFolder(): Promise<void> {
  return await invoke<void>('ytdlp_open_downloads_folder');
}

export async function openDownloadedMedia(path: string): Promise<void> {
  return await invoke<void>('ytdlp_open_media_file', { path });
}

export function getDownloads(): DownloadItem[] {
  if (!initialized) initDownloadManager();
  return memoryDownloads;
}

export function useDownloadManager() {
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => {
    initDownloadManager();
    return memoryDownloads;
  });

  useEffect(() => {
    initDownloadManager();
    setDownloads([...memoryDownloads]);

    const handler = () => {
      setDownloads([...memoryDownloads]);
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }, []);

  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'fetching' || d.status === 'processing'
  );

  return {
    downloads,
    activeDownloads,
    activeCount: activeDownloads.length,
    startDownload,
    removeDownload,
    clearHistory: clearDownloadsHistory,
    openFolder: openDownloadsFolder,
    openMedia: openDownloadedMedia,
  };
}
