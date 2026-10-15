import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FrameItem } from '../lib/types';
import { getFrameImageUrl } from '../lib/api';
import { WavelengthBadge } from './WavelengthBadge';
import {
  Flame,
  Play,
  Pause,
  ArrowLeftRight,
  Columns,
  MinusCircle,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Sliders,
  Palette,
  Sparkles,
} from 'lucide-react';

interface ComparisonViewerProps {
  targetId: string;
  frames: FrameItem[];
  tracking?: boolean;
  className?: string;
}

type CompareMode = 'blink' | 'side-by-side' | 'difference';
type DiffColorMode = 'diverging' | 'grayscale';

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  targetId,
  frames,
  tracking = false,
  className = '',
}) => {
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(Math.min(frames.length - 1, 1));
  const [compareMode, setCompareMode] = useState<CompareMode>('blink');

  // Toggle for predicted comet position ring (default ON for tracking targets)
  const [showCometPosition, setShowCometPosition] = useState<boolean>(true);

  // Blink mode state: flips per second between 0.5 and 5.0
  const [flipsPerSec, setFlipsPerSec] = useState<number>(2.0);
  const [isBlinkPaused, setIsBlinkPaused] = useState<boolean>(false);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');

  // Synced Zoom & Pan state for Side-by-Side mode
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showReticle, setShowReticle] = useState<boolean>(false);

  // Difference mode state
  const [diffColorMode, setDiffColorMode] = useState<DiffColorMode>('diverging');
  const [diffGain, setDiffGain] = useState<number>(1.5);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const blinkTimerRef = useRef<number | null>(null);

  const totalFrames = frames.length;
  const frameA = frames[indexA] || frames[0];
  const frameB = frames[indexB] || frames[Math.min(totalFrames - 1, 1)];

  // Check if wavelengths differ by more than 0.1 micrometers
  const wavelengthDiff = Math.abs((frameA?.wavelength_um || 0) - (frameB?.wavelength_um || 0));
  const hasWavelengthMismatch = wavelengthDiff > 0.1;

  // Preload both images whenever indexA or indexB changes
  useEffect(() => {
    if (!frameA || !frameB) return;
    const urlA = getFrameImageUrl(targetId, frameA.file);
    const urlB = getFrameImageUrl(targetId, frameB.file);

    const imgA = new Image();
    imgA.crossOrigin = 'anonymous';
    imgA.src = urlA;

    const imgB = new Image();
    imgB.crossOrigin = 'anonymous';
    imgB.src = urlB;
  }, [targetId, frameA, frameB]);

  // Blink interval timer (0.5 to 5.0 flips/sec)
  useEffect(() => {
    if (compareMode !== 'blink' || isBlinkPaused) {
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
      return;
    }

    const intervalMs = Math.max(200, Math.round(1000 / flipsPerSec));
    blinkTimerRef.current = window.setInterval(() => {
      setActiveSlot((prev) => (prev === 'A' ? 'B' : 'A'));
    }, intervalMs);

    return () => {
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
    };
  }, [compareMode, isBlinkPaused, flipsPerSec]);

  // Compute B minus A difference image onto canvas
  const computeDifference = useCallback(() => {
    if (!frameA || !frameB || compareMode !== 'difference') return;

    setDiffLoading(true);
    setDiffError(null);

    const urlA = getFrameImageUrl(targetId, frameA.file);
    const urlB = getFrameImageUrl(targetId, frameB.file);

    const imgA = new Image();
    const imgB = new Image();
    imgA.crossOrigin = 'anonymous';
    imgB.crossOrigin = 'anonymous';

    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount += 1;
      if (loadedCount < 2) return;

      try {
        const width = imgA.naturalWidth || 512;
        const height = imgA.naturalHeight || 512;

        const offCanvasA = document.createElement('canvas');
        offCanvasA.width = width;
        offCanvasA.height = height;
        const ctxA = offCanvasA.getContext('2d');
        if (!ctxA) throw new Error('Could not create offscreen context for Frame A');
        ctxA.drawImage(imgA, 0, 0, width, height);
        const dataA = ctxA.getImageData(0, 0, width, height).data;

        const offCanvasB = document.createElement('canvas');
        offCanvasB.width = width;
        offCanvasB.height = height;
        const ctxB = offCanvasB.getContext('2d');
        if (!ctxB) throw new Error('Could not create offscreen context for Frame B');
        ctxB.drawImage(imgB, 0, 0, width, height);
        const dataB = ctxB.getImageData(0, 0, width, height).data;

        const targetCanvas = canvasRef.current;
        if (!targetCanvas) return;
        targetCanvas.width = width;
        targetCanvas.height = height;
        const targetCtx = targetCanvas.getContext('2d');
        if (!targetCtx) throw new Error('Could not create target canvas context');

        const outImageData = targetCtx.createImageData(width, height);
        const outData = outImageData.data;

        const len = width * height * 4;
        for (let i = 0; i < len; i += 4) {
          // Grayscale luminance
          const yA = 0.299 * dataA[i] + 0.587 * dataA[i + 1] + 0.114 * dataA[i + 2];
          const yB = 0.299 * dataB[i] + 0.587 * dataB[i + 1] + 0.114 * dataB[i + 2];

          // Difference = B - A
          const rawDelta = (yB - yA) * diffGain;

          if (diffColorMode === 'grayscale') {
            // Centered at neutral gray 128
            const val = Math.min(255, Math.max(0, Math.round(128 + rawDelta)));
            outData[i] = val;
            outData[i + 1] = val;
            outData[i + 2] = val;
            outData[i + 3] = 255;
          } else {
            // Diverging Color Map:
            // Negative (dimmer in B / object departed): Cyan / Blue
            // Zero (no change): Deep dark space / neutral slate
            // Positive (brighter in B / object appeared): Amber / Red / Yellow
            const deltaNorm = Math.min(1.0, Math.max(-1.0, rawDelta / 128.0));
            if (deltaNorm > 0) {
              // Positive: Red to Yellow
              const r = Math.min(255, Math.round(40 + deltaNorm * 215));
              const g = Math.min(255, Math.round(deltaNorm * 180));
              const b = Math.min(255, Math.round(10 + (1 - deltaNorm) * 20));
              outData[i] = r;
              outData[i + 1] = g;
              outData[i + 2] = b;
            } else if (deltaNorm < 0) {
              // Negative: Blue to Cyan
              const mag = Math.abs(deltaNorm);
              const r = Math.min(255, Math.round(10 + (1 - mag) * 20));
              const g = Math.min(255, Math.round(mag * 170));
              const b = Math.min(255, Math.round(50 + mag * 205));
              outData[i] = r;
              outData[i + 1] = g;
              outData[i + 2] = b;
            } else {
              outData[i] = 16;
              outData[i + 1] = 18;
              outData[i + 2] = 24;
            }
            outData[i + 3] = 255;
          }
        }

        targetCtx.putImageData(outImageData, 0, 0);
        setDiffLoading(false);
      } catch (err: any) {
        console.error('Difference canvas error:', err);
        setDiffError(err?.message || 'Failed to compute difference');
        setDiffLoading(false);
      }
    };

    const onError = () => {
      setDiffError('Failed to load frames for difference calculation.');
      setDiffLoading(false);
    };

    imgA.onload = onLoaded;
    imgA.onerror = onError;
    imgB.onload = onLoaded;
    imgB.onerror = onError;

    imgA.src = urlA;
    imgB.src = urlB;
  }, [targetId, frameA, frameB, compareMode, diffColorMode, diffGain]);

  useEffect(() => {
    if (compareMode === 'difference') {
      computeDifference();
    }
  }, [compareMode, computeDifference]);

  // Synced Pan & Drag handlers for Side-by-Side mode
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan sync
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetZoomPan = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  if (totalFrames < 2) {
    return (
      <div className="p-8 text-center text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/60">
        At least 2 frames required for comparison.
      </div>
    );
  }

  const currentBlinkFrame = activeSlot === 'A' ? frameA : frameB;

  // Format date helper for dropdown display
  const formatDateLabel = (f: FrameItem) => {
    try {
      const d = new Date(f.time_utc);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return f.time_utc.split('T')[0];
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-4 sm:p-5 backdrop-blur-xl shadow-2xl ${className}`}
    >
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 shadow-sm">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
              Compare Epochs
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-cyan-400">
                3 Modes
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Detect proper motion, transients, or brightness variations across SPHEREx observations.
            </p>
          </div>
        </div>

        {/* 3 Compare Modes: Blink | Side by side | Difference */}
        <div className="flex items-center gap-1 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800 text-xs shadow-inner">
          <button
            onClick={() => setCompareMode('blink')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              compareMode === 'blink'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Blink</span>
          </button>

          <button
            onClick={() => setCompareMode('side-by-side')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              compareMode === 'side-by-side'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side by Side</span>
          </button>

          <button
            onClick={() => setCompareMode('difference')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              compareMode === 'difference'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Difference (B &minus; A)</span>
          </button>
        </div>
      </div>

      {/* Frame Selectors: Frame A and Frame B dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Frame A Selector */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono font-bold text-cyan-400">
              <span className="w-5 h-5 rounded-md bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-xs">
                A
              </span>
              <span>Frame A (Reference)</span>
            </span>
            <span className="font-mono text-[11px] text-zinc-400">
              {formatDateLabel(frameA)} • {frameA.wavelength_um.toFixed(2)} µm
            </span>
          </div>

          <select
            value={indexA}
            onChange={(e) => setIndexA(Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
          >
            {frames.map((f, idx) => (
              <option key={`a-${f.obs_id}-${idx}`} value={idx} className="bg-zinc-950">
                Frame #{idx + 1} — {formatDateLabel(f)} — {f.wavelength_um.toFixed(2)} µm (Det {f.detector})
              </option>
            ))}
          </select>
        </div>

        {/* Frame B Selector */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono font-bold text-amber-400">
              <span className="w-5 h-5 rounded-md bg-amber-950 border border-amber-500/50 flex items-center justify-center text-xs">
                B
              </span>
              <span>Frame B (Target Epoch)</span>
            </span>
            <span className="font-mono text-[11px] text-zinc-400">
              {formatDateLabel(frameB)} • {frameB.wavelength_um.toFixed(2)} µm
            </span>
          </div>

          <select
            value={indexB}
            onChange={(e) => setIndexB(Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono text-xs focus:outline-none focus:border-amber-500"
          >
            {frames.map((f, idx) => (
              <option key={`b-${f.obs_id}-${idx}`} value={idx} className="bg-zinc-950">
                Frame #{idx + 1} — {formatDateLabel(f)} — {f.wavelength_um.toFixed(2)} µm (Det {f.detector})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requirement 2: Wavelength difference warning */}
      {hasWavelengthMismatch && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/25 text-amber-200 text-xs shadow-md">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-300">
              These frames are at different wavelengths. Position changes are reliable, but brightness differences may be due to wavelength.
            </span>
            <span className="font-mono text-[11px] text-amber-400/80">
              Frame A: {frameA.wavelength_um.toFixed(2)} µm &nbsp;|&nbsp; Frame B: {frameB.wavelength_um.toFixed(2)} µm &nbsp;(&Delta;&lambda; = {wavelengthDiff.toFixed(2)} µm &gt; 0.10 µm)
            </span>
          </div>
        </div>
      )}

      {/* MODE 1: BLINK COMPARATOR */}
      {compareMode === 'blink' && (
        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-inner">
          {/* Top Overlays: Active Slot Indicator and Date/Wavelength Badges */}
          <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
            <span
              className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border shadow-lg backdrop-blur-md transition-colors ${
                activeSlot === 'A'
                  ? 'bg-cyan-950/90 border-cyan-500/70 text-cyan-300'
                  : 'bg-amber-950/90 border-amber-500/70 text-amber-300'
              }`}
            >
              Showing Slot {activeSlot}
            </span>

            {/* Requirement 3: Show date and wavelength on image */}
            <WavelengthBadge frame={currentBlinkFrame} />
          </div>

          {/* Quick Manual Slot Step Button + Comet Ring Toggle */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {tracking && (
              <button
                onClick={() => setShowCometPosition(!showCometPosition)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition backdrop-blur-md ${
                  showCometPosition
                    ? 'bg-cyan-950/80 border-cyan-500/70 text-cyan-300'
                    : 'border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle predicted comet position ring"
              >
                Comet Ring: {showCometPosition ? 'ON' : 'OFF'}
              </button>
            )}

            <button
              onClick={() => setActiveSlot(activeSlot === 'A' ? 'B' : 'A')}
              className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950/80 backdrop-blur-md text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-900 transition"
              title="Manually switch between Frame A and Frame B"
            >
              Toggle A / B
            </button>
          </div>

          {/* Blink Display Canvas Image */}
          <div className="relative w-full aspect-square max-h-[520px] flex items-center justify-center p-3 select-none">
            <img
              key={`blink-${currentBlinkFrame.file}-${activeSlot}`}
              src={getFrameImageUrl(targetId, currentBlinkFrame.file)}
              alt={`Blink Frame ${currentBlinkFrame.obs_id}`}
              className="max-h-[500px] max-w-full rounded-lg object-contain pointer-events-none shadow-2xl"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Predicted comet position ring (12% width at center) */}
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-cyan-300" />
                </div>
              </div>
            )}
          </div>

          {/* Blink Controls: Speed Slider (0.5 to 5.0 flips/sec) and Pause/Play */}
          <div className="w-full flex flex-wrap items-center justify-between gap-4 p-4 border-t border-zinc-900 bg-zinc-950/90 text-xs">
            {/* Play / Pause Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBlinkPaused(!isBlinkPaused)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-xs transition shadow-sm ${
                  isBlinkPaused
                    ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300 hover:bg-cyan-900'
                    : 'bg-amber-950 border-amber-500/60 text-amber-300 hover:bg-amber-900'
                }`}
              >
                {isBlinkPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Blink</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Blink</span>
                  </>
                )}
              </button>

              <div className="text-[11px] font-mono text-zinc-400">
                {isBlinkPaused ? '(Paused on Slot ' + activeSlot + ')' : '(Alternating epochs)'}
              </div>
            </div>

            {/* Requirement 1: Speed Slider (0.5 to 5 flips per second) */}
            <div className="flex items-center gap-3 flex-1 max-w-xs min-w-[200px]">
              <span className="text-zinc-400 font-mono text-[11px] shrink-0">Blink Speed:</span>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={flipsPerSec}
                onChange={(e) => setFlipsPerSec(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
              />
              <span className="font-mono text-xs font-bold text-cyan-300 min-w-[70px] text-right">
                {flipsPerSec.toFixed(1)} flips/s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: SIDE BY SIDE (WITH SYNCED ZOOM & PAN, MOBILE VERTICAL STACKING) */}
      {compareMode === 'side-by-side' && (
        <div className="flex flex-col gap-3">
          {/* Synced Zoom & Pan Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="font-semibold text-cyan-300">Synced Controls:</span>
              <span className="text-[11px] text-zinc-400">Drag either frame to pan both simultaneously</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.min(4.0, Number((z + 0.25).toFixed(2))))}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
                title="Zoom in both"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={() => setZoom((z) => Math.max(1.0, Number((z - 0.25).toFixed(2))))}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
                title="Zoom out both"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={resetZoomPan}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition font-mono text-[11px]"
                title="Reset zoom and pan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({zoom.toFixed(2)}x)</span>
              </button>

              {tracking && (
                <button
                  onClick={() => setShowCometPosition(!showCometPosition)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition ${
                    showCometPosition
                      ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Toggle predicted comet position ring"
                >
                  Comet Ring: {showCometPosition ? 'ON' : 'OFF'}
                </button>
              )}

              <button
                onClick={() => setShowReticle(!showReticle)}
                className={`p-1.5 rounded-lg border transition ${
                  showReticle
                    ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle celestial reticle"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Requirement 4: Responsive mobile layout: grid-cols-1 on narrow screens, md:grid-cols-2 */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Frame A Pane */}
            <div className="relative flex flex-col rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-lg select-none">
              {/* Header Badge: Date and Wavelength for Frame A */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-500/70 text-cyan-300">
                  Epoch A
                </span>
                {/* Requirement 3: Date and wavelength shown on image */}
                <WavelengthBadge frame={frameA} />
              </div>

              {/* Pannable & Zoomable Image Area */}
              <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`relative w-full aspect-square flex items-center justify-center overflow-hidden p-2 ${
                  zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                }`}
              >
                <div
                  className="relative flex items-center justify-center transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                >
                  <img
                    src={getFrameImageUrl(targetId, frameA.file)}
                    alt={`Epoch A ${frameA.obs_id}`}
                    className="max-h-[460px] max-w-full rounded object-contain pointer-events-none"
                    style={{ imageRendering: 'pixelated' }}
                  />

                  {/* Predicted comet position ring (12% width at center) */}
                  {tracking && showCometPosition && (
                    <div
                      className="absolute pointer-events-none rounded-full border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] z-10"
                      style={{
                        width: '12%',
                        height: '12%',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}

                  {showReticle && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-full h-px bg-cyan-400/40" />
                      <div className="absolute h-full w-px bg-cyan-400/40" />
                      <div className="absolute w-12 h-12 rounded-full border border-cyan-400/40" />
                    </div>
                  )}
                </div>
              </div>

              <div className="px-3 py-1.5 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>{frameA.obs_id}</span>
                <span>λ = {frameA.wavelength_um.toFixed(2)} µm</span>
              </div>
            </div>

            {/* Frame B Pane */}
            <div className="relative flex flex-col rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-lg select-none">
              {/* Header Badge: Date and Wavelength for Frame B */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-500/70 text-amber-300">
                  Epoch B
                </span>
                {/* Requirement 3: Date and wavelength shown on image */}
                <WavelengthBadge frame={frameB} />
              </div>

              {/* Pannable & Zoomable Image Area (Synced with Frame A) */}
              <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`relative w-full aspect-square flex items-center justify-center overflow-hidden p-2 ${
                  zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                }`}
              >
                <div
                  className="relative flex items-center justify-center transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                >
                  <img
                    src={getFrameImageUrl(targetId, frameB.file)}
                    alt={`Epoch B ${frameB.obs_id}`}
                    className="max-h-[460px] max-w-full rounded object-contain pointer-events-none"
                    style={{ imageRendering: 'pixelated' }}
                  />

                  {/* Predicted comet position ring (12% width at center) */}
                  {tracking && showCometPosition && (
                    <div
                      className="absolute pointer-events-none rounded-full border border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] z-10"
                      style={{
                        width: '12%',
                        height: '12%',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}

                  {showReticle && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-full h-px bg-amber-400/40" />
                      <div className="absolute h-full w-px bg-amber-400/40" />
                      <div className="absolute w-12 h-12 rounded-full border border-amber-400/40" />
                    </div>
                  )}
                </div>
              </div>

              <div className="px-3 py-1.5 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>{frameB.obs_id}</span>
                <span>λ = {frameB.wavelength_um.toFixed(2)} µm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: DIFFERENCE (B MINUS A COMPUTED ON CANVAS) */}
      {compareMode === 'difference' && (
        <div className="flex flex-col gap-3">
          {/* Controls Bar for Difference Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-xs">
            {/* Color Palette Toggle: Diverging vs Grayscale */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                Color Mode:
              </span>
              <div className="flex items-center gap-1 bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                <button
                  onClick={() => setDiffColorMode('diverging')}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    diffColorMode === 'diverging'
                      ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/50'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Diverging (Blue ↔ Red)
                </button>
                <button
                  onClick={() => setDiffColorMode('grayscale')}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    diffColorMode === 'grayscale'
                      ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/50'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Grayscale (Neutral 128)
                </button>
              </div>
            </div>

            {/* Contrast / Gain Slider */}
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400 font-mono text-[11px]">Contrast Gain:</span>
              {[1.0, 1.5, 2.5, 4.0].map((gain) => (
                <button
                  key={gain}
                  onClick={() => setDiffGain(gain)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                    diffGain === gain
                      ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {gain}x
                </button>
              ))}
            </div>
          </div>

          {/* Main Difference Canvas Container */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-2xl p-2 select-none min-h-[460px]">
            {/* Requirement 3: Show date and wavelength of both images */}
            <div className="absolute top-3 left-3 z-20 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-zinc-800 text-xs font-mono backdrop-blur-md shadow-lg">
                <span className="text-amber-400 font-bold">B</span>
                <span className="text-zinc-400">({formatDateLabel(frameB)}, {frameB.wavelength_um.toFixed(2)}µm)</span>
                <span className="text-zinc-500 font-bold">&minus;</span>
                <span className="text-cyan-400 font-bold">A</span>
                <span className="text-zinc-400">({formatDateLabel(frameA)}, {frameA.wavelength_um.toFixed(2)}µm)</span>
              </div>
            </div>

            {/* Loading / Error states */}
            {diffLoading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-2 text-cyan-400 text-xs font-mono">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Computing pixel-wise difference (B &minus; A)...</span>
              </div>
            )}

            {diffError ? (
              <div className="flex flex-col items-center gap-2 text-red-400 text-xs p-6 text-center">
                <AlertTriangle className="w-6 h-6" />
                <span>{diffError}</span>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="max-h-[500px] max-w-full rounded-lg object-contain shadow-2xl"
                style={{ imageRendering: 'pixelated' }}
              />
            )}

            {/* Scientific Colormap Legend */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 mt-2 border-t border-zinc-900 bg-zinc-950/80 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-zinc-400">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Difference Interpretation:</span>
              </div>

              {diffColorMode === 'diverging' ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                    <span className="text-blue-300">Fainter in B (&minus;)</span>
                  </div>
                  <span className="text-zinc-600">|</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700 inline-block" />
                    <span className="text-zinc-400">No Change (0)</span>
                  </div>
                  <span className="text-zinc-600">|</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                    <span className="text-red-300">Brighter in B (+)</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Black: Fainter in B</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400">Gray (128): Stationary background</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-100">White: Brighter in B</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
