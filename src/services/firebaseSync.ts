import { FavoriteItem, WatchHistoryItem, MusicTrack } from '../types';
import { AppTheme } from '../context/ThemeContext';

// Web app's cloud configuration constants
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/ovilio-e81b3/databases/(default)/documents';

// Backward compatibility stubs for external imports
export const app = {} as any;
export const db = {} as any;
export const auth = { currentUser: null } as any;

export interface UserProfile {
  name: string;
  username?: string;
  email?: string;
  uid?: string;
  isGuest: boolean;
  avatarSeed?: string;
  avatarUrl?: string;
  bio?: string;
  theme?: AppTheme;
  createdAt: number;
}

export interface CloudUserData {
  name?: string;
  bio?: string;
  favorites?: FavoriteItem[];
  movieFavorites?: FavoriteItem[];
  history?: WatchHistoryItem[];
  watchHistory?: WatchHistoryItem[];
  musicFavorites?: MusicTrack[];
  theme?: AppTheme;
  avatarUrl?: string;
}

const PROFILE_KEY = 'ovilo_user_profile';
const MUSIC_FAVORITES_KEY = 'ovilo_music_favorites';
const ACCOUNTS_KEY = 'ovilo_cloud_accounts';

export interface StoredAccount {
  name: string;
  username: string;
  email: string;
  passwordHash?: string;
  password?: string;
  avatarUrl?: string;
  bio?: string;
  theme?: AppTheme;
  movieFavorites?: FavoriteItem[];
  watchHistory?: WatchHistoryItem[];
  musicFavorites?: MusicTrack[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Secure one-way cryptographic SHA-256 hash with salt
 * Strictly matching the mobile app (ovilo_flutter) implementation
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (!password) return '';
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`ovilo_salt_v1_${password}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('SubtleCrypto unavailable, using fallback hash:', e);
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < password.length; i++) {
    hash ^= password.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
};

export const getAllAccounts = (): Record<string, StoredAccount> => {
  try {
    localStorage.removeItem(ACCOUNTS_KEY);
  } catch {}
  return {};
};

export const saveAccountLocally = (_account: StoredAccount): void => {
  try {
    localStorage.removeItem(ACCOUNTS_KEY);
  } catch {}
};

/**
 * Safe fetch with 6-second timeout to prevent WebKitGTK hangs
 */
const firestoreFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

/**
 * Firestore REST Value and Field Decoders
 */
export const decodeFirestoreValue = (val: any): any => {
  if (!val) return null;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return parseFloat(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue !== undefined) {
    return (val.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if (val.mapValue !== undefined) {
    return decodeFirestoreFields(val.mapValue.fields);
  }
  return null;
};

export const decodeFirestoreFields = (fields: any): Record<string, any> => {
  if (!fields) return {};
  const res: Record<string, any> = {};
  for (const [key, val] of Object.entries<any>(fields)) {
    res[key] = decodeFirestoreValue(val);
  }
  return res;
};

/**
 * Firestore REST Value and Field Encoders
 */
export const encodeFirestoreValue = (val: any): any => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(encodeFirestoreValue),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
};

export const encodeFirestoreFields = (obj: Record<string, any>): { fields: Record<string, any> } => {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = encodeFirestoreValue(v);
    }
  }
  return { fields };
};

/**
 * Direct REST Helpers for Cloud Firestore
 */
const getUserDoc = async (cleanUsername: string): Promise<Record<string, any> | null> => {
  const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(cleanUsername)}`;
  const res = await firestoreFetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore error (HTTP ${res.status})`);
  const data = await res.json();
  return decodeFirestoreFields(data.fields);
};

const getUserDataDoc = async (cleanUsername: string): Promise<Record<string, any> | null> => {
  const url = `${FIRESTORE_BASE}/userData/${encodeURIComponent(cleanUsername)}`;
  const res = await firestoreFetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore error (HTTP ${res.status})`);
  const data = await res.json();
  return decodeFirestoreFields(data.fields);
};

const setUserDoc = async (
  cleanUsername: string,
  fieldsObj: Record<string, any>,
  merge: boolean = true
): Promise<void> => {
  const keys = Object.keys(fieldsObj).filter((k) => fieldsObj[k] !== undefined);
  const maskQuery = merge && keys.length > 0
    ? '?' + keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
    : '';
  const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(cleanUsername)}${maskQuery}`;
  const body = encodeFirestoreFields(fieldsObj);
  const res = await firestoreFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to save user profile (HTTP ${res.status})`);
};

