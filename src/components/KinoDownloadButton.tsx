import React, { useState, useRef, useEffect } from 'react';
import { getDownloads } from '../services/downloadManager';

interface KinoDownloadButtonProps {
  onDownload?: () => Promise<string | void> | string | void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  small?: boolean;
}

export const KinoDownloadButton: React.FC<KinoDownloadButtonProps> = ({
  onDownload,
  label = 'Download',
  className = '',
  style,
  small = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'run' | 'done'>('idle');
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);

  const C2 = 2 * Math.PI * 20; // 125.66px

  // Track REAL download progress and completion
  useEffect(() => {
    if (!activeDownloadId) return;

    const checkProgress = () => {
      const items = getDownloads();
      const current = items.find((d) => d.id === activeDownloadId);
      if (!current) return;

      if (current.status === 'completed') {
        if (ringRef.current) {
          ringRef.current.style.strokeDashoffset = '0';
        }
        setStatus('done');
        setTimeout(() => {
          setStatus('idle');
          setActiveDownloadId(null);
          if (ringRef.current) {
            ringRef.current.style.strokeDashoffset = `${C2}`;
          }
        }, 3000);
      } else if (current.status === 'error') {
        setStatus('idle');
        setActiveDownloadId(null);
        if (ringRef.current) {
          ringRef.current.style.strokeDashoffset = `${C2}`;
        }
      } else {
        // Real progress from active yt-dlp / stream download
        const p = Math.min(1, Math.max(0.08, (current.progress || 0) / 100));
        if (ringRef.current) {
          ringRef.current.style.strokeDashoffset = `${C2 * (1 - p)}`;
        }
      }
    };

    checkProgress();
    window.addEventListener('ovilo_download_update', checkProgress);
    window.addEventListener('ovilo_downloads_sync', checkProgress);
    return () => {
      window.removeEventListener('ovilo_download_update', checkProgress);
      window.removeEventListener('ovilo_downloads_sync', checkProgress);
    };
  }, [activeDownloadId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status !== 'idle') return;

    setStatus('run');

    if (ringRef.current) {
      ringRef.current.style.strokeDasharray = `${C2}`;
      ringRef.current.style.strokeDashoffset = `${C2 * 0.95}`;
    }

    try {
      if (onDownload) {
        const resId = await onDownload();
        if (resId === 'saved_offline') {
          setStatus('done');
          setTimeout(() => {
            setStatus('idle');
          }, 2500);
          return;
        }
        if (typeof resId === 'string' && resId.length > 0) {
          setActiveDownloadId(resId);
          return;
        }
      }
      // If callback did not return an active download id, reset gracefully
      setTimeout(() => {
        setStatus('idle');
      }, 1500);
    } catch (err) {
      console.warn('Download trigger error:', err);
      setStatus('idle');
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = `${C2}`;
      }
    }
  };

  return (
    <button
      type="button"
      data-react-managed="true"
      onClick={handleClick}
      className={`dlb ${status === 'run' ? 'run' : status === 'done' ? 'done' : ''} ${small ? 'sm' : ''} ${className}`}
      style={style}
      title={label}
    >
      <span className="lbl">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
        </svg>
        <span className="lbl-txt">{label}</span>
      </span>

      <svg className="ring" viewBox="0 0 48 48">
        <circle className="trk" cx="24" cy="24" r="20" />
        <circle ref={ringRef} className="prg" cx="24" cy="24" r="20" />
      </svg>

      <svg className="chk" viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </button>
  );
};
