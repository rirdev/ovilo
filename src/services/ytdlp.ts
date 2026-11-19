import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface YtDlpStatus {
  available: boolean;
  version: string;
  path: string;
  ffmpeg_available: boolean;
}

export interface YtDlpMediaInfo {
  id: string;
  title: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  webpage_url?: string;
  description?: string;
}

export interface YtDlpProgressPayload {
  download_id: string;
  percent: number;
  speed: string;
  eta: string;
  total_size: string;
  status: 'downloading' | 'processing' | 'completed' | 'error';
  file_path?: string;
  error?: string;
}

export const checkYtDlpStatus = async (): Promise<YtDlpStatus> => {
  return await invoke<YtDlpStatus>('ytdlp_check_status');
};

export const getYtDlpInfo = async (url: string): Promise<YtDlpMediaInfo> => {
  return await invoke<YtDlpMediaInfo>('ytdlp_get_info', { url });
};

export const startYtDlpDownload = async (
  downloadId: string,
  url: string,
  formatType: string
): Promise<string> => {
  return await invoke<string>('ytdlp_start_download', {
    downloadId,
    url,
    formatType,
  });
};

export const openDownloadsFolder = async (): Promise<void> => {
  return await invoke<void>('ytdlp_open_downloads_folder');
};

export const openDownloadedMedia = async (path: string): Promise<void> => {
  return await invoke<void>('ytdlp_open_media_file', { path });
};

export const listenYtDlpProgress = (
  callback: (payload: YtDlpProgressPayload) => void
) => {
  return listen<YtDlpProgressPayload>('ytdlp_progress', (event) => {
    callback(event.payload);
  });
};