const setUserDataDoc = async (
  cleanUsername: string,
  dataObj: Record<string, any>,
  merge: boolean = true
): Promise<void> => {
  const keys = Object.keys(dataObj).filter((k) => dataObj[k] !== undefined);
  const maskQuery = merge && keys.length > 0
    ? '?' + keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
    : '';
  const url = `${FIRESTORE_BASE}/userData/${encodeURIComponent(cleanUsername)}${maskQuery}`;
  const body = encodeFirestoreFields(dataObj);
  const res = await firestoreFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to save user data (HTTP ${res.status})`);
};

const findUserByEmail = async (email: string): Promise<{ username: string; data: Record<string, any> } | null> => {
  const url = `${FIRESTORE_BASE}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: email },
        },
      },
      limit: 1,
    },
  };
  const res = await firestoreFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const list = await res.json();
  if (Array.isArray(list) && list.length > 0 && list[0].document) {
    const docObj = list[0].document;
    const parts = (docObj.name || '').split('/');
    const username = parts[parts.length - 1];
    return { username, data: decodeFirestoreFields(docObj.fields) };
  }
  return null;
};

/**
 * Load local user profile from localStorage
 */
export const getLocalProfile = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local profile:', e);
    return null;
  }
};

/**
 * Helper to resolve the correct document ID for Cloud Firestore.
 */
export const resolveUserDocId = (identifier?: string): string => {
  const clean = identifier?.trim().toLowerCase();
  if (clean && clean !== 'guest') return clean;
  const profile = getLocalProfile();
  if (profile?.username && profile.username.trim().toLowerCase() !== 'guest') {
    return profile.username.trim().toLowerCase();
  }
  if (profile?.uid && profile.uid !== 'guest') return profile.uid;
  return '';
};

/**
 * Clear local profile session
 */
export const clearLocalProfile = async (): Promise<void> => {
  localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new Event('ovilo_profile_updated'));
};

/**
 * Save user profile and sync directly to Cloud Firestore via REST
 */
export const saveProfile = async (
  profile: UserProfile,
  _password?: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event('ovilo_profile_updated'));

    if (!profile.isGuest && (profile.username || profile.uid)) {
      const docId = resolveUserDocId(profile.username);
      if (!docId) return { success: true };

      try {
        const nowIso = new Date().toISOString();
        const updatePayload: Record<string, any> = {
          name: profile.name,
          username: profile.username || docId,
          avatarUrl: profile.avatarUrl || '',
          bio: profile.bio || '',
          theme: profile.theme || 'classic',
          updatedAt: nowIso,
        };
        if (profile.email) updatePayload.email = profile.email;
        await setUserDoc(docId, updatePayload);
      } catch (cloudErr) {
        console.warn('Cloud profile sync warning:', cloudErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Profile save error:', err);
    return { success: true };
  }
};

export const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,24}$/;

/**
 * Helper to normalize library entries (handles both JSON strings and objects)
 */
const normalizeLibraryItem = (item: any) => {
  if (!item) return null;
  if (typeof item === 'string') {
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  }
  return item;
};

/**
 * Strict Cross-Platform Formatters for 100% parity with Flutter APK mobile app
 */
export const formatTrackForSync = (t: any): string => {
  if (!t) return '';
  if (typeof t === 'string') {
    try {
      t = JSON.parse(t);
    } catch {
      return t;
    }
  }
  const id = String(t.id || t.trackId || `track_${Date.now()}`);
  const videoId = t.videoId || t.video_id || (id.startsWith('yt_') ? id.replace('yt_', '') : null);
  const trackObj = {
    id,
    title: String(t.title || t.name || 'Unknown Track'),
    artist: String(t.artist || t.artistName || 'Unknown Artist'),
    album: String(t.album || t.collectionName || 'Single'),
    duration: Math.round(Number(t.duration) || 180),
    stream_url: String(t.stream_url || t.streamUrl || ''),
    artwork_url: (t.artwork_url || t.artworkUrl || t.thumbnail)
      ? String(t.artwork_url || t.artworkUrl || t.thumbnail)
      : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
    is_local: Boolean(t.is_local || t.isLocal),
    local_file_path: t.local_file_path || t.localFilePath || t.file_path || null,
    lyrics: t.lyrics || null,
    video_id: videoId,
    subtitle_info: String(t.subtitle_info || t.subtitleInfo || t.artist || ''),
  };
  return JSON.stringify(trackObj);
};

