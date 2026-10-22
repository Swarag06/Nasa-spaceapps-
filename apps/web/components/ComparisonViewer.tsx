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
  Download,
  Check,
} from 'lucide-react';
import {
  downloadImageUrl,
  downloadCanvas,
  downloadSideBySideMontage,
  sanitizeFilename,
} from '../lib/download';

interface ComparisonViewerProps {
  targetId: string;
  targetTitle?: string;
  frames: FrameItem[];
  tracking?: boolean;
  className?: string;
}

type CompareMode = 'blink' | 'side-by-side' | 'difference';
type DiffColorMode = 'diverging' | 'grayscale';

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  targetId,
  targetTitle,
  frames,
  tracking = false,
  className = '',
}) => {
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(Math.min(frames.length - 1, 1));
  const [compareMode, setCompareMode] = useState<CompareMode>('blink');

  // Toggle for predicted comet position ring (default ON for tracking targets)
  const [showCometPosition, setShowCometPosition] = useState<boolean>(true);

  // Check prefers-reduced-motion to turn off auto-play blinking
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Blink mode state: flips per second between 0.5 and 5.0. Paused by default if user prefers reduced motion
  const [flipsPerSec, setFlipsPerSec] = useState<number>(2.0);
  const [isBlinkPaused, setIsBlinkPaused] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');

  // Listen to prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);
    if (mql.matches) {
      setIsBlinkPaused(true);
    }
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) {
        setIsBlinkPaused(true);
      }
    };
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  // Keyboard navigation for Comparison mode: ArrowLeft/ArrowRight to toggle slots in Blink, or Space to pause/resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if (isInput) return;

      if (compareMode === 'blink') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setActiveSlot('A');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setActiveSlot('B');
        } else if (e.key === ' ') {
          e.preventDefault();
          setIsBlinkPaused((prev) => !prev);
        }
      } else if (compareMode === 'side-by-side') {
        const step = 20;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setPan((p) => ({ ...p, y: p.y + step }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setPan((p) => ({ ...p, y: p.y - step }));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setPan((p) => ({ ...p, x: p.x + step }));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setPan((p) => ({ ...p, x: p.x - step }));
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          setZoom((z) => Math.min(4.0, Number((z + 0.25).toFixed(2))));
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setZoom((z) => Math.max(1.0, Number((z - 0.25).toFixed(2))));
        } else if (e.key === '0' || e.key === 'r') {
          e.preventDefault();
          resetZoomPan();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [compareMode]);

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

    let triedProxyA = false;
    let triedProxyB = false;

    const onError = () => {
      setDiffError('Failed to load frames for difference calculation.');
      setDiffLoading(false);
    };

    imgA.onload = onLoaded;
    imgA.onerror = () => {
      if (!triedProxyA) {
        triedProxyA = true;
        imgA.src = `/remote-frames/${targetId}/${frameA.file}`;
      } else {
        onError();
      }
    };

    imgB.onload = onLoaded;
    imgB.onerror = () => {
      if (!triedProxyB) {
        triedProxyB = true;
        imgB.src = `/remote-frames/${targetId}/${frameB.file}`;
      } else {
        onError();
      }
    };

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

  const initialTouchDistRef = useRef<number | null>(null);
  const initialTouchZoomRef = useRef<number>(1.0);

  // Touch handlers for mobile pinch-to-zoom and pan sync
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialTouchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchZoomRef.current = zoom;
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistRef.current) {
      if (e.cancelable) e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialTouchDistRef.current;
      const newZoom = Math.min(4.0, Math.max(1.0, Number((initialTouchZoomRef.current * ratio).toFixed(2))));
      setZoom(newZoom);
    } else if (isDragging && e.touches.length === 1 && zoom > 1.0) {
      if (e.cancelable) e.preventDefault();
      const maxPan = 180 * (zoom - 1);
      const newX = Math.min(maxPan, Math.max(-maxPan, e.touches[0].clientX - dragStart.x));
      const newY = Math.min(maxPan, Math.max(-maxPan, e.touches[0].clientY - dragStart.y));
      setPan({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialTouchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
    if (zoom <= 1.05) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    }
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

  // Download states for each mode
  const [downloadingSlot, setDownloadingSlot] = useState<string | null>(null);
  const [downloadSuccessSlot, setDownloadSuccessSlot] = useState<string | null>(null);

  const notifyDownloadSuccess = (slot: string) => {
    setDownloadSuccessSlot(slot);
    setTimeout(() => {
      setDownloadSuccessSlot((prev) => (prev === slot ? null : prev));
    }, 2200);
  };

  // Download active blink frame (Slot A or B)
  const handleDownloadBlinkFrame = async () => {
    const slot = activeSlot;
    const f = slot === 'A' ? frameA : frameB;
    if (!f || downloadingSlot) return;
    setDownloadingSlot(`blink-${slot}`);
    try {
      const filename = sanitizeFilename([
        'spherex',
        targetId,
        `epoch-${slot.toLowerCase()}`,
        f.obs_id || f.time_utc?.slice(0, 10),
        `${f.wavelength_um.toFixed(2)}um`,
      ]);
      await downloadImageUrl(getFrameImageUrl(targetId, f.file), filename);
      notifyDownloadSuccess(`blink-${slot}`);
    } catch (e) {
      console.error('Download blink frame error:', e);
    } finally {
      setDownloadingSlot(null);
    }
  };

  // Download individual frame A or B
  const handleDownloadFrame = async (slot: 'A' | 'B') => {
    const f = slot === 'A' ? frameA : frameB;
    if (!f || downloadingSlot) return;
    setDownloadingSlot(slot);
    try {
      const filename = sanitizeFilename([
        'spherex',
        targetId,
        `epoch-${slot.toLowerCase()}`,
        f.obs_id || f.time_utc?.slice(0, 10),
        `${f.wavelength_um.toFixed(2)}um`,
      ]);
      await downloadImageUrl(getFrameImageUrl(targetId, f.file), filename);
      notifyDownloadSuccess(slot);
    } catch (e) {
      console.error('Download frame error:', e);
    } finally {
      setDownloadingSlot(null);
    }
  };

  // Download Side-by-Side Dual Montage
  const handleDownloadSideBySide = async () => {
    if (!frameA || !frameB || downloadingSlot) return;
    setDownloadingSlot('side-by-side');
    try {
      const filename = sanitizeFilename([
        'spherex',
        targetId,
        'comparison',
        'epoch-a-and-b',
        `${frameA.wavelength_um.toFixed(2)}um-vs-${frameB.wavelength_um.toFixed(2)}um`,
      ]);
      await downloadSideBySideMontage({
        imgAUrl: getFrameImageUrl(targetId, frameA.file),
        imgBUrl: getFrameImageUrl(targetId, frameB.file),
        targetTitle: targetTitle || targetId,
        labelA: formatDateLabel(frameA),
        metaA: `Obs ${frameA.obs_id} • λ = ${frameA.wavelength_um.toFixed(2)} µm`,
        labelB: formatDateLabel(frameB),
        metaB: `Obs ${frameB.obs_id} • λ = ${frameB.wavelength_um.toFixed(2)} µm`,
        filename,
      });
      notifyDownloadSuccess('side-by-side');
    } catch (e) {
      console.error('Download side-by-side montage error:', e);
    } finally {
      setDownloadingSlot(null);
    }
  };

  // Download Difference Canvas
  const handleDownloadDiffCanvas = async () => {
    if (!canvasRef.current || downloadingSlot) return;
    setDownloadingSlot('diff');
    try {
      const filename = sanitizeFilename([
        'spherex',
        targetId,
        'difference',
        'b-minus-a',
        `${frameB.obs_id}-minus-${frameA.obs_id}`,
        `${diffColorMode}`,
      ]);
      await downloadCanvas(canvasRef.current, filename);
      notifyDownloadSuccess('diff');
    } catch (e) {
      console.error('Download difference canvas error:', e);
    } finally {
      setDownloadingSlot(null);
    }
  };

  return (
    <div
      className={`comparison-container flex flex-col gap-4 rounded-none sm:rounded-2xl border-y sm:border border-zinc-800/80 bg-zinc-950/90 p-3 sm:p-5 backdrop-blur-xl shadow-2xl ${className}`}
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

        {/* 3 Compare Modes: Blink | Side by side | Difference (All min-h-[44px]) */}
        <div role="tablist" aria-label="Comparison Modes" className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 rounded-xl bg-zinc-900/90 p-1 border border-zinc-700 text-xs shadow-inner">
          <button
            data-tour="blink-mode"
            role="tab"
            aria-selected={compareMode === 'blink'}
            onClick={() => setCompareMode('blink')}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition active:scale-95 ${
              compareMode === 'blink'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-cyan-300" aria-hidden="true" />
            <span>Blink</span>
          </button>

          <button
            role="tab"
            aria-selected={compareMode === 'side-by-side'}
            onClick={() => setCompareMode('side-by-side')}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition active:scale-95 ${
              compareMode === 'side-by-side'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <Columns className="w-4 h-4 text-cyan-300" aria-hidden="true" />
            <span className="truncate">Side by Side</span>
          </button>

          <button
            data-tour="difference-mode"
            role="tab"
            aria-selected={compareMode === 'difference'}
            onClick={() => setCompareMode('difference')}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition active:scale-95 ${
              compareMode === 'difference'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <MinusCircle className="w-4 h-4 text-cyan-300" aria-hidden="true" />
            <span className="truncate">Diff (B&minus;A)</span>
          </button>
        </div>
      </div>

      {/* Frame Selectors: Frame A and Frame B dropdowns (All min-h-[44px]) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Frame A Selector */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-zinc-700 bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <label htmlFor="frame-a-select" className="flex items-center gap-1.5 font-mono font-bold text-cyan-300">
              <span className="w-5 h-5 rounded-md bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-xs text-cyan-200" aria-hidden="true">
                A
              </span>
              <span>Frame A (Reference)</span>
            </label>
            <span className="font-mono text-[11px] text-zinc-300">
              {formatDateLabel(frameA)} • {frameA.wavelength_um.toFixed(2)} µm
            </span>
          </div>

          <select
            id="frame-a-select"
            value={indexA}
            onChange={(e) => setIndexA(Number(e.target.value))}
            aria-label="Select reference Frame A by observation date and wavelength"
            className="w-full min-h-[44px] bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {frames.map((f, idx) => (
              <option key={`a-${f.obs_id}-${idx}`} value={idx} className="bg-zinc-950 text-zinc-200">
                Frame #{idx + 1} — {formatDateLabel(f)} — {f.wavelength_um.toFixed(2)} µm (Det {f.detector})
              </option>
            ))}
          </select>
        </div>

        {/* Frame B Selector */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-zinc-700 bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <label htmlFor="frame-b-select" className="flex items-center gap-1.5 font-mono font-bold text-amber-300">
              <span className="w-5 h-5 rounded-md bg-amber-950 border border-amber-500/60 flex items-center justify-center text-xs text-amber-200" aria-hidden="true">
                B
              </span>
              <span>Frame B (Target Epoch)</span>
            </label>
            <span className="font-mono text-[11px] text-zinc-300">
              {formatDateLabel(frameB)} • {frameB.wavelength_um.toFixed(2)} µm
            </span>
          </div>

          <select
            id="frame-b-select"
            value={indexB}
            onChange={(e) => setIndexB(Number(e.target.value))}
            aria-label="Select target Frame B by observation date and wavelength"
            className="w-full min-h-[44px] bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {frames.map((f, idx) => (
              <option key={`b-${f.obs_id}-${idx}`} value={idx} className="bg-zinc-950 text-zinc-200">
                Frame #{idx + 1} — {formatDateLabel(f)} — {f.wavelength_um.toFixed(2)} µm (Det {f.detector})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requirement 2: Wavelength difference warning */}
      {hasWavelengthMismatch && (
        <div role="alert" className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/50 bg-amber-950/30 text-amber-200 text-xs shadow-md">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-200">
              Warning: These frames are at different wavelengths. Position changes are reliable, but brightness differences may be due to wavelength.
            </span>
            <span className="font-mono text-[11px] text-amber-300">
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
                  ? 'bg-cyan-950/90 border-cyan-500/70 text-cyan-200'
                  : 'bg-amber-950/90 border-amber-500/70 text-amber-200'
              }`}
            >
              Showing Slot {activeSlot} ({activeSlot === 'A' ? 'Reference' : 'Target Epoch'})
            </span>

            {/* Requirement 3: Show date and wavelength on image */}
            <WavelengthBadge frame={currentBlinkFrame} />
          </div>

          {/* Quick Manual Slot Step Button + Comet Ring Toggle (All min-h-[44px]) */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {tracking && (
              <button
                onClick={() => setShowCometPosition(!showCometPosition)}
                aria-pressed={showCometPosition}
                aria-label={
                  showCometPosition
                    ? `Hide predicted ${targetTitle?.toLowerCase().includes('vesta') ? 'asteroid' : 'comet'} position ring`
                    : `Show predicted ${targetTitle?.toLowerCase().includes('vesta') ? 'asteroid' : 'comet'} position ring`
                }
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-mono transition backdrop-blur-md active:scale-95 ${
                  showCometPosition
                    ? 'bg-cyan-950/90 border-cyan-500/70 text-cyan-200 ring-1 ring-cyan-500/30'
                    : 'border-zinc-700 bg-zinc-950/80 text-zinc-300 hover:text-white'
                }`}
              >
                Ring: {showCometPosition ? 'ON' : 'OFF'}
              </button>
            )}

            <button
              onClick={() => setActiveSlot(activeSlot === 'A' ? 'B' : 'A')}
              aria-label={`Switch between Frame A and Frame B. Currently showing slot ${activeSlot}. (Use ArrowLeft or ArrowRight key)`}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-950/90 backdrop-blur-md text-xs font-mono text-zinc-200 hover:text-white hover:bg-zinc-900 active:scale-95 transition shadow-sm"
              title="Manually switch between Frame A and Frame B (Arrow Left/Right)"
            >
              Toggle A / B
            </button>

            <button
              onClick={handleDownloadBlinkFrame}
              disabled={Boolean(downloadingSlot)}
              aria-label={`Download currently visible frame (Slot ${activeSlot}) as PNG`}
              title={`Download Slot ${activeSlot} Frame (PNG)`}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950/90 backdrop-blur-md text-xs font-mono text-zinc-200 hover:text-white hover:bg-zinc-900 active:scale-95 transition shadow-sm flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {downloadSuccessSlot === `blink-${activeSlot}` ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Saved</span>
                </>
              ) : downloadingSlot === `blink-${activeSlot}` ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span className="text-cyan-300">Saving...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                  <span className="hidden xs:inline">Save Slot {activeSlot}</span>
                </>
              )}
            </button>
          </div>

          {/* Blink Display Canvas Image with Pinch-Zoom & Pan support */}
          <div
            tabIndex={0}
            role="region"
            aria-label={`Blink comparator viewport for ${targetTitle || targetId}. Slot ${activeSlot} active. Press Space to pause or resume, Left/Right arrows to toggle.`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-full aspect-square max-h-[520px] flex items-center justify-center p-0 sm:p-2 select-none touch-none overflow-hidden cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <div
              className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              <img
                key={`blink-${currentBlinkFrame.file}-${activeSlot}`}
                src={getFrameImageUrl(targetId, currentBlinkFrame.file)}
                alt={`Blink comparison slot ${activeSlot} (${activeSlot === 'A' ? 'Reference Epoch A' : 'Target Epoch B'}): ${targetTitle || targetId}, time: ${
                  currentBlinkFrame.time_utc
                    ? new Date(currentBlinkFrame.time_utc).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                    : 'Unknown date'
                }, wavelength: ${currentBlinkFrame.wavelength_um.toFixed(2)} µm`}
                className="w-full h-full object-contain pointer-events-none shadow-2xl"
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
                  title={
                    targetTitle?.toLowerCase().includes('vesta')
                      ? 'Predicted asteroid position'
                      : 'Predicted comet position'
                  }
                  aria-label={
                    targetTitle?.toLowerCase().includes('vesta')
                      ? 'Predicted asteroid position'
                      : 'Predicted comet position'
                  }
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-cyan-300" />
                  </div>
                </div>
              )}
            </div>

            {/* Pinch-zoom indicator on mobile if not zoomed */}
            {zoom === 1.0 && (
              <div className="sm:hidden absolute bottom-2 right-2 pointer-events-none bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 border border-zinc-700">
                Pinch / Double-tap to zoom
              </div>
            )}
          </div>

          {/* Blink Controls: Speed Slider (0.5 to 5.0 flips/sec) and Pause/Play (min-h-[44px]) */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-zinc-900 bg-zinc-950/90 text-xs">
            {/* Play / Pause Button (44px) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBlinkPaused(!isBlinkPaused)}
                aria-label={isBlinkPaused ? "Resume blinking alternate frames (Space key)" : "Pause blinking (Space key)"}
                className={`min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl border font-semibold text-xs transition shadow-md active:scale-95 ${
                  isBlinkPaused
                    ? 'bg-cyan-950 border-cyan-500/60 text-cyan-200 hover:bg-cyan-900'
                    : 'bg-amber-950 border-amber-500/60 text-amber-200 hover:bg-amber-900'
                }`}
              >
                {isBlinkPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                    <span>Resume Blink</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
                    <span>Pause Blink</span>
                  </>
                )}
              </button>

              <div className="text-[11px] font-mono text-zinc-300 hidden xs:inline">
                {isBlinkPaused ? '(Paused)' : '(Blinking)'}
              </div>

              {/* Prefers-reduced-motion notification */}
              {prefersReducedMotion && (
                <span className="text-[10px] font-mono text-cyan-200 bg-cyan-950/90 border border-cyan-500/50 px-2 py-1 rounded">
                  Reduced motion: Auto-blink off
                </span>
              )}
            </div>

            {/* Speed Slider with 44px touch container */}
            <div className="flex items-center gap-2 flex-1 max-w-xs min-w-[170px] min-h-[44px]">
              <span className="text-zinc-300 font-mono text-[11px] shrink-0 font-medium">Speed:</span>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={flipsPerSec}
                onChange={(e) => setFlipsPerSec(parseFloat(e.target.value))}
                aria-label="Blink speed in flips per second"
                aria-valuemin={0.5}
                aria-valuemax={5.0}
                aria-valuenow={flipsPerSec}
                aria-valuetext={`${flipsPerSec.toFixed(1)} flips per second`}
                className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              />
              <span className="font-mono text-xs font-bold text-cyan-300 min-w-[65px] text-right">
                {flipsPerSec.toFixed(1)}/s
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
              <span className="text-[11px] text-zinc-300">Drag either frame to pan both simultaneously</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4.0, Number((z + 0.25).toFixed(2))))}
                aria-label="Zoom in both frames"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                title="Zoom in both"
              >
                <ZoomIn className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1.0, Number((z - 0.25).toFixed(2))))}
                aria-label="Zoom out both frames"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                title="Zoom out both"
              >
                <ZoomOut className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={resetZoomPan}
                aria-label={`Reset zoom and pan, currently at ${zoom.toFixed(2)}x`}
                className="min-h-[44px] px-3 flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white active:scale-95 transition font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                title="Reset zoom and pan"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset ({zoom.toFixed(2)}x)</span>
              </button>

              {tracking && (
                <button
                  type="button"
                  onClick={() => setShowCometPosition(!showCometPosition)}
                  aria-pressed={showCometPosition}
                  aria-label={showCometPosition ? 'Hide predicted comet position ring' : 'Show predicted comet position ring'}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-mono transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    showCometPosition
                      ? 'bg-cyan-950 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-500/30'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white'
                  }`}
                  title="Toggle predicted comet position ring"
                >
                  Ring: {showCometPosition ? 'ON' : 'OFF'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowReticle(!showReticle)}
                aria-pressed={showReticle}
                aria-label={showReticle ? 'Hide celestial coordinate reticle' : 'Show celestial coordinate reticle'}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  showReticle
                    ? 'bg-cyan-950 border-cyan-500/60 text-cyan-200'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white'
                }`}
                title="Toggle celestial reticle"
              >
                <Crosshair className="w-4 h-4" aria-hidden="true" />
              </button>

              {/* Side-by-Side Dual Montage Export Button */}
              <button
                type="button"
                onClick={handleDownloadSideBySide}
                disabled={Boolean(downloadingSlot)}
                aria-label="Download combined side-by-side comparison montage image (Epoch A and Epoch B with metadata)"
                title="Download Dual Comparison Montage (PNG)"
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-cyan-500/50 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 hover:text-white active:scale-95 transition font-semibold text-xs flex items-center gap-1.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {downloadSuccessSlot === 'side-by-side' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">Montage Saved</span>
                  </>
                ) : downloadingSlot === 'side-by-side' ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    <span className="text-cyan-300">Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                    <span>Export Montage (A+B)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Requirement 4: Responsive mobile layout: grid-cols-1 on narrow screens, md:grid-cols-2 */}
          <div
            className="side-by-side-grid grid grid-cols-1 md:grid-cols-2 gap-4"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Frame A Pane */}
            <div className="side-by-side-pane relative flex flex-col rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-lg select-none">
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
                className={`relative w-full aspect-square flex items-center justify-center overflow-hidden p-0 sm:p-2 ${
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
                    alt={`Side-by-side Epoch A reference observation of ${targetTitle || targetId}, time: ${
                      frameA.time_utc
                        ? new Date(frameA.time_utc).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                        : 'Unknown date'
                    }, wavelength: ${frameA.wavelength_um.toFixed(2)} µm`}
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

              <div className="px-3 py-2 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between text-[11px] font-mono text-zinc-300">
                <div className="flex items-center gap-2">
                  <span>{frameA.obs_id}</span>
                  <span>λ = {frameA.wavelength_um.toFixed(2)} µm</span>
                </div>

                <button
                  onClick={() => handleDownloadFrame('A')}
                  disabled={Boolean(downloadingSlot)}
                  aria-label="Download Epoch A observation frame"
                  title="Download Epoch A (PNG)"
                  className="min-h-[44px] px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white flex items-center gap-1.5 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {downloadSuccessSlot === 'A' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-[10px] text-emerald-300">Saved</span>
                    </>
                  ) : downloadingSlot === 'A' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      <span className="text-[10px] text-cyan-300">Saving</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                      <span>Save Frame A</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Frame B Pane */}
            <div className="side-by-side-pane relative flex flex-col rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-lg select-none">
              {/* Header Badge: Date and Wavelength for Frame B */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-500/70 text-amber-300 font-semibold">
                  Epoch B
                </span>
                {/* Requirement 3: Date and wavelength shown on image */}
                <WavelengthBadge frame={frameB} />
              </div>

              {/* Pannable & Zoomable Image Area (Synced with Frame A) */}
              <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`relative w-full aspect-square flex items-center justify-center overflow-hidden p-0 sm:p-2 ${
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
                    alt={`Side-by-side Epoch B target observation of ${targetTitle || targetId}, time: ${
                      frameB.time_utc
                        ? new Date(frameB.time_utc).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                        : 'Unknown date'
                    }, wavelength: ${frameB.wavelength_um.toFixed(2)} µm`}
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

              <div className="px-3 py-2 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between text-[11px] font-mono text-zinc-300">
                <div className="flex items-center gap-2">
                  <span>{frameB.obs_id}</span>
                  <span>λ = {frameB.wavelength_um.toFixed(2)} µm</span>
                </div>

                <button
                  onClick={() => handleDownloadFrame('B')}
                  disabled={Boolean(downloadingSlot)}
                  aria-label="Download Epoch B observation frame"
                  title="Download Epoch B (PNG)"
                  className="min-h-[44px] px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white flex items-center gap-1.5 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  {downloadSuccessSlot === 'B' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-[10px] text-emerald-300">Saved</span>
                    </>
                  ) : downloadingSlot === 'B' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      <span className="text-[10px] text-amber-300">Saving</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                      <span>Save Frame B</span>
                    </>
                  )}
                </button>
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
              <div className="flex items-center gap-1 bg-zinc-950 rounded-xl p-1 border border-zinc-800" role="group" aria-label="Difference Color Mode">
                <button
                  type="button"
                  onClick={() => setDiffColorMode('diverging')}
                  aria-pressed={diffColorMode === 'diverging'}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    diffColorMode === 'diverging'
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Diverging (Blue ↔ Red)
                </button>
                <button
                  type="button"
                  onClick={() => setDiffColorMode('grayscale')}
                  aria-pressed={diffColorMode === 'grayscale'}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    diffColorMode === 'grayscale'
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Grayscale (Neutral 128)
                </button>
              </div>
            </div>

            {/* Contrast / Gain Buttons (All min-h-[44px]) */}
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span className="text-zinc-300 font-mono text-xs font-medium">Gain:</span>
              <div className="flex items-center gap-1" role="group" aria-label="Difference Gain Presets">
                {[1.0, 1.5, 2.5, 4.0].map((gain) => (
                  <button
                    key={gain}
                    type="button"
                    onClick={() => setDiffGain(gain)}
                    aria-pressed={diffGain === gain}
                    aria-label={`Set difference gain to ${gain}x`}
                    className={`min-h-[44px] min-w-[40px] px-2.5 rounded-xl text-xs font-mono font-semibold border flex items-center justify-center transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      diffGain === gain
                        ? 'bg-cyan-950 border-cyan-500/70 text-cyan-200 shadow-md'
                        : 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {gain}x
                  </button>
                ))}
              </div>
            </div>

            {/* Download Difference Map Button */}
            <button
              type="button"
              onClick={handleDownloadDiffCanvas}
              disabled={Boolean(downloadingSlot) || diffLoading || Boolean(diffError)}
              aria-label="Download pixel difference map as PNG image"
              title="Download Difference Map (PNG)"
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-cyan-500/50 bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 hover:text-white active:scale-95 transition font-semibold text-xs flex items-center gap-1.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {downloadSuccessSlot === 'diff' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Diff Map Saved</span>
                </>
              ) : downloadingSlot === 'diff' ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span className="text-cyan-300">Saving Map...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                  <span>Download Difference Map</span>
                </>
              )}
            </button>
          </div>

          {/* Main Difference Canvas Container */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-2xl p-2 select-none min-h-[460px]">
            {/* Requirement 3: Show date and wavelength of both images & quick download */}
            <div className="absolute top-3 left-3 z-20 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-zinc-700 text-xs font-mono backdrop-blur-md shadow-lg">
                <span className="text-amber-300 font-bold">B</span>
                <span className="text-zinc-300">({formatDateLabel(frameB)}, {frameB.wavelength_um.toFixed(2)}µm)</span>
                <span className="text-zinc-400 font-bold" aria-hidden="true">&minus;</span>
                <span className="text-cyan-300 font-bold">A</span>
                <span className="text-zinc-300">({formatDateLabel(frameA)}, {frameA.wavelength_um.toFixed(2)}µm)</span>
              </div>
            </div>

            {/* Quick Canvas Download Button in Top-Right */}
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={handleDownloadDiffCanvas}
                disabled={Boolean(downloadingSlot) || diffLoading || Boolean(diffError)}
                aria-label="Download this difference map"
                title="Download Difference Map (PNG)"
                className="min-h-[44px] px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950/90 backdrop-blur-md text-xs font-mono text-zinc-200 hover:text-white hover:bg-zinc-900 active:scale-95 transition shadow-sm flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {downloadSuccessSlot === 'diff' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">Saved</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                    <span className="hidden sm:inline">Save Map</span>
                  </>
                )}
              </button>
            </div>

            {/* Loading / Error states */}
            {diffLoading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-2 text-cyan-400 text-xs font-mono">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span>Computing pixel-wise difference (B &minus; A)...</span>
              </div>
            )}

            {diffError ? (
              <div className="flex flex-col items-center gap-2 text-red-400 text-xs p-6 text-center">
                <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                <span>{diffError}</span>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                tabIndex={0}
                role="img"
                aria-label={`Pixel difference image (Epoch B minus Epoch A) for ${targetTitle || targetId}. Epoch B observed at ${
                  frameB.time_utc
                    ? new Date(frameB.time_utc).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                    : 'Unknown'
                }, wavelength ${frameB.wavelength_um.toFixed(2)} µm; Epoch A observed at ${
                  frameA.time_utc
                    ? new Date(frameA.time_utc).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                    : 'Unknown'
                }, wavelength ${frameA.wavelength_um.toFixed(2)} µm.`}
                className="max-h-[500px] max-w-full rounded-lg object-contain shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                style={{ imageRendering: 'pixelated' }}
              />
            )}

            {/* Scientific Colormap Legend */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 mt-2 border-t border-zinc-900 bg-zinc-950/80 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                <span>Difference Interpretation:</span>
              </div>

              {diffColorMode === 'diverging' ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" aria-hidden="true" />
                    <span className="text-blue-300">Fainter in B (&minus;)</span>
                  </div>
                  <span className="text-zinc-400" aria-hidden="true">|</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-600 inline-block" aria-hidden="true" />
                    <span className="text-zinc-300">No Change (0)</span>
                  </div>
                  <span className="text-zinc-400" aria-hidden="true">|</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" aria-hidden="true" />
                    <span className="text-red-300">Brighter in B (+)</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-300">Black: Fainter in B (&minus;)</span>
                  <span className="text-zinc-400" aria-hidden="true">|</span>
                  <span className="text-zinc-200">Gray (128): Stationary background (0)</span>
                  <span className="text-zinc-400" aria-hidden="true">|</span>
                  <span className="text-zinc-100">White: Brighter in B (+)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
