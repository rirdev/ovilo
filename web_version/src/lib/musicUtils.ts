import { MusicTrack } from '../types';

/**
 * Normalizes music strings (titles, artists) for robust cross-source comparison.
 * Removes bracketed metadata e.g. "(prod. by ...)", "[Official Video]", "(feat. ...)",
 * strips punctuation/symbols via Unicode property classes, and folds whitespace.
 */
export function normalizeMusicStr(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    // Strip parenthetical/bracketed metadata: (prod. ...), [Official Video], (feat. ...), (audio), etc.
    .replace(/\s*(\[[^\]]*\]|\([^\)]*\))\s*/gu, ' ')
    // Strip common YouTube/audio tag words
    .replace(/\b(official\s+video|official\s+music\s+video|official\s+audio|lyrics?|remix|hd|4k|audio|feat\.?|ft\.?|prod\.?)\b/giu, ' ')
    // Strip punctuation, dashes, symbols while preserving unicode letters and digits
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether two tracks refer to the same song across iTunes, YouTube, and local storage.
 */
export function isSameTrack(a?: MusicTrack | null, b?: MusicTrack | null): boolean {
  if (!a || !b) return false;

  // 1. Direct ID match
  if (a.id && b.id && a.id === b.id) return true;

  // 2. Direct file path match
  if (a.file_path && b.file_path && a.file_path === b.file_path) return true;

  const titleA = normalizeMusicStr(a.title);
  const titleB = normalizeMusicStr(b.title);
  if (!titleA || !titleB) return false;

  const artistA = normalizeMusicStr(a.artist);
  const artistB = normalizeMusicStr(b.artist);

  const isGeneric = (art: string) =>
    !art || art === 'unknown' || art === 'unknown artist' || art === 'various' || art === 'various artists';

  // Exact normalized title match
  if (titleA === titleB) {
    if (isGeneric(artistA) || isGeneric(artistB)) return true;
    if (
      artistA === artistB ||
      artistA.includes(artistB) ||
      artistB.includes(artistA) ||
      titleA.includes(artistB) ||
      titleB.includes(artistA)
    ) {
      return true;
    }
  }

  // Cross-containment: e.g. "Syko - BrooklynBloodPop" contains "BrooklynBloodPop"
  const titleContained = titleA.includes(titleB) || titleB.includes(titleA);
  if (titleContained) {
    if (isGeneric(artistA) || isGeneric(artistB)) return true;
    if (
      artistA === artistB ||
      artistA.includes(artistB) ||
      artistB.includes(artistA) ||
      titleA.includes(artistB) ||
      titleB.includes(artistA)
    ) {
      return true;
    }
  }

  // Check if title has "Artist - Track" or "Track - Artist"
  if (artistA && titleB.includes(artistA) && (titleB.includes(titleA) || titleA.includes(titleB))) {
    return true;
  }
  if (artistB && titleA.includes(artistB) && (titleA.includes(titleB) || titleB.includes(titleA))) {
    return true;
  }

  return false;
}

/**
 * Checks if a track exists in a given list of tracks.
 */
export function isTrackInList(track: MusicTrack, list: MusicTrack[]): boolean {
  if (!track || !list || list.length === 0) return false;
  return list.some((item) => isSameTrack(item, track));
}

/**
 * Resolves the optimal download URL for a track (direct YouTube URL or high-accuracy ytsearch).
 */
export function getMusicDownloadUrl(t: MusicTrack): string {
  if (t.id && t.id.startsWith('yt_')) {
    const vid = t.id.replace('yt_', '');
    return `https://www.youtube.com/watch?v=${vid}`;
  }
  if (t.stream_url && (t.stream_url.includes('youtube.com') || t.stream_url.includes('youtu.be'))) {
    return t.stream_url;
  }
  const query = `${t.artist} - ${t.title}`.trim();
  return `ytsearch1:${query} audio`;
}