export const formatMovieForSync = (m: any): string => {
  if (!m) return '';
  if (typeof m === 'string') {
    try {
      m = JSON.parse(m);
    } catch {
      return m;
    }
  }
  const movieObj = {
    id: typeof m.id === 'number' ? m.id : (parseInt(m.id, 10) || 0),
    title: String(m.title || m.name || 'Untitled'),
    overview: String(m.overview || ''),
    poster_path: m.poster_path || m.posterPath || null,
    backdrop_path: m.backdrop_path || m.backdropPath || null,
    vote_average: Number(m.vote_average ?? m.voteAverage ?? 0),
    release_date: m.release_date || m.first_air_date || m.releaseDate || null,
    media_type: m.media_type || m.mediaType || 'movie',
    popularity: Number(m.popularity || 0),
    genre_ids: Array.isArray(m.genre_ids || m.genreIds) ? (m.genre_ids || m.genreIds).map((g: any) => Number(g)) : [],
  };
  return JSON.stringify(movieObj);
};

export const formatHistoryForSync = (h: any): string => {
  if (!h) return '';
  if (typeof h === 'string') return h;
  return JSON.stringify(h);
};

/**
 * Create a new user account directly on Cloud Firestore with SHA-256 salted credentials
 */
export const signUpUser = async ({
  name,
  username,
  email,
  password,
  theme,
}: {
  name: string;
  username: string;
  email?: string;
  password?: string;
  theme?: AppTheme;
}): Promise<{ success: boolean; message?: string; profile?: UserProfile }> => {
  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanName = name.trim() || cleanUsername;

  if (!USERNAME_REGEX.test(cleanUsername)) {
    return {
      success: false,
      message: 'Username must be 3-24 characters and only contain letters, numbers, dots, and hyphens (no slashes).',
    };
  }

  const cleanPass = (password || '').trim();
  if (cleanPass.length < 6) {
    return {
      success: false,
      message: 'Password must be at least 6 characters long.',
    };
  }

  try {
    // 1. Check if username already exists in Firestore
    const existing = await getUserDoc(cleanUsername);
    if (existing) {
      return {
        success: false,
        message: `Username "@${cleanUsername}" is already taken. Please choose another.`,
      };
    }

    // 2. Hash password with secure salt
    const passHash = await hashPassword(cleanPass);
    const nowIso = new Date().toISOString();

    // 3. Write user profile doc to Firestore
    await setUserDoc(cleanUsername, {
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: passHash,
      avatarUrl: '',
      bio: 'Media Enthusiast',
      theme: theme || 'classic',
      createdAt: nowIso,
      updatedAt: nowIso,
    }, false);

    // 4. Initialize empty user library data in Firestore
    await setUserDataDoc(cleanUsername, {
      movieFavorites: [],
      watchHistory: [],
      musicFavorites: [],
      theme: theme || 'classic',
      avatarUrl: '',
      updatedAt: nowIso,
    }, false);

    const newProfile: UserProfile = {
      uid: cleanUsername,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      isGuest: false,
      theme: theme || 'classic',
      createdAt: Date.now(),
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    window.dispatchEvent(new Event('ovilo_profile_updated'));

    return { success: true, profile: newProfile };
  } catch (err: any) {
    console.error('Sign up error:', err);
    return {
      success: false,
      message: err?.name === 'AbortError' || err?.message?.includes('aborted')
        ? 'Connection timed out. Please check your internet.'
        : (err?.message || 'Failed to create account. Please try again.'),
    };
  }
};

/**
 * Sign In an existing user from Cloud Firestore
 * Supports username or email with SHA-256 salted hash verification
 */
export const signInUser = async (
  usernameOrEmail: string,
  passwordInput?: string
): Promise<{
  success: boolean;
  message?: string;
  profile?: UserProfile;
  data?: CloudUserData;
}> => {
  const identifier = usernameOrEmail.trim().toLowerCase();
  if (!identifier) {
    return { success: false, message: 'Please enter your username or email address.' };
  }

  if (identifier.includes('/')) {
    return { success: false, message: 'Invalid username format. Slashes are not allowed.' };
  }

  const cleanPass = (passwordInput || '').trim();
  if (!cleanPass) {
    return { success: false, message: 'Please enter your password.' };
  }

  try {
    let userDocData: Record<string, any> | null = null;
    let resolvedUsername = identifier;

    // 1. Fetch user doc by username or search by email
    if (!identifier.includes('@')) {
      userDocData = await getUserDoc(identifier);
    } else {
      const searchRes = await findUserByEmail(identifier);
      if (searchRes) {
        userDocData = searchRes.data;
        resolvedUsername = searchRes.username;
      }
    }

    if (!userDocData) {
      return {
        success: false,
        message: 'Account not found. Please verify your username or sign up.',
      };
    }

    // 2. Verify password hash
    const inputHash = await hashPassword(cleanPass);
    const remoteHash = userDocData.passwordHash || userDocData.password || '';

    const isPasswordValid = remoteHash
      ? (remoteHash === inputHash || remoteHash === cleanPass)
      : true;

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Incorrect password. Please try again.',
      };
    }

    // 3. Fetch library data from Firestore
    const cloudData = await fetchCloudData(resolvedUsername);

    if (cloudData) {
      if (Array.isArray(cloudData.musicFavorites)) {
        saveLocalMusicFavorites(cloudData.musicFavorites);
        window.dispatchEvent(new Event('ovilo_music_favorites_updated'));
      }
      if (Array.isArray(cloudData.movieFavorites)) {
        try {
          localStorage.setItem('ovilo_favorites', JSON.stringify(cloudData.movieFavorites));
        } catch {}
      }
      if (Array.isArray(cloudData.watchHistory)) {
        try {
          localStorage.setItem('ovilo_watch_history', JSON.stringify(cloudData.watchHistory));
        } catch {}
      }
    }

    const profile: UserProfile = {
      uid: resolvedUsername,
      name: userDocData.name || resolvedUsername,
      username: resolvedUsername,
      email: userDocData.email || (identifier.includes('@') ? identifier : ''),
      avatarUrl: userDocData.avatarUrl || cloudData?.avatarUrl || '',
      bio: userDocData.bio || '',
      theme: userDocData.theme || cloudData?.theme || 'classic',
      isGuest: false,
      createdAt: userDocData.createdAt ? new Date(userDocData.createdAt).getTime() : Date.now(),
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event('ovilo_profile_updated'));

    return { success: true, profile, data: cloudData || undefined };
  } catch (err: any) {
    console.error('Sign in error:', err);
    return {
      success: false,
      message: err?.name === 'AbortError' || err?.message?.includes('aborted')
        ? 'Connection timed out. Please check your internet.'
        : (err?.message || 'Failed to authenticate. Please check your credentials.'),
    };
  }
};

