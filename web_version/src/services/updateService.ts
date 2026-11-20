import { decodeFirestoreFields } from './firebaseSync';

export const APP_CURRENT_VERSION = '0.1.0';

export interface AppUpdateData {
  version: string;
  title: string;
  downloadUrl: string;
  linuxDebUrl?: string;
  linuxAppImageUrl?: string;
  windowsUrl?: string;
  notes?: string;
  isMandatory?: boolean;
  releaseDate?: string;
  publishedAt?: any;
  isActive?: boolean;
}

const DISMISSED_UPDATE_KEY = 'ovilo_dismissed_update_version';
const UPDATE_DOC_URL = 'https://firestore.googleapis.com/v1/projects/ovilio-e81b3/databases/(default)/documents/system_updates/latest';

/**
 * Robust semantic version comparison
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check if the remote update is strictly newer than local app version
 * AND is actively enabled with a valid download URL.
 */
export function isUpdateAvailable(remoteVersion: string, updateData?: AppUpdateData | null): boolean {
  if (!remoteVersion) return false;
  if (updateData) {
    if (updateData.isActive === false) return false;
    if (!updateData.downloadUrl || !updateData.downloadUrl.trim()) return false;
  }
  return compareSemver(remoteVersion, APP_CURRENT_VERSION) > 0;
}

/**
 * Check if the user chose "Remind me later" for this specific version in this session
 */
export function isUpdateDismissed(version: string): boolean {
  try {
    const dismissed = sessionStorage.getItem(DISMISSED_UPDATE_KEY);
    return dismissed === version;
  } catch {
    return false;
  }
}

/**
 * Mark a version as dismissed for the current app session
 */
export function dismissUpdateForSession(version: string): void {
  try {
    sessionStorage.setItem(DISMISSED_UPDATE_KEY, version);
  } catch (err) {
    console.warn('Failed to save dismissed update state:', err);
  }
}

/**
 * Clear dismissed state (e.g. when checking manually in Settings)
 */
export function clearDismissedUpdate(): void {
  try {
    sessionStorage.removeItem(DISMISSED_UPDATE_KEY);
  } catch {}
}

/**
 * Open external download URL in browser or default handler
 */
export async function openDownloadLink(url: string): Promise<void> {
  if (!url) return;
  try {
    const opener = await import('@tauri-apps/plugin-opener');
    if (opener && typeof opener.openUrl === 'function') {
      await opener.openUrl(url);
      return;
    }
  } catch (tauriErr) {
    console.warn('Tauri opener unavailable, falling back to window.open:', tauriErr);
  }

  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (winErr) {
    console.error('Failed to open URL in browser:', winErr);
  }
}

async function fetchLatestUpdateDoc(): Promise<AppUpdateData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(UPDATE_DOC_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.status === 404 || !res.ok) return null;
    const json = await res.json();
    if (!json.fields) return null;
    return decodeFirestoreFields(json.fields) as AppUpdateData;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Listen for real-time update notifications from Cloud Firestore
 */
export function subscribeToAppUpdates(
  callback: (update: AppUpdateData | null, isNewer: boolean) => void
): () => void {
  const check = async () => {
    try {
      if (document.hidden) return;
      const data = await fetchLatestUpdateDoc();
      if (!data) {
        callback(null, false);
        return;
      }
      const newer = isUpdateAvailable(data.version, data);
      callback(newer ? data : null, newer);
    } catch {}
  };

  // Immediate check on boot
  check();

  // Periodic poll every 5 minutes
  const timer = setInterval(check, 300000);
  return () => clearInterval(timer);
}

/**
 * Perform manual one-time check for updates (used in Settings)
 */
export async function checkAppUpdatesManual(): Promise<{
  update: AppUpdateData | null;
  isNewer: boolean;
  currentVersion: string;
}> {
  try {
    const data = await fetchLatestUpdateDoc();
    if (!data) {
      return { update: null, isNewer: false, currentVersion: APP_CURRENT_VERSION };
    }
    const newer = isUpdateAvailable(data.version, data);
    return {
      update: newer ? data : null,
      isNewer: newer,
      currentVersion: APP_CURRENT_VERSION,
    };
  } catch (err) {
    console.error('Failed to manually check for updates:', err);
    return { update: null, isNewer: false, currentVersion: APP_CURRENT_VERSION };
  }
}
