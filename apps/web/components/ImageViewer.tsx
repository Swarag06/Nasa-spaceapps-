import React, { useState } from 'react';
import { FrameItem } from '../lib/types';
import { getFrameImageUrl } from '../lib/api';
import { WavelengthBadge } from './WavelengthBadge';
import { Crosshair, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';

interface ImageViewerProps {
  targetId: string;
  frame: FrameItem | null;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  targetId,
  frame,
  className = '',
}) => {
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!frame) {
    return (
      <div className={`relative flex items-center justify-center min-h-[420px] rounded-2xl border border-zinc-800 bg-zinc-950/80 text-zinc-500 ${className}`}>
        <span>No frame selected</span>
      </div>
    );
  }

  const imageUrl = getFrameImageUrl(targetId, frame.file);

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/90 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Top Overlay: Wavelength & Detector Badge */}
      <div className="absolute top-3 left-3 z-20">
        <WavelengthBadge frame={frame} />
      </div>

      {/* Top Right Tools Overlay */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-lg bg-zinc-950/80 p-1 border border-zinc-800 backdrop-blur-md">
        <button
          onClick={() => setShowCrosshair(!showCrosshair)}
          title={showCrosshair ? 'Hide Reticle' : 'Show Reticle'}
          className={`p-1.5 rounded transition ${
            showCrosshair
              ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsZoomed(!isZoomed)}
          title={isZoomed ? 'Reset Zoom' : 'Zoom 2x'}
          className={`p-1.5 rounded transition ${
            isZoomed
              ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
        </button>
      </div>

      {/* Image Display Area */}
      <div className="relative w-full aspect-square max-h-[580px] flex items-center justify-center overflow-hidden p-2 select-none bg-black">
        {hasError ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs p-8 text-center">
            <AlertCircle className="w-6 h-6 text-amber-500/70" />
            <span>Could not load frame image: {frame.file}</span>
            <span className="text-[11px] font-mono text-zinc-600">{imageUrl}</span>
          </div>
        ) : (
          <div
            className={`relative flex items-center justify-center transition-transform duration-200 ease-out ${
              isZoomed ? 'scale-150 cursor-grab active:cursor-grabbing' : 'scale-100'
            }`}
          >
            {/* The Stretched WebP Image */}
            <img
              key={imageUrl}
              src={imageUrl}
              alt={`SPHEREx Observation ${frame.obs_id}`}
              onError={() => setHasError(true)}
              className="max-h-[520px] max-w-full rounded-lg object-contain shadow-inner pointer-events-none"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Optional Coordinate Crosshair / Reticle */}
            {showCrosshair && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-px bg-cyan-400/30" />
                <div className="absolute h-full w-px bg-cyan-400/30" />
                <div className="absolute w-12 h-12 rounded-full border border-cyan-400/40" />
                <div className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-400/20" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Observation ID & Status */}
      <div className="w-full flex items-center justify-between px-4 py-2 border-t border-zinc-900 bg-zinc-950/60 text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>FITS Cutout: {frame.obs_id}</span>
        </div>
        <div>Pixel Scale: ~6.2″/px</div>
      </div>
    </div>
  );
};
