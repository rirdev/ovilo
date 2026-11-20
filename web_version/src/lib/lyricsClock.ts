/**
 * ArchiveTune-grade Lyrics Playback Clock & Synchronization Engine
 * Ported 1:1 from moe.rukamori.archivetune.viewmodels.LyricsPlaybackClock
 * and moe.rukamori.archivetune.lyrics.LyricsUtils
 */

import { LyricLine } from '../types';

export class LyricsPlaybackClock {
  private previousTimeMs = -1;
  private previousSourceMs = 0;
  private positionMs = 0;
  private previousSpeed = 1.0;
  private wasAdvancing = false;

  // ArchiveTune exact clock constants
  private static readonly MAX_PHASE_ERROR_MS = 32.0;
  private static readonly CORRECTION_TIME_MS = 60.0;

  public reset(positionSec: number): number {
    const pos = Math.max(0, positionSec * 1000);
    this.positionMs = pos;
    this.previousTimeMs = -1;
    this.previousSourceMs = pos;
    this.wasAdvancing = false;
    return positionSec;
  }

  public update(
    sourcePositionSec: number,
    sampleTimeMs: number,
    speed: number = 1.0,
    isAdvancing: boolean = true,
    durationSec: number = 0
  ): number {
    const sourceMs = Math.max(0, sourcePositionSec * 1000);
    const durationMs = durationSec > 0 ? durationSec * 1000 : Number.MAX_SAFE_INTEGER;
    const prevTime = this.previousTimeMs;
    const advancing = isAdvancing && Number.isFinite(speed) && speed > 0;

    if (
      prevTime < 0 ||
      sampleTimeMs <= prevTime ||
      !advancing ||
      !this.wasAdvancing ||
      speed !== this.previousSpeed ||
      sourceMs < this.previousSourceMs
    ) {
      this.positionMs = sourceMs;
    } else {
      const elapsedMs = sampleTimeMs - prevTime;
      const projected = this.positionMs + elapsedMs * speed;
      if (sourceMs !== this.previousSourceMs) {
        const errorMs = sourceMs - projected;
        if (Math.abs(errorMs) > LyricsPlaybackClock.MAX_PHASE_ERROR_MS) {
          this.positionMs = sourceMs;
        } else {
          const correction = errorMs * (1.0 - Math.exp(-elapsedMs / LyricsPlaybackClock.CORRECTION_TIME_MS));
          this.positionMs = Math.max(0, projected + correction);
        }
      } else {
        this.positionMs = projected;
      }
    }

    this.positionMs = Math.min(Math.max(0, this.positionMs), durationMs);
    this.previousTimeMs = sampleTimeMs;
    this.previousSourceMs = sourceMs;
    this.previousSpeed = speed;
    this.wasAdvancing = advancing;

    return this.positionMs / 1000;
  }
}

/**
 * Binary search matching ArchiveTune's exact findCurrentLineIndex
 * with desktop-optimized buffer lead
 */
export const findCurrentLineIndex = (
  lines: LyricLine[],
  timeSec: number,
  leadSec = 0.3
): number => {
  if (!lines || lines.length === 0) return 0;
  const target = timeSec + leadSec;

  let low = 0;
  let high = lines.length - 1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const midTime = lines[mid].time;

    if (midTime <= target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(0, Math.min(lines.length - 1, high));
};