/**
 * Sync all user data directly to Cloud Firestore via REST
 */
export const syncToCloud = async (
  username: string,
  data: Partial<CloudUserData>
): Promise<void> => {
  const docId = resolveUserDocId(username);
  if (!docId) return;

  try {
    const nowIso = new Date().toISOString();
    const payload: Record<string, any> = {
      ...data,
      updatedAt: nowIso,
    };

    // Strict Cross-Platform Parity with Flutter Mobile APK
    if (Array.isArray(payload.musicFavorites)) {
      payload.musicFavorites = payload.musicFavorites.map(formatTrackForSync).filter(Boolean);
    }
    if (Array.isArray(payload.movieFavorites)) {
      payload.movieFavorites = payload.movieFavorites.map(formatMovieForSync).filter(Boolean);
    }
    if (Array.isArray(payload.favorites)) {
      payload.movieFavorites = payload.favorites.map(formatMovieForSync).filter(Boolean);
      delete payload.favorites;
    }
    if (Array.isArray(payload.watchHistory)) {
      payload.watchHistory = payload.watchHistory.map(formatHistoryForSync).filter(Boolean);
    }
    if (Array.isArray(payload.history)) {
      payload.watchHistory = payload.history.map(formatHistoryForSync).filter(Boolean);
      delete payload.history;
    }

    // Sync to both userData/{username} and users/{username} to guarantee cross-client parity with APK, web & desktop
    await Promise.allSettled([
      setUserDataDoc(docId, payload),
      setUserDoc(docId, payload),
    ]);
  } catch (err) {
    console.warn('Cloud data sync error:', err);
  }
};

/**
 * Fetch user library and preferences directly from Cloud Firestore via REST
 */
