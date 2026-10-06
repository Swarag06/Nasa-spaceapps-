import React, { useState, useEffect, useRef } from 'react';
import { FrameItem } from '../lib/types';
import { getFrameImageUrl } from '../lib/api';
import { WavelengthBadge } from './WavelengthBadge';
import { Flame, Play, Pause, ArrowLeftRight, Columns } from 'lucide-react';

interface ComparisonViewerProps {
  targetId: string;
  frames: FrameItem[];
  className?: string;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  targetId,
  frames,
  className = '',
}) => {
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(Math.min(frames.length - 1, 1));
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [isBlinking, setIsBlinking] = useState(true);
  const [blinkSpeedMs, setBlinkSpeedMs] = useState(400); // 400ms classic astronomical blink rate
  const [viewMode, setViewMode] = useState<'blink' | 'side-by-side'>('blink');

  const blinkTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isBlinking || viewMode !== 'blink') {
      if (blinkTimerRef.current) clearInterval(blinkTimerRef.current);
      return;
    }

    blinkTimerRef.current = window.setInterval(() => {
      setActiveSlot((prev) => (prev === 'A' ? 'B' : 'A'));
    }, blinkSpeedMs);

    return () => {
      if (blinkTimerRef.current) clearInterval(blinkTimerRef.current);
    };
  }, [isBlinking, blinkSpeedMs, viewMode]);

  if (frames.length < 2) {
    return (
      <div className="p-8 text-center text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/60">
        At least 2 frames required for comparison.
      </div>
    );
  }

  const frameA = frames[indexA] || frames[0];
  const frameB = frames[indexB] || frames[1];
  const currentBlinkFrame = activeSlot === 'A' ? frameA : frameB;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-4 backdrop-blur-xl ${className}`}
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Blink Comparator</h3>
            <p className="text-[11px] text-zinc-400">
              Alternate multi-epoch frames to spot moving solar system bodies or transients.
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Blink vs Side-by-Side */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800 text-xs">
          <button
            onClick={() => setViewMode('blink')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
              viewMode === 'blink'
                ? 'bg-cyan-950 text-cyan-300 font-medium border border-cyan-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Blink Mode</span>
          </button>

          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
              viewMode === 'side-by-side'
                ? 'bg-cyan-950 text-cyan-300 font-medium border border-cyan-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side by Side</span>
          </button>
        </div>
      </div>

      {/* Frame Selectors (Epoch A & Epoch B) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50">
          <span className="font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40">
            A
          </span>
          <select
            value={indexA}
            onChange={(e) => setIndexA(Number(e.target.value))}
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none"
          >
            {frames.map((f, idx) => (
              <option key={`a-${f.obs_id}`} value={idx} className="bg-zinc-900">
                Frame #{idx + 1} ({f.obs_id}) - {f.wavelength_um}µm - {f.time_utc.split('T')[0]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50">
          <span className="font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40">
            B
          </span>
          <select
            value={indexB}
            onChange={(e) => setIndexB(Number(e.target.value))}
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none"
          >
            {frames.map((f, idx) => (
              <option key={`b-${f.obs_id}`} value={idx} className="bg-zinc-900">
                Frame #{idx + 1} ({f.obs_id}) - {f.wavelength_um}µm - {f.time_utc.split('T')[0]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Display Area */}
      {viewMode === 'blink' ? (
        <div className="relative flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-black overflow-hidden p-2">
          {/* Active slot indicator badge */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <span
              className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border shadow-lg ${
                activeSlot === 'A'
                  ? 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300'
                  : 'bg-amber-950/90 border-amber-500/60 text-amber-300'
              }`}
            >
              Slot {activeSlot}: {currentBlinkFrame.obs_id}
            </span>
          </div>

          <div className="absolute top-4 right-4 z-20">
            <WavelengthBadge frame={currentBlinkFrame} />
          </div>

          {/* Blink Canvas Image */}
          <div className="relative w-full aspect-square max-h-[500px] flex items-center justify-center p-2">
            <img
              src={getFrameImageUrl(targetId, currentBlinkFrame.file)}
              alt={`Blink Frame ${currentBlinkFrame.obs_id}`}
              className="max-h-[480px] max-w-full rounded object-contain pointer-events-none"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Blink Speed & Pause controls */}
          <div className="w-full flex items-center justify-between p-3 border-t border-zinc-900 bg-zinc-950/80 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBlinking(!isBlinking)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium text-xs transition ${
                  isBlinking
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
                    : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60'
                }`}
              >
                {isBlinking ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause Blink</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume Blink</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveSlot(activeSlot === 'A' ? 'B' : 'A')}
                disabled={isBlinking}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white disabled:opacity-40 transition text-xs"
              >
                Step Slot
              </button>
            </div>

            {/* Blink Rate Presets */}
            <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
              <span>Rate:</span>
              {[250, 400, 750, 1200].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setBlinkSpeedMs(ms)}
                  className={`px-2 py-0.5 rounded border transition ${
                    blinkSpeedMs === ms
                      ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {ms}ms
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Side by Side Display */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col rounded-xl border border-zinc-800 bg-black overflow-hidden p-2">
            <div className="flex items-center justify-between pb-2 px-1">
              <span className="font-mono text-xs font-bold text-cyan-400">Epoch A</span>
              <WavelengthBadge frame={frameA} />
            </div>
            <div className="relative aspect-square flex items-center justify-center">
              <img
                src={getFrameImageUrl(targetId, frameA.file)}
                alt={`Epoch A ${frameA.obs_id}`}
                className="max-h-[380px] max-w-full rounded object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-zinc-800 bg-black overflow-hidden p-2">
            <div className="flex items-center justify-between pb-2 px-1">
              <span className="font-mono text-xs font-bold text-amber-400">Epoch B</span>
              <WavelengthBadge frame={frameB} />
            </div>
            <div className="relative aspect-square flex items-center justify-center">
              <img
                src={getFrameImageUrl(targetId, frameB.file)}
                alt={`Epoch B ${frameB.obs_id}`}
                className="max-h-[380px] max-w-full rounded object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
