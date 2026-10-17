import React, { useState, useEffect, useRef } from 'react';
import { FrameItem } from '../lib/types';
import { getFrameImageUrl } from '../lib/api';
import { WavelengthBadge } from './WavelengthBadge';
import { Crosshair, ZoomIn, ZoomOut, AlertCircle, Layers, Target, Info, Sparkles, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  targetId: string;
  targetTitle?: string;
  frame: FrameItem | null;
  tracking?: boolean;
  stack?: string;
  caption?: string;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  targetId,
  targetTitle,
  frame,
  tracking = false,
  stack,
  caption,
  className = '',
}) => {
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Zoom & Pan state (supporting pinch-zoom on phone and buttons on desktop)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Toggle "Show predicted comet position" - default on for tracking targets
  const [showCometPosition, setShowCometPosition] = useState<boolean>(true);

  // Stacked view mode
  const [isStackedView, setIsStackedView] = useState<boolean>(false);

  // Determine which image file to load (single epoch or stacked image)
  const currentImageFile = isStackedView && stack ? stack : frame?.file || '';
  const imageUrl = getFrameImageUrl(targetId, currentImageFile);

  const [imgSrc, setImgSrc] = useState<string>(imageUrl);
  const [triedProxy, setTriedProxy] = useState<boolean>(false);

  // Gesture refs for Pinch-to-Zoom & Pan on mobile
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.0);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const lastTapRef = useRef<number>(0);

  // Reset error state and reset stacked view when target changes
  useEffect(() => {
    setHasError(false);
    setTriedProxy(false);
    setImgSrc(imageUrl);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
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

  // Pinch-to-zoom and pan touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch gesture start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialDistanceRef.current = dist;
      initialZoomRef.current = zoom;
      isDraggingRef.current = false;
    } else if (e.touches.length === 1) {
      // Single finger drag if zoomed
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };

      // Detect double-tap to zoom toggle
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (zoom > 1.0) {
          setZoom(1.0);
          setPan({ x: 0, y: 0 });
        } else {
          setZoom(2.2);
        }
      }
      lastTapRef.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialDistanceRef.current) {
      // 2 fingers: pinch-zoom
      if (e.cancelable) e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialDistanceRef.current;
      const newZoom = Math.min(4.0, Math.max(1.0, Number((initialZoomRef.current * ratio).toFixed(2))));
      setZoom(newZoom);
    } else if (e.touches.length === 1 && isDraggingRef.current && zoom > 1.0) {
      // 1 finger: pan when zoomed in
      if (e.cancelable) e.preventDefault();
      const maxPan = 180 * (zoom - 1);
      const newX = Math.min(maxPan, Math.max(-maxPan, e.touches[0].clientX - dragStartRef.current.x));
      const newY = Math.min(maxPan, Math.max(-maxPan, e.touches[0].clientY - dragStartRef.current.y));
      setPan({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      initialDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
    }
    if (zoom <= 1.05) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    }
  };

  // Mouse drag handlers for desktop zoom panning
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const mouseDragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1.0) {
      setIsMouseDragging(true);
      mouseDragStart.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDragging && zoom > 1.0) {
      const maxPan = 180 * (zoom - 1);
      const newX = Math.min(maxPan, Math.max(-maxPan, e.clientX - mouseDragStart.current.x));
      const newY = Math.min(maxPan, Math.max(-maxPan, e.clientY - mouseDragStart.current.y));
      setPan({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsMouseDragging(false);
  };

  const resetZoomPan = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      className={`image-viewer-container relative w-full max-w-full flex flex-col items-center justify-center overflow-hidden rounded-none sm:rounded-2xl border-y sm:border border-zinc-800/80 bg-zinc-950/90 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Top Banner if Stacked View is active */}
      {isStackedView && (
        <div className="w-full p-3 sm:p-3.5 bg-amber-950/40 border-b border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 z-20">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-amber-300">Stacked View</span>
            <span className="text-[11px] text-amber-200/90 leading-relaxed">
              Many frames combined. Background stars are smeared out because they drift between frames, while the comet stays in place, so it stands out.
            </span>
          </div>
        </div>
      )}

      {/* Top Controls Overlay Bar: All buttons at least 44px tall for touch target accessibility */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 border-b border-zinc-900 bg-zinc-950/80 z-20">
        {/* Left: Wavelength badge or Stacked label */}
        <div className="flex items-center gap-2">
          {isStackedView ? (
            <div className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-amber-950/80 px-3 py-2 border border-amber-500/50 text-xs font-mono text-amber-300 shadow-md">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Co-added Stack</span>
            </div>
          ) : (
            <WavelengthBadge frame={frame} />
          )}

          {/* Target Tracking Badge */}
          {tracking && (
            <div className="min-h-[44px] hidden xs:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tracking</span>
            </div>
          )}
        </div>

        {/* Right Toolbar: Stacked View button + Comet Position toggle + Zoom controls (All min-h-[44px]) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Stacked view button if stack is present */}
          {stack && (
            <button
              onClick={() => setIsStackedView(!isStackedView)}
              aria-pressed={isStackedView}
              aria-label={isStackedView ? "Switch back to single frames" : "Switch to stacked multi-epoch view"}
              className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition shadow-sm flex items-center gap-1.5 active:scale-95 ${
                isStackedView
                  ? 'bg-amber-950/90 border-amber-500/70 text-amber-200 ring-1 ring-amber-500/30'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-300" aria-hidden="true" />
              <span>{isStackedView ? 'Single frames' : 'Stacked view'}</span>
            </button>
          )}

          {/* Toggle "Show predicted comet position" for tracking targets */}
          {tracking && (
            <button
              onClick={() => setShowCometPosition(!showCometPosition)}
              aria-pressed={showCometPosition}
              aria-label={showCometPosition ? "Hide predicted comet position ring" : "Show predicted comet position ring"}
              className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium transition shadow-sm flex items-center gap-1.5 active:scale-95 ${
                showCometPosition
                  ? 'bg-cyan-950/90 border-cyan-500/70 text-cyan-200 ring-1 ring-cyan-500/30'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-zinc-100'
              }`}
            >
              <Target className="w-4 h-4 text-cyan-300" aria-hidden="true" />
              <span className="hidden sm:inline">Comet position</span>
              <span className="sm:hidden">Ring: {showCometPosition ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Reticle & Zoom controls toolbar */}
          <div className="flex items-center gap-1 rounded-xl bg-zinc-900 p-0.5 border border-zinc-700">
            <button
              onClick={() => setShowCrosshair(!showCrosshair)}
              aria-pressed={showCrosshair}
              aria-label={showCrosshair ? 'Hide celestial coordinate reticle' : 'Show celestial coordinate reticle'}
              title={showCrosshair ? 'Hide Reticle' : 'Show Reticle'}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition active:scale-95 ${
                showCrosshair
                  ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-200'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <Crosshair className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              onClick={() => setZoom((z) => Math.min(4.0, Number((z + 0.5).toFixed(1))))}
              aria-label="Zoom in"
              title="Zoom In"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-300 hover:text-white active:scale-95 transition"
            >
              <ZoomIn className="w-4 h-4" aria-hidden="true" />
            </button>

            {zoom > 1.0 ? (
              <button
                onClick={resetZoomPan}
                aria-label={`Reset zoom, currently at ${zoom.toFixed(1)}x`}
                title="Reset Zoom"
                className="min-h-[44px] px-2.5 flex items-center gap-1 rounded-lg text-cyan-200 bg-cyan-950/90 border border-cyan-500/50 text-[11px] font-mono active:scale-95 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{zoom.toFixed(1)}x</span>
              </button>
            ) : (
              <button
                onClick={() => setZoom((z) => Math.max(1.0, Number((z - 0.5).toFixed(1))))}
                disabled={zoom <= 1.0}
                aria-label="Zoom out"
                title="Zoom Out"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-300 hover:text-white disabled:opacity-40 active:scale-95 transition"
              >
                <ZoomOut className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Display Area: Fills screen width on phone, supports multi-touch pinch-to-zoom & double tap & keyboard navigation */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-label={`Infrared image viewport for ${targetTitle || targetId}. Use arrow keys to pan when zoomed in.`}
        onKeyDown={(e) => {
          if (zoom > 1.0) {
            const step = 20;
            if (e.key === 'ArrowUp') setPan((p) => ({ ...p, y: p.y + step }));
            if (e.key === 'ArrowDown') setPan((p) => ({ ...p, y: p.y - step }));
            if (e.key === 'ArrowLeft') setPan((p) => ({ ...p, x: p.x + step }));
            if (e.key === 'ArrowRight') setPan((p) => ({ ...p, x: p.x - step }));
            if (e.key === 'r' || e.key === '0') resetZoomPan();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="image-viewer-aspect relative w-full max-w-full aspect-square flex items-center justify-center overflow-hidden select-none bg-black touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {hasError ? (
          <div className="flex flex-col items-center gap-2 text-zinc-300 text-xs p-6 text-center">
            <AlertCircle className="w-6 h-6 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-zinc-200">Could not load image: {currentImageFile}</span>
            <span className="text-[11px] font-mono text-zinc-400 truncate max-w-xs">{imageUrl}</span>
          </div>
        ) : (
          <div
            className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* The Stretched WebP Image: descriptive alt text with target name, time, wavelength */}
            <img
              key={imgSrc}
              src={imgSrc}
              alt={
                isStackedView
                  ? `SPHEREx co-added infrared stack of ${targetTitle || targetId}, combining multiple observation epochs across 0.75 to 5.0 µm wavelengths`
                  : `SPHEREx infrared observation of ${targetTitle || targetId}, time: ${
                      frame?.time_utc
                        ? new Date(frame.time_utc).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                        : 'Unknown date'
                    }, wavelength: ${frame?.wavelength_um != null ? `${frame.wavelength_um.toFixed(2)} µm` : 'Infrared'}`
              }
              onError={handleImageError}
              className="w-full h-full object-contain pointer-events-none shadow-inner"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Requirement: Thin ring (about 12% of image width) at centre of image */}
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
                aria-label="Predicted comet position"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                  <div className="absolute w-3 h-px bg-cyan-400/50" />
                  <div className="absolute h-3 w-px bg-cyan-400/50" />
                </div>
              </div>
            )}

            {/* Optional Full Coordinate Reticle */}
            {showCrosshair && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden="true">
                <div className="w-full h-px bg-cyan-400/30" />
                <div className="absolute h-full w-px bg-cyan-400/30" />
                <div className="absolute w-12 h-12 rounded-full border border-cyan-400/40" />
                <div className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-400/20" />
              </div>
            )}
          </div>
        )}

        {/* Pinch-zoom helper badge on mobile if user has not zoomed yet */}
        {zoom === 1.0 && (
          <div className="sm:hidden absolute bottom-2 right-2 pointer-events-none bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 border border-zinc-700">
            Pinch / Double-tap to zoom
          </div>
        )}
      </div>

      {/* Target caption under the image */}
      {caption && caption.trim().length > 0 && (
        <div className="w-full px-3.5 py-3 bg-zinc-950/90 border-t border-zinc-900 text-xs text-zinc-200 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-zinc-200 font-sans leading-relaxed">
            <span className="font-semibold text-white">What to look for: </span>
            {caption}
          </p>
        </div>
      )}

      {/* Bottom Bar: Observation ID & Status with both text and color badge */}
      <div className="w-full flex items-center justify-between px-3.5 py-2.5 border-t border-zinc-900 bg-zinc-950/70 text-[11px] font-mono text-zinc-300">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-semibold shrink-0">
            Calibrated
          </span>
          <span className="truncate text-zinc-200 font-medium">
            {isStackedView ? `Stack: ${stack}` : `Obs: ${frame?.obs_id || 'N/A'}`}
          </span>
        </div>
        <div className="shrink-0 text-zinc-300">Scale: ~6.2″/px</div>
      </div>
    </div>
  );
};
