import React, { useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { FrameItem } from '../lib/types';

interface TimelineProps {
  frames: FrameItem[];
  currentIndex: number;
  onChangeIndex: React.Dispatch<React.SetStateAction<number>> | ((index: number) => void);
  isPlaying: boolean;
  onTogglePlay: () => void;
  fps?: number;
  onChangeFps?: (fps: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  currentIndex,
  onChangeIndex,
  isPlaying,
  onTogglePlay,
  fps = 2,
  onChangeFps,
}) => {
  const totalFrames = frames.length;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || totalFrames <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(100, Math.round(1000 / fps));
    timerRef.current = window.setInterval(() => {
      // @ts-ignore - Handle functional state setter
      onChangeIndex((prev: number) => (prev + 1) % totalFrames);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, fps, totalFrames, onChangeIndex]);

  // Global keyboard navigation: ArrowLeft (previous), ArrowRight (next), Space (play/pause), Home/End
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if (e.key === 'ArrowLeft') {
        if (!isInput || activeEl?.getAttribute('type') === 'range') {
          e.preventDefault();
          handlePrev();
        }
      } else if (e.key === 'ArrowRight') {
        if (!isInput || activeEl?.getAttribute('type') === 'range') {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key === ' ' && !isInput) {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'Home' && !isInput) {
        e.preventDefault();
        // @ts-ignore
        onChangeIndex(0);
      } else if (e.key === 'End' && !isInput) {
        e.preventDefault();
        // @ts-ignore
        onChangeIndex(totalFrames - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalFrames, currentIndex, isPlaying, onChangeIndex]);

  const handlePrev = () => {
    if (totalFrames <= 1) return;
    const nextIdx = (currentIndex - 1 + totalFrames) % totalFrames;
    // @ts-ignore
    onChangeIndex(nextIdx);
  };

  const handleNext = () => {
    if (totalFrames <= 1) return;
    const nextIdx = (currentIndex + 1) % totalFrames;
    // @ts-ignore
    onChangeIndex(nextIdx);
  };

  if (totalFrames === 0) return null;

  const currentFrame = frames[currentIndex];
  let formattedDate = '';
  if (currentFrame?.time_utc) {
    try {
      formattedDate = new Date(currentFrame.time_utc).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      formattedDate = currentFrame.time_utc.split('T')[0];
    }
  }

  return (
    <div
      role="region"
      aria-label="Epoch Timeline Controls. Use Arrow Left and Arrow Right keys to step frames."
      className="w-full max-w-full flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-3.5 sm:p-4 backdrop-blur-md shadow-xl overflow-x-hidden"
    >
      {/* Slider & progress info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-zinc-200 font-semibold">Timeline</span>
            <span className="text-zinc-400" aria-hidden="true">&bull;</span>
            <span className="text-cyan-300 font-bold">
              Epoch {currentIndex + 1}/{totalFrames}
            </span>
          </div>

          <div className="text-[11px] text-zinc-300 font-mono truncate ml-2">
            {formattedDate}
          </div>
        </div>

        {/* Large Touch-friendly Scrubber Range Input */}
        <div className="py-1">
          <input
            type="range"
            min={0}
            max={totalFrames - 1}
            value={currentIndex}
            onChange={(e) => onChangeIndex(Number(e.target.value))}
            aria-label="Scrub through epoch frames. Use Arrow Left and Arrow Right keys."
            aria-valuemin={1}
            aria-valuemax={totalFrames}
            aria-valuenow={currentIndex + 1}
            aria-valuetext={`Epoch ${currentIndex + 1} of ${totalFrames}: ${formattedDate}`}
            className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-all hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          />
        </div>

        {/* Touch-friendly Frame ticks indicator */}
        <div className="flex justify-between px-1 text-[11px] font-mono text-zinc-400 overflow-x-hidden" role="tablist" aria-label="Individual Epoch Frames">
          {frames.map((frame, idx) => (
            <button
              key={frame.obs_id || idx}
              onClick={() => onChangeIndex(idx)}
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={`Jump to frame ${idx + 1} of ${totalFrames}${idx === currentIndex ? ' (current frame)' : ''}`}
              className={`py-1 px-1.5 transition-colors min-h-[44px] min-w-[28px] sm:min-w-[36px] flex items-center justify-center rounded-lg hover:text-cyan-200 active:scale-95 ${
                idx === currentIndex
                  ? 'text-cyan-200 font-bold bg-cyan-950/80 border border-cyan-500/60 ring-1 ring-cyan-500/30'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons Bar: All buttons at least 44px tall (min-h-[44px]) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center gap-2">
          {/* Previous Frame (44px) */}
          <button
            onClick={handlePrev}
            disabled={totalFrames <= 1}
            aria-label="Previous frame (Arrow Left key)"
            title="Previous frame (Arrow Left)"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/90 text-zinc-200 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Play / Pause Toggle (44px tall, wide thumb-friendly target) */}
          <button
            onClick={onTogglePlay}
            disabled={totalFrames <= 1}
            aria-label={isPlaying ? 'Pause timeline playback (Space key)' : 'Play timeline animation (Space key)'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className={`min-h-[44px] px-5 rounded-xl font-semibold text-xs transition shadow-md flex items-center gap-2 active:scale-95 ${
              isPlaying
                ? 'bg-amber-950/90 text-amber-200 border border-amber-500/60 hover:bg-amber-900'
                : 'bg-cyan-950/90 text-cyan-200 border border-cyan-500/60 hover:bg-cyan-900'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Next Frame (44px) */}
          <button
            onClick={handleNext}
            disabled={totalFrames <= 1}
            aria-label="Next frame (Arrow Right key)"
            title="Next frame (Arrow Right)"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/90 text-zinc-200 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition shadow-sm"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Reset to Frame 0 (44px) */}
          <button
            onClick={() => onChangeIndex(0)}
            title="Reset to first frame (Home key)"
            aria-label="Reset to first frame (Home key)"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Playback speed presets (All min-h-[44px]) */}
        {onChangeFps && (
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-300" role="group" aria-label="Playback Speed">
            <span className="hidden sm:inline text-[11px] mr-1 text-zinc-400">Speed:</span>
            {[1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeFps(speed)}
                aria-pressed={fps === speed}
                aria-label={`Set speed to ${speed} frames per second`}
                className={`min-h-[44px] min-w-[40px] px-2.5 rounded-xl text-xs border flex items-center justify-center active:scale-95 transition ${
                  fps === speed
                    ? 'bg-cyan-950 border-cyan-500/70 text-cyan-200 font-bold shadow-sm'
                    : 'bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
