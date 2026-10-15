import React from 'react';
import { TargetSummary } from '../lib/types';
import { Compass, Layers, Crosshair } from 'lucide-react';

interface TargetPickerProps {
  targets: TargetSummary[];
  selectedId: string | null;
  onSelect: (targetId: string) => void;
  isLoading?: boolean;
}

export const TargetPicker: React.FC<TargetPickerProps> = ({
  targets,
  selectedId,
  onSelect,
  isLoading = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          Target Catalog
        </span>
        <span className="text-[11px] text-zinc-500 font-mono">
          {targets.length} {targets.length === 1 ? 'target' : 'targets'}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse text-zinc-400 text-xs">
          Loading sky targets...
        </div>
      ) : targets.length === 0 ? (
        <div className="p-3 text-xs text-zinc-500 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
          No targets found in data/frames.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
          {targets.map((target) => {
            const isSelected = target.id === selectedId;
            return (
              <button
                key={target.id}
                onClick={() => onSelect(target.id)}
                className={`group text-left p-3 rounded-lg border transition-all duration-150 flex flex-col gap-1.5 ${
                  isSelected
                    ? 'border-cyan-500/70 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                    : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isSelected ? 'text-cyan-200' : 'text-zinc-200'}`}>
                    {target.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {target.tracking && (
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded">
                        Tracking
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      <span>{target.frame_count} frames</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <Compass className="w-3.5 h-3.5 text-zinc-500" />
                  <span>
                    RA {target.ra.toFixed(3)}° &nbsp; Dec {target.dec.toFixed(3)}°
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-1">
                  {target.caption}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
