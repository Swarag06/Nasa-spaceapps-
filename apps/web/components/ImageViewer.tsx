import React, { useState, useEffect } from 'react';
import { FrameItem } from '../lib/types';
import { getFrameImageUrl } from '../lib/api';
import { WavelengthBadge } from './WavelengthBadge';
import { Crosshair, ZoomIn, ZoomOut, AlertCircle, Layers, Target, Info, Sparkles } from 'lucide-react';

interface ImageViewerProps {
  targetId: string;
  frame: FrameItem | null;
  tracking?: boolean;
  stack?: string;
  caption?: string;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  targetId,
  frame,
  tracking = false,
  stack,
  caption,
  className = '',
}) => {
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Requirement: Toggle "Show predicted comet position" - default on for tracking targets
  const [showCometPosition, setShowCometPosition] = useState<boolean>(true);

  // Requirement: Stacked view mode
  const [isStackedView, setIsStackedView] = useState<boolean>(false);

  // Determine which image file to load (single epoch or stacked image)
  const currentImageFile = isStackedView && stack ? stack : frame?.file || '';
  const imageUrl = getFrameImageUrl(targetId, currentImageFile);

  const [imgSrc, setImgSrc] = useState<string>(imageUrl);
  const [triedProxy, setTriedProxy] = useState<boolean>(false);

  // Reset error state and reset stacked view when target changes
  useEffect(() => {
    setHasError(false);
    setTriedProxy(false);
    setImgSrc(imageUrl);
  }, [imageUrl, targetId, isStackedView]);

  useEffect(() => {
    setIsStackedView(false);
  }, [targetId]);

  const handleImageError = () => {
    if (!triedProxy) {
      setTriedProxy(true);
      setImgSrc(`/remote-frames/${targetId}/${currentImageFile}`);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/90 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Top Banner if Stacked View is active */}
      {isStackedView && (
        <div className="w-full p-3.5 bg-amber-950/40 border-b border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 z-20">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-amber-300">Stacked View</span>
            <span className="text-[11px] text-amber-200/90 leading-relaxed">
              Many frames combined. Background stars are smeared out because they drift between frames, while the comet stays in place, so it stands out.
            </span>
          </div>
        </div>
      )}

      {/* Top Controls Overlay Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 p-3 border-b border-zinc-900 bg-zinc-950/80 z-20">
        {/* Left: Wavelength badge or Stacked label */}
        <div className="flex items-center gap-2">
          {isStackedView ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950/80 px-3 py-1.5 border border-amber-500/50 text-xs font-mono text-amber-300 shadow-md">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Co-added Stack</span>
            </div>
          ) : (
            <WavelengthBadge frame={frame} />
          )}

          {/* Target Tracking Badge if tracking is active */}
          {tracking && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
              <Target className="w-3 h-3 text-cyan-400" />
              <span>Target Tracking</span>
            </div>
          )}
        </div>

        {/* Right Toolbar: Stacked View button + Comet Position toggle + Zoom / Reticle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Requirement: Stacked view button if stack is present in index.json */}
          {stack && (
            <button
              onClick={() => setIsStackedView(!isStackedView)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition shadow-sm ${
                isStackedView
                  ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title="Toggle stacked multi-epoch view"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isStackedView ? 'Single frames' : 'Stacked view'}</span>
            </button>
          )}

          {/* Requirement: Toggle "Show predicted comet position" for tracking targets (Default ON) */}
          {tracking && (
            <button
              onClick={() => setShowCometPosition(!showCometPosition)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition shadow-sm ${
                showCometPosition
                  ? 'bg-cyan-950/80 border-cyan-500/70 text-cyan-300 ring-1 ring-cyan-500/30'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle center comet predicted position ring"
            >
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show predicted comet position</span>
            </button>
          )}

          {/* Reticle / Zoom tools */}
          <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800">
            <button
              onClick={() => setShowCrosshair(!showCrosshair)}
              title={showCrosshair ? 'Hide Reticle' : 'Show Reticle'}
              className={`p-1 rounded transition ${
                showCrosshair
                  ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? 'Reset Zoom' : 'Zoom 2x'}
              className={`p-1 rounded transition ${
                isZoomed
                  ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Image Display Area */}
      <div className="relative w-full aspect-square max-h-[580px] flex items-center justify-center overflow-hidden p-2 select-none bg-black">
        {hasError ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs p-8 text-center">
            <AlertCircle className="w-6 h-6 text-amber-500/70" />
            <span>Could not load image: {currentImageFile}</span>
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
              key={imgSrc}
              src={imgSrc}
              alt={`SPHEREx Observation ${frame?.obs_id || 'stack'}`}
              onError={handleImageError}
              className="max-h-[520px] max-w-full rounded-lg object-contain shadow-inner pointer-events-none"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Requirement: Thin ring (about 12% of the image width) at the centre of the image */}
            {tracking && showCometPosition && (
              <div
                className="absolute pointer-events-none rounded-full border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] z-10 transition-all"
                style={{
                  width: '12%',
                  height: '12%',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                title="Predicted comet position"
              >
                {/* Subtle center crosshairs inside the ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-cyan-300" />
                  <div className="absolute w-2.5 h-px bg-cyan-400/50" />
                  <div className="absolute h-2.5 w-px bg-cyan-400/50" />
                </div>
              </div>
            )}

            {/* Optional Full Coordinate Reticle */}
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

      {/* Requirement: Show the target's caption under the image */}
      {caption && caption.trim().length > 0 && (
        <div className="w-full px-4 py-3 bg-zinc-950/90 border-t border-zinc-900 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-300 font-sans">
            <span className="font-semibold text-zinc-200">What to look for: </span>
            {caption}
          </p>
        </div>
      )}

      {/* Bottom Bar: Observation ID & Status */}
      <div className="w-full flex items-center justify-between px-4 py-2 border-t border-zinc-900 bg-zinc-950/60 text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {isStackedView ? `Stacked Image (${stack})` : `FITS Cutout: ${frame?.obs_id || 'N/A'}`}
          </span>
        </div>
        <div>Pixel Scale: ~6.2″/px</div>
      </div>
    </div>
  );
};