export const fetchCloudData = async (
  username: string
): Promise<CloudUserData | null> => {
  const docId = resolveUserDocId(username);
  if (!docId) return null;
  try {
    const [rawData, userDoc] = await Promise.all([
      getUserDataDoc(docId).catch(() => null),
      getUserDoc(docId).catch(() => null),
    ]);
    if (!rawData && !userDoc) return null;

    const rawFavs = rawData?.movieFavorites || rawData?.favorites || userDoc?.movieFavorites || [];
    const rawHist = rawData?.watchHistory || rawData?.history || userDoc?.watchHistory || [];
    const rawMusic = rawData?.musicFavorites || userDoc?.musicFavorites || [];

    const favs = Array.isArray(rawFavs) ? rawFavs.map(normalizeLibraryItem).filter(Boolean) : [];
    const hist = Array.isArray(rawHist) ? rawHist.map(normalizeLibraryItem).filter(Boolean) : [];
    const music = Array.isArray(rawMusic) ? rawMusic.map(normalizeLibraryItem).filter(Boolean) : [];

    const resolvedAvatar = userDoc?.avatarUrl || rawData?.avatarUrl || '';

    return {
      name: userDoc?.name || rawData?.name,
      bio: userDoc?.bio || rawData?.bio,
      favorites: favs,
      movieFavorites: favs,
      history: hist,
      watchHistory: hist,
      musicFavorites: music,
      theme: userDoc?.theme || rawData?.theme,
      avatarUrl: resolvedAvatar,
    };
  } catch (err) {
    console.warn('Cloud fetch error:', err);
    return null;
  }
};

/**
 * Listen for cloud changes using lightweight interval polling
 */
export const listenToCloudChanges = (
  username: string,
  callback: (data: CloudUserData) => void
): (() => void) => {
  const docId = resolveUserDocId(username);
  if (!docId) return () => {};

  const poll = async () => {
    try {
      if (document.hidden) return;
      const data = await fetchCloudData(docId);
      if (data) callback(data);
    } catch {}
  };

  const timer = setInterval(poll, 30000);
  return () => clearInterval(timer);
};

/**
 * Helper to get local music favorites
 */
export const getLocalMusicFavorites = (): MusicTrack[] => {
  try {
    const raw = localStorage.getItem(MUSIC_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item) return null;
        let obj = item;
        if (typeof item === 'string') {
          try {
            obj = JSON.parse(item);
          } catch {
            return null;
          }
        }
        if (typeof obj !== 'object' || obj === null) return null;
        const title = String(obj.title || obj.name || '').trim();
        if (!title) return null;
        const artist = String(obj.artist || obj.artistName || 'Unknown Artist').trim();
        const id = String(obj.id || obj.trackId || `fav_${title.replace(/\s+/g, '_')}`);
        const stream_url = String(obj.stream_url || obj.streamUrl || '');
        const artwork_url = String(
          obj.artwork_url ||
            obj.artworkUrl ||
            obj.cover ||
            obj.thumbnail ||
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'
        );
        const duration = Math.round(Number(obj.duration) || 210);
        return {
          ...obj,
          id,
          title,
          artist,
          stream_url,
          artwork_url,
          duration,
        } as MusicTrack;
      })
      .filter((t): t is MusicTrack => Boolean(t && t.title));
  } catch {
    return [];
  }
};

/**
 * Helper to save local music favorites
 */
export const saveLocalMusicFavorites = (tracks: MusicTrack[]): void => {
  try {
    if (!Array.isArray(tracks)) return;
    const sanitized: MusicTrack[] = tracks
      .map((item) => {
        if (!item) return null;
        let obj = item;
        if (typeof item === 'string') {
          try {
            obj = JSON.parse(item);
          } catch {
            return null;
          }
        }
        if (typeof obj !== 'object' || obj === null) return null;
        const title = String(obj.title || (obj as any).name || '').trim();
        if (!title) return null;
        const artist = String(obj.artist || (obj as any).artistName || 'Unknown Artist').trim();
        const id = String(obj.id || (obj as any).trackId || `fav_${title.replace(/\s+/g, '_')}`);
        const stream_url = String(obj.stream_url || (obj as any).streamUrl || '');
        const artwork_url = String(
          obj.artwork_url ||
            (obj as any).artworkUrl ||
            (obj as any).cover ||
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'
        );
        const duration = Math.round(Number(obj.duration) || 210);
        return {
          ...obj,
          id,
          title,
          artist,
          stream_url,
          artwork_url,
          duration,
        } as MusicTrack;
      })
      .filter((t): t is MusicTrack => Boolean(t && t.title));

    localStorage.setItem(MUSIC_FAVORITES_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent('ovilo_music_favorites_updated'));
  } catch (err) {
    console.error('Failed to save music favorites locally:', err);
  }
};
