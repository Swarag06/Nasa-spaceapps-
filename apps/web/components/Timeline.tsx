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

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-md">
      {/* Slider & progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-zinc-200 font-semibold">Epoch Timeline</span>
            <span className="text-zinc-500">|</span>
            <span className="text-cyan-400">
              Frame {currentIndex + 1} of {totalFrames}
            </span>
          </div>

          <div className="text-[11px] text-zinc-400">
            {frames[currentIndex]?.obs_id}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentIndex}
          onChange={(e) => onChangeIndex(Number(e.target.value))}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 transition-all hover:bg-zinc-700 focus:outline-none"
        />

        {/* Frame ticks indicator */}
        <div className="flex justify-between px-1 text-[10px] font-mono text-zinc-500">
          {frames.map((frame, idx) => (
            <button
              key={frame.obs_id || idx}
              onClick={() => onChangeIndex(idx)}
              className={`transition-colors py-0.5 hover:text-cyan-300 ${
                idx === currentIndex ? 'text-cyan-400 font-bold' : ''
              }`}
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
        <div className="flex items-center gap-2">
          {/* Previous Frame */}
          <button
            onClick={handlePrev}
            disabled={totalFrames <= 1}
            aria-label="Previous frame"
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={onTogglePlay}
            disabled={totalFrames <= 1}
            aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs transition shadow-sm ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Animation</span>
              </>
            )}
          </button>

          {/* Next Frame */}
          <button
            onClick={handleNext}
            disabled={totalFrames <= 1}
            aria-label="Next frame"
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Reset to Frame 0 */}
          <button
            onClick={() => onChangeIndex(0)}
            title="Reset to first frame"
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback speed toggle */}
        {onChangeFps && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
            <span>Speed:</span>
            {[1, 2, 4, 8].map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeFps(speed)}
                className={`px-2 py-0.5 rounded text-[11px] border transition ${
                  fps === speed
                    ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
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
