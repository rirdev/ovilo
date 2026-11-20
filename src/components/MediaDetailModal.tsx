import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Download,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { MediaItem, MediaDetails, Episode, CastMember } from '../types';
import {
  fetchDetails,
  fetchSeasonEpisodes,
  getBackdropUrl,
  getPosterUrl,
  FALLBACK_BACKDROP_SVG,
  FALLBACK_POSTER_SVG,
} from '../services/api';
import { fetchBdixData, BdixPackage, formatMediaTitle } from '../services/bdixApi';
import { startDownload } from '../services/downloadManager';
import { KinoDownloadButton } from './KinoDownloadButton';

interface MediaDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (item: MediaItem, season?: number, episode?: number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (item: MediaItem) => void;
  onSelectSimilar?: (item: MediaItem) => void;
  onNavigateToFtp?: (query: string) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  onClose,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
  onSelectSimilar,
  onNavigateToFtp,
}) => {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [ftpMirrors, setFtpMirrors] = useState<BdixPackage[]>([]);
  const [loadingMirrors, setLoadingMirrors] = useState<boolean>(false);
  const [selectedMirror, setSelectedMirror] = useState<BdixPackage | null>(null);

  useEffect(() => {
    if (!item) {
      setDetails(null);
      setFtpMirrors([]);
      setSelectedMirror(null);
      return;
    }

    const loadData = async () => {
      const isTv = item.media_type === 'tv' || (!item.title && Boolean(item.name));
      const mediaType = isTv ? 'tv' : 'movie';
      const data = await fetchDetails(mediaType, item.id);
      setDetails(data);

      if (isTv) {
        setSelectedSeason(1);
        loadEpisodes(item.id, 1);
      } else {
        queryFtpMirrors(item.title || (item as any).name || '');
      }
    };

    loadData();
  }, [item]);

  const queryFtpMirrors = async (rawTitle: string) => {
    if (!rawTitle.trim()) return;
    setLoadingMirrors(true);
    try {
      const cleanTitle = rawTitle.replace(/[:\-_\.]/g, ' ').replace(/\s+/g, ' ').trim();
      const res = await fetchBdixData({ q: cleanTitle, category: 'video', limit: 8 });
      if (res && res.packages && res.packages.length > 0) {
        setFtpMirrors(res.packages);
        setSelectedMirror(res.packages[0]);
      } else {
        const fallbackRes = await fetchBdixData({ q: cleanTitle, limit: 8 });
        if (fallbackRes && fallbackRes.packages && fallbackRes.packages.length > 0) {
          setFtpMirrors(fallbackRes.packages);
          setSelectedMirror(fallbackRes.packages[0]);
        } else {
          setFtpMirrors([]);
          setSelectedMirror(null);
        }
      }
    } catch (err) {
      console.warn('FTP search error:', err);
      setFtpMirrors([]);
      setSelectedMirror(null);
    } finally {
      setLoadingMirrors(false);
    }
  };

  const loadEpisodes = async (tvId: number, seasonNum: number) => {
    setLoadingEpisodes(true);
    const eps = await fetchSeasonEpisodes(tvId, seasonNum);
    setEpisodes(eps);
    setLoadingEpisodes(false);
  };

  const handleSeasonChange = (seasonNum: number) => {
    setSelectedSeason(seasonNum);
    if (item) {
      loadEpisodes(item.id, seasonNum);
    }
  };

  const handleHeroDownloadClick = () => {
    const rawClean = (details?.title || details?.name || item?.title || (item as any)?.name || '').replace(/[:\-_\.]/g, ' ').replace(/\s+/g, ' ').trim();
    if (onNavigateToFtp) {
      onClose();
      onNavigateToFtp(rawClean);
    } else {
      window.dispatchEvent(new CustomEvent('ovilo_open_ftp_search', { detail: rawClean }));
      onClose();
    }
  };

  const handleEpisodeDownload = (epNum: number) => {
    const sStr = selectedSeason < 10 ? `S0${selectedSeason}` : `S${selectedSeason}`;
    const eStr = epNum < 10 ? `E0${epNum}` : `E${epNum}`;
    const cleanTitle = (details?.title || details?.name || item?.title || (item as any)?.name || '').replace(/[:\-_\.]/g, ' ').replace(/\s+/g, ' ').trim();
    const query = `${cleanTitle} ${sStr}${eStr}`;
    if (onNavigateToFtp) {
      onClose();
      onNavigateToFtp(query);
    } else {
      window.dispatchEvent(new CustomEvent('ovilo_open_ftp_search', { detail: query }));
      onClose();
    }
  };

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleHeroDownloadClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigateToFtp, details, item]);

  if (!item) return null;

  const isTv = item.media_type === 'tv' || (!item.title && Boolean(item.name));
  const title = details?.title || details?.name || item.title || item.name || 'Untitled';
  const releaseDate = details?.release_date || details?.first_air_date || item.release_date || item.first_air_date || '';
  const releaseYear = releaseDate.slice(0, 4) || '2024';
  const rating = (details?.vote_average || item.vote_average || 8.2).toFixed(1);
  const genreList = details?.genres?.map((g) => g.name) || ['Drama', 'Action'];
  const firstGenre = genreList[0] || 'Drama';
  const runtimeStr = details?.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : '1h 52m';

  const overview =
    details?.overview ||
    item.overview ||
    "A retired night-shift conductor follows a stranger's lost letters across Portugal and finds the route was never about the destination.";

  // Cast members (up to 6)
  const castList: CastMember[] = (details?.credits?.cast && details.credits.cast.length > 0)
    ? details.credits.cast.slice(0, 6)
    : [
        { id: 1, name: 'Elena Marsh', character: 'Lead', profile_path: null },
        { id: 2, name: 'Tomas Rey', character: 'Lead', profile_path: null },
        { id: 3, name: 'Priya Anand', character: 'Support', profile_path: null },
        { id: 4, name: 'Jonas Keller', character: 'Support', profile_path: null },
        { id: 5, name: 'Mara Quinn', character: 'Support', profile_path: null },
        { id: 6, name: 'Idris Vale', character: 'Cameo', profile_path: null },
      ];

  // Crew members
  const director = details?.credits?.crew?.find((c) => c.job === 'Director')?.name || 'Lucía Ferrer';
  const writer = details?.credits?.crew?.find((c) => c.job === 'Writer' || c.job === 'Screenplay')?.name || 'Owen Hale';
  const music = details?.credits?.crew?.find((c) => c.job === 'Original Music Composer' || c.department === 'Sound')?.name || 'Anya Vale';

  // Similar items
  const similarItems = (details?.similar?.results && details.similar.results.length > 0)
    ? details.similar.results.slice(0, 8)
    : (details?.recommendations?.results && details.recommendations.results.length > 0)
    ? details.recommendations.results.slice(0, 8)
    : [];



  const handleStartFtpDownload = async (pkg: BdixPackage) => {
    const file = pkg.files && pkg.files[0];
    if (!file || !file.url) {
      setDownloadToast('No direct stream link available for this mirror');
      setTimeout(() => setDownloadToast(null), 3000);
      return;
    }

    try {
      const serverLabel = pkg.source === 'server1' ? 'High-Speed Server 1' : 'High-Speed Server 2';
      const dlId = await startDownload({
        url: file.url,
        title: pkg.title || title,
        formatType: file.extension || 'media',
        formatLabel: `${serverLabel} (${(file.extension || 'MKV').toUpperCase()})`,
        thumbnail: posterSrc,
      });
      setDownloadToast(`Download started from ${serverLabel}`);
      setTimeout(() => setDownloadToast(null), 4000);
      return dlId;
    } catch (e: any) {
      setDownloadToast(`Download failed: ${e?.message || 'Network error'}`);
      setTimeout(() => setDownloadToast(null), 3000);
    }
  };

  const backdropSrc = getBackdropUrl(details?.backdrop_path || item.backdrop_path, 'w1280');
  const posterSrc = getPosterUrl(details?.poster_path || item.poster_path, 'w342');

  const avatarFallbackColors = [
    'var(--kino-coral, #ff7a64)',
    'var(--kino-peri, #9fa8ff)',
    'var(--kino-mint, #7ae2ba)',
    'var(--kino-yellow, #ffd24d)',
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-all"
        />

        {/* Modal Window Container (matching Sheet 5 & 6) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[28px] overflow-hidden bg-[var(--kino-surface,#151518)] border border-[var(--kino-line,#25252b)] text-[var(--kino-on,#f2efe9)] shadow-[0_30px_80px_rgba(0,0,0,0.85)] overflow-y-auto no-scrollbar"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Toast Notification */}
          {downloadToast && (
            <div className="toast" style={{ top: '16px', zIndex: 40 }}>
              <CheckCircle2 className="w-4 h-4 text-[#ffd24d]" />
              <span>{downloadToast}</span>
            </div>
          )}

          <div style={{ padding: '20px 24px 28px' }}>
            {/* HERO BANNER (.bd) */}
            <div
              className="bd"
              style={{
                minHeight: '270px',
                height: 'auto',
                background: `linear-gradient(135deg, rgba(20,20,24,0.7) 0%, rgba(20,20,24,0.95) 100%), url(${backdropSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid var(--kino-line)',
                paddingBottom: '24px',
              }}
            >
              {/* Vinyl record disc peeking out */}
              <div className="disc" />

              {/* Overlapping Poster Card with real thumbnail */}
              <div
                className="pst tilt pv flex-shrink-0 relative overflow-hidden shadow-2xl"
                style={{
                  width: isTv ? '124px' : '136px',
                  height: isTv ? '184px' : '204px',
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  zIndex: 2,
                }}
              >
                <img
                  src={posterSrc}
                  alt={title}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_POSTER_SVG;
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Header Text & Actions (.tx) */}
              <div className="tx" style={{ zIndex: 2 }}>
                <span
                  className="tag"
                  style={{
                    background: isTv ? 'var(--kino-peri)' : 'var(--kino-yellow)',
                    color: 'var(--kino-ink, #000)',
                    fontWeight: 700,
                  }}
                >
                  {isTv ? 'Series' : '#1 this week'}
                </span>

                <h1
                  style={{
                    fontSize: isTv ? '36px' : '40px',
                    lineHeight: 1.05,
                    margin: '6px 0',
                    fontFamily: 'var(--font-display, "Bricolage Grotesque", sans-serif)',
                    fontWeight: 800,
                    color: '#fff',
                  }}
                >
                  {title}
                </h1>

                {/* Metadata Pills (.mrow) */}
                <div className="mrow">
                  <span className="mc" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    ★ {rating}
                  </span>
                  <span className="mc" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    {releaseYear}
                  </span>
                  <span className="mc" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    {isTv ? `${details?.number_of_seasons || 1} seasons · ${details?.number_of_episodes || episodes.length || 6} eps` : runtimeStr}
                  </span>
                  <span className="mc" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    {firstGenre}
                  </span>
                  <span className="mc" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    {isTv ? 'TV-MA' : 'PG-13'}
                  </span>
                  <span className="mc" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    4K · HDR
                  </span>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 14px' }}>
                  {overview}
                </p>

                {/* Action Buttons (.btns) */}
                <div className="btns flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => onPlay(item, isTv ? selectedSeason : undefined, isTv ? 1 : undefined)}
                    className="b k rip cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isTv ? `Resume S${selectedSeason} · E1` : 'Play'}</span>
                  </button>

                  <KinoDownloadButton
                    label={isTv ? 'Download / Watch season' : 'Download / Watch'}
                    tooltip="Download or watch from FTP server"
                    title="Download or watch from FTP server"
                    onDownload={handleHeroDownloadClick}
                  />

                  <button
                    type="button"
                    data-react-managed="true"
                    onClick={() => onToggleFavorite?.(item)}
                    className={`alb ${isFavorite ? 'on' : ''} cursor-pointer`}
                    title={isFavorite ? 'Remove from My List' : 'Add to My List'}
                  >
                    <span className="ic">
                      <svg className="pl" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      </svg>
                      <svg className="ck" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="lw font-bold text-sm">
                      <span>Add to list</span>
                      <span>In your list</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* DETAILS BODY: MOVIE vs SERIES */}
            {!isTv ? (
              /* ========================================================================= */
              /* SHEET 5: MOVIE DETAILS (Cast & Crew + Download selector + Similar Row)   */
              /* ========================================================================= */
              <>
                <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-4 mt-4">
                  {/* Left Box: Cast & Crew */}
                  <div className="box min-w-0" style={{ padding: '16px 20px', background: 'var(--kino-surface-hi)' }}>
                    <div className="sec flex items-center justify-between mb-3">
                      <b style={{ fontSize: '15px' }}>Cast &amp; Crew</b>
                      <small style={{ color: 'var(--kino-on-var)', cursor: 'pointer' }}>Top Billed</small>
                    </div>

                    {/* Cast Row with real TMDB actor profile images */}
                    <div className="cast overflow-x-auto no-scrollbar">
                      {castList.map((c, i) => (
                        <div key={c.id || i} className="min-w-0">
                          <div
                            className="ac"
                            style={{
                              background: avatarFallbackColors[i % 4],
                            }}
                          >
                            {c.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                                alt={c.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                            )}
                          </div>
                          <b>{c.name}</b>
                          <small>{c.character}</small>
                        </div>
                      ))}
                    </div>

                    {/* Crew Row */}
                    <div className="crew">
                      <div>
                        <small>Director</small>
                        <b>{director}</b>
                      </div>
                      <div>
                        <small>Writer</small>
                        <b>{writer}</b>
                      </div>
                      <div>
                        <small>Music</small>
                        <b>{music}</b>
                      </div>
                    </div>
                  </div>

                  {/* Right Box: Download Selector with High-Speed Server Integration */}
                  <div id="movie-download-section" className="box min-w-0" style={{ padding: '16px 20px', background: 'var(--kino-surface-hi)' }}>
                    <div className="ph flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="ico flex items-center justify-center rounded-xl shrink-0"
                          style={{
                            width: '32px',
                            height: '32px',
                            background: 'var(--kino-mint, #7ae2ba)',
                            color: 'var(--kino-ink, #000)',
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }} className="truncate">High-Speed Download</h3>
                          <small style={{ color: 'var(--kino-on-var)', fontSize: '11px' }} className="truncate block">
                            {ftpMirrors.length > 0 ? `${ftpMirrors.length} FTP server mirrors found` : 'Saves to your Downloads folder'}
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleHeroDownloadClick}
                        className="text-[11px] text-[#ffd24d] hover:underline font-bold cursor-pointer border-0 bg-transparent shrink-0 whitespace-nowrap ml-1"
                        title="Search full FTP repository for this title"
                      >
                        All Mirrors &rarr;
                      </button>
                    </div>

                    {loadingMirrors ? (
                      <div className="py-8 flex flex-col items-center justify-center text-neutral-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#ffd24d]" />
                        <span className="text-xs">Searching High-Speed Server 1 &amp; Server 2...</span>
                      </div>
                    ) : ftpMirrors.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-[11px] font-semibold text-neutral-300 mb-0.5 flex items-center justify-between gap-2">
                          <span className="truncate">FTP Server Mirrors</span>
                          <span className="text-[10px] text-[var(--kino-mint)] font-bold shrink-0 whitespace-nowrap">UNLIMITED SPEED</span>
                        </div>
                        <div className="max-h-[175px] overflow-y-auto no-scrollbar flex flex-col gap-1.5 pr-0.5">
                          {ftpMirrors.map((pkg) => {
                            const isSelected = selectedMirror?.id === pkg.id;
                            const sName = pkg.source === 'server1' ? 'High-Speed Server 1' : 'High-Speed Server 2';
                            return (
                              <div
                                key={pkg.id}
                                onClick={() => setSelectedMirror(pkg)}
                                className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'border-[#ffd24d] bg-white/10 shadow-sm'
                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-[#ffd24d]' : 'bg-neutral-600'}`} />
                                  <div className="overflow-hidden flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-white truncate" title={pkg.title}>
                                      {formatMediaTitle(pkg.title)}
                                    </div>
                                    <div className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-2">
                                      <span className="text-[var(--kino-mint)] font-medium shrink-0">{sName}</span>
                                      <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-white/10 text-neutral-300 shrink-0">
                                        {pkg.primaryExtension || 'MKV'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartFtpDownload(pkg);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#ffd24d] hover:text-black text-white text-[10px] font-bold shrink-0 transition-all border-0 cursor-pointer flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Get</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {selectedMirror && (
                          <div
                            onClick={() => handleStartFtpDownload(selectedMirror)}
                            className="big-btn mt-2 cursor-pointer flex items-center justify-center gap-2"
                            style={{ height: '38px', fontSize: '13px' }}
                          >
                            <Download className="w-4 h-4" />
                            <span>Download ({selectedMirror.source === 'server1' ? 'Server 1' : 'Server 2'})</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-[11px] text-neutral-400 mb-2.5">
                          Direct mirror not found on local subnet. You can search the full BDIX repository:
                        </div>
                        <button
                          type="button"
                          onClick={handleHeroDownloadClick}
                          className="big-btn mt-2 cursor-pointer flex items-center justify-center gap-2 w-full"
                          style={{ height: '40px', fontSize: '13px' }}
                        >
                          <Download className="w-4 h-4" />
                          <span>Search on FTP Repository</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: More like this */}
                {similarItems.length > 0 && (
                  <div style={{ marginTop: '18px' }}>
                    <div className="sec mb-2">
                      <b style={{ fontSize: '15px' }}>More like this</b>
                    </div>
                    <div className="row flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                      {similarItems.map((sim) => (
                        <div
                          key={sim.id}
                          onClick={() => onSelectSimilar?.(sim)}
                          className="pst relative overflow-hidden flex-shrink-0 cursor-pointer group rounded-2xl border border-white/5 transition-transform hover:scale-105"
                          style={{ width: '130px', height: '190px' }}
                          title={sim.title || sim.name}
                        >
                          <img
                            src={getPosterUrl(sim.poster_path, 'w342')}
                            alt={sim.title || sim.name}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_POSTER_SVG;
                            }}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-xs font-bold text-white truncate">{sim.title || sim.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ========================================================================= */
              /* SHEET 6: SERIES DETAILS (Seasons & Episodes list + Cast List + Similar)   */
              /* ========================================================================= */
              <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-4 mt-4">
                {/* Left Column: Season Selector Chips + Episodes Panel (.panel) */}
                <div className="min-w-0">
                  <div className="chips flex items-center gap-2 mb-2">
                    {Array.from({ length: details?.number_of_seasons || 2 }, (_, i) => i + 1).map((sNum) => (
                      <span
                        key={sNum}
                        onClick={() => handleSeasonChange(sNum)}
                        className={`chip cursor-pointer ${selectedSeason === sNum ? 'on' : ''}`}
                      >
                        Season {sNum}
                      </span>
                    ))}
                    <span style={{ marginLeft: 'auto', color: 'var(--kino-on-var)', fontSize: '12px' }}>
                      {episodes.length} episodes
                    </span>
                  </div>

                  <div className="panel" style={{ padding: '4px 16px', background: 'var(--kino-surface-hi)' }}>
                    {loadingEpisodes ? (
                      <div className="py-12 text-center text-sm text-[var(--kino-on-var)]">
                        Loading episodes...
                      </div>
                    ) : episodes.length > 0 ? (
                      episodes.map((ep, i) => (
                        <div
                          key={ep.id || i}
                          onClick={() => onPlay(item, selectedSeason, ep.episode_number || i + 1)}
                          className="ep group"
                          title={`Play S${selectedSeason} E${ep.episode_number || i + 1}: ${ep.name}`}
                        >
                          <span className="n">{ep.episode_number || i + 1}</span>
                          <div className="tm relative overflow-hidden bg-neutral-800">
                            <img
                              src={
                                ep.still_path
                                  ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                                  : backdropSrc
                              }
                              alt={ep.name}
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_BACKDROP_SVG;
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="bar">
                              <b style={{ width: i === 0 ? '100%' : i === 1 ? '60%' : '0%' }} />
                            </div>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <b className="truncate text-white">{ep.name}</b>
                            <small className="truncate text-neutral-400">
                              {ep.overview || 'A new chapter unfolds as the mystery deepens.'}
                            </small>
                          </div>
                          <em>{ep.runtime ? `${ep.runtime}m` : '50m'}</em>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEpisodeDownload(ep.episode_number || i + 1);
                            }}
                            className="p-1 text-[var(--kino-on-var)] hover:text-white cursor-pointer"
                            title="Search FTP mirror for this episode"
                          >
                            <Download className="w-4 h-4" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-sm text-[var(--kino-on-var)]">
                        No episodes available for this season.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Cast & Crew Cards (.pc) + Recommendations */}
                <div className="min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="box" style={{ padding: '14px 18px', background: 'var(--kino-surface-hi)' }}>
                    <div className="sec flex items-center justify-between mb-2">
                      <b style={{ fontSize: '15px' }}>Cast &amp; Crew</b>
                      <small style={{ color: 'var(--kino-on-var)' }}>All</small>
                    </div>

                    <div className="space-y-1">
                      {castList.slice(0, 4).map((c, i) => (
                        <div key={c.id || i} className="pc">
                          <div
                            className="ac"
                            style={{
                              background: avatarFallbackColors[i % 4],
                            }}
                          >
                            {c.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                                alt={c.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                            )}
                          </div>
                          <div>
                            <b>{c.name}</b>
                            <small>{c.character || 'Cast'}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {similarItems.length > 0 && (
                    <div className="box" style={{ padding: '14px 18px', background: 'var(--kino-surface-hi)' }}>
                      <div className="sec mb-2">
                        <b style={{ fontSize: '15px' }}>Similar Series</b>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {similarItems.slice(0, 3).map((sim) => (
                          <div
                            key={sim.id}
                            onClick={() => onSelectSimilar?.(sim)}
                            className="pst relative overflow-hidden rounded-xl border border-white/5 cursor-pointer group"
                            style={{ height: '110px' }}
                            title={sim.name || sim.title}
                          >
                            <img
                              src={getPosterUrl(sim.poster_path, 'w342')}
                              alt={sim.name || sim.title}
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_POSTER_SVG;
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
