import React, { useMemo } from 'react';

interface CircularWavyProgressIndicatorProps {
  progress: number; // 0.0 to 1.0
  isLoading?: boolean;
  size?: number; // diameter in px (default 56)
  strokeWidth?: number; // stroke width (default 3.0)
  waves?: number; // 12 waves matching Material 3 Expressive
  amplitude?: number; // height of waves (default 3.6)
  className?: string;
}

export const CircularWavyProgressIndicator: React.FC<CircularWavyProgressIndicatorProps> = ({
  progress = 0,
  isLoading = false,
  size = 56,
  strokeWidth = 3.0,
  waves = 12,
  amplitude = 3.6,
  className = '',
}) => {
  const clampedProgress = Math.max(0, Math.min(1, isNaN(progress) ? 0 : progress));
  const center = size / 2;
  const baseRadius = center - amplitude - strokeWidth;

  // Generate smooth closed 12-wave path
  const { pathData, totalLength } = useMemo(() => {
    const steps = 180;
    let d = '';
    let approxLength = 0;
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * 2 * Math.PI - Math.PI / 2; // start from top
      const r = baseRadius + amplitude * Math.sin(waves * theta);
      const x = center + r * Math.cos(theta);
      const y = center + r * Math.sin(theta);

      if (i === 0) {
        d += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
      } else {
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
        const dx = x - prevX;
        const dy = y - prevY;
        approxLength += Math.sqrt(dx * dx + dy * dy);
      }
      prevX = x;
      prevY = y;
    }

    return { pathData: d, totalLength: approxLength };
  }, [center, baseRadius, amplitude, waves]);

  const dashOffset = isLoading ? 0 : totalLength * (1 - clampedProgress);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`absolute inset-0 pointer-events-none ${className} ${isLoading ? 'animate-spin' : ''}`}
      style={{
        overflow: 'visible',
        animationDuration: isLoading ? '6s' : '0s',
      }}
    >
      {/* Background Track */}
      <path
        d={pathData}
        fill="none"
        stroke="var(--md-sys-color-surface-container-highest)"
        strokeWidth={strokeWidth}
        opacity={0.35}
      />
      {/* Active Wavy Progress (Golden yellow or primary accent matching image) */}
      <path
        d={pathData}
        fill="none"
        stroke="var(--md-sys-color-primary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={totalLength}
        strokeDashoffset={dashOffset}
        style={{
          transition: 'stroke-dashoffset 250ms ease-out, stroke 600ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      />
    </svg>
  );
};
