import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Crop,
  AlertCircle,
} from 'lucide-react';
import { uploadProfileImage } from '../services/imageUpload';
import { useTheme } from '../context/ThemeContext';

interface ProfileImageCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onSelectAnother: () => void;
  onSaved: (avatarUrl: string) => void;
}

export const ProfileImageCropModal: React.FC<ProfileImageCropModalProps> = ({
  isOpen,
  imageFile,
  onClose,
  onSelectAnother,
  onSaved,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Load image file into preview data URL
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setUploadError(null);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support for mobile/trackpad gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset transforms
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Crop to 400x400 canvas and upload
  const handleCropAndSave = async (skipCrop = false) => {
    if (!imageFile || !imageSrc) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      let uploadBlob: Blob;

      if (skipCrop) {
        // Upload original file directly
        uploadBlob = imageFile;
      } else {
        // Render current crop viewport to high-res canvas
        const canvas = document.createElement('canvas');
        const OUTPUT_SIZE = 400;
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext('2d');

        if (!ctx || !imageRef.current || !viewportRef.current) {
          throw new Error('Canvas render context not available');
        }

        const img = imageRef.current;
        const viewport = viewportRef.current;
        const vRect = viewport.getBoundingClientRect();

        // Calculate scaling ratio between preview display and export canvas
        const scaleRatio = OUTPUT_SIZE / vRect.width;

        ctx.fillStyle = '#0B0B0D';
        ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        ctx.save();
        // Translate to canvas center
        ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.translate(pan.x * scaleRatio, pan.y * scaleRatio);

        // Draw image centered
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let drawWidth = OUTPUT_SIZE;
        let drawHeight = OUTPUT_SIZE;
        if (imgAspect > 1) {
          drawWidth = OUTPUT_SIZE * imgAspect;
        } else {
          drawHeight = OUTPUT_SIZE / imgAspect;
        }

        ctx.drawImage(
          img,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
        ctx.restore();

        // Convert to blob
        uploadBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to generate image blob'));
            },
            'image/jpeg',
            0.92
          );
        });
      }

      // Upload to Cloud
      const res = await uploadProfileImage(uploadBlob);
      if (res.success && res.url) {
        onSaved(res.url);
        onClose();
      } else {
        throw new Error(res.error || 'Failed to upload image');
      }
    } catch (err: any) {
      console.error('Profile photo upload error:', err);
      setUploadError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !imageFile) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#141417] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* 1. Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#DCFF7D]/15 border border-[#DCFF7D]/25 flex items-center justify-center text-[#DCFF7D]">
                <Crop className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Crop Profile Picture</h3>
                <p className="text-[11px] text-neutral-400">Drag to reposition, zoom or upload directly</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Interactive Crop Canvas Area */}
          <div className="p-6 flex flex-col items-center justify-center space-y-4">
            <div
              ref={viewportRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl overflow-hidden bg-black/60 border border-white/10 cursor-grab active:cursor-grabbing flex items-center justify-center shadow-inner"
            >
              {/* Image element being manipulated */}
              {imageSrc && (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  className="max-w-none transition-transform duration-75 select-none pointer-events-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}

              {/* Circular Aperture Overlay (Matches Profile View) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Dark Vignette outside circle */}
                <div
                  className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-[#DCFF7D] shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
                />
              </div>

              {/* Center crosshair helper */}
              <div className="absolute w-2 h-2 rounded-full bg-[#DCFF7D]/50 pointer-events-none" />
            </div>

            {/* 3. Transform Controls (Zoom, Rotate, Reset) */}
            <div className="w-full max-w-sm flex items-center justify-between gap-3 px-2">
              {/* Zoom Out */}
              <button
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
                disabled={isUploading || zoom <= 1}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Zoom Slider */}
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  disabled={isUploading}
                  className="w-full accent-[#DCFF7D] cursor-pointer"
                />
                <span className="text-[11px] font-mono text-neutral-400 w-9 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Zoom In */}
              <button
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
                disabled={isUploading || zoom >= 3}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Rotate 90deg */}
              <button
                onClick={handleRotate}
                disabled={isUploading}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                disabled={isUploading}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Reset Position"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Error Message if any */}
            {uploadError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs w-full">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* 4. Action Buttons Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#101012] border-t border-white/8">
            <button
              onClick={onSelectAnother}
              disabled={isUploading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Select Another</span>
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2.5 justify-end">
              <button
                onClick={() => handleCropAndSave(true)}
                disabled={isUploading}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                title="Upload original image without cropping"
              >
                Upload As-Is
              </button>

              <button
                onClick={() => handleCropAndSave(false)}
                disabled={isUploading}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-60 ${
                  isLight
                    ? 'bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 theme-btn-dark'
                    : 'bg-[#DCFF7D] text-[#0B0B0D] hover:bg-[#cbf168] shadow-md shadow-[#DCFF7D]/20'
                }`}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Crop & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
