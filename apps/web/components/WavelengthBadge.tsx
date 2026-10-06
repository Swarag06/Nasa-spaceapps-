import React from 'react';
import { FrameItem } from '../lib/types';
import { Calendar, Radio, Cpu } from 'lucide-react';

interface WavelengthBadgeProps {
  frame: FrameItem | null;
  className?: string;
}

export const WavelengthBadge: React.FC<WavelengthBadgeProps> = ({ frame, className = '' }) => {
  if (!frame) return null;

  // Format UTC date nicely (e.g., Mar 1, 2025 • 12:00 UTC)
  const formattedDate = (() => {
    try {
      const d = new Date(frame.time_utc);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return frame.time_utc;
    }
  })();

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-lg bg-zinc-950/80 px-3 py-1.5 backdrop-blur-md border border-zinc-800 text-xs font-mono text-zinc-300 shadow-lg ${className}`}
    >
      <div className="flex items-center gap-1.5 text-cyan-400">
        <Calendar className="w-3.5 h-3.5" />
        <span>{formattedDate}</span>
      </div>

      <span className="text-zinc-600">|</span>

      <div className="flex items-center gap-1.5 text-amber-400">
        <Radio className="w-3.5 h-3.5" />
        <span>λ = {frame.wavelength_um.toFixed(2)} µm</span>
      </div>

      <span className="text-zinc-600">|</span>

      <div className="flex items-center gap-1.5 text-emerald-400">
        <Cpu className="w-3.5 h-3.5" />
        <span>Det {frame.detector}</span>
      </div>
    </div>
  );
};
