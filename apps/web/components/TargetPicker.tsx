import React, { useState, useEffect } from 'react';
import { TargetSummary } from '../lib/types';
import { Compass, Layers, Crosshair, Calendar, Eye, Sparkles, Orbit } from 'lucide-react';

interface TargetPickerProps {
  targets: TargetSummary[];
  selectedId: string | null;
  onSelect: (targetId: string) => void;
  isLoading?: boolean;
}

type AtlasMonth = 'aug' | 'dec';
type AtlasView = 'single' | 'stacked' | 'buildup';

export const TargetPicker: React.FC<TargetPickerProps> = ({
  targets,
  selectedId,
  onSelect,
  isLoading = false,
}) => {
  // Month switch: 'aug' (August) or 'dec' (December)
  const [atlasMonth, setAtlasMonth] = useState<AtlasMonth>('aug');

  // View switch: 'single' ("Single frames"), 'stacked' ("Stacked over days"), 'buildup' ("Build-up")
  const [atlasView, setAtlasView] = useState<AtlasView>('single');

  // Synchronize month and view state if selectedId changes from outside
  useEffect(() => {
    if (selectedId && selectedId.startsWith('3i-atlas-')) {
      const isDec = selectedId.includes('-dec');
      const isStacked = selectedId.endsWith('-stacked');
      const isBuildup = selectedId.endsWith('-buildup');

      setAtlasMonth(isDec ? 'dec' : 'aug');
      setAtlasView(isStacked ? 'stacked' : isBuildup ? 'buildup' : 'single');
    }
  }, [selectedId]);

  // Map month and view to corresponding folder ID: <name>, <name>-stacked, <name>-buildup
  const getAtlasTargetId = (month: AtlasMonth, view: AtlasView): string => {
    const baseName = `3i-atlas-${month}`;
    if (view === 'stacked') return `${baseName}-stacked`;
    if (view === 'buildup') return `${baseName}-buildup`;
    return baseName;
  };

  const currentAtlasId = getAtlasTargetId(atlasMonth, atlasView);
  const isAtlasSelected = Boolean(selectedId && selectedId.startsWith('3i-atlas-'));

  // Find active TargetSummary for the currently selected Comet 3I/ATLAS view
  const currentAtlasTarget = targets.find((t) => t.id === currentAtlasId) || {
    id: currentAtlasId,
    title: `Comet 3I/ATLAS (${atlasMonth === 'aug' ? 'Aug' : 'Dec'} 2025)${
      atlasView === 'stacked' ? ' (stacked)' : atlasView === 'buildup' ? ' (build-up)' : ''
    }`,
    ra: atlasMonth === 'aug' ? 245.852 : 172.289,
    dec: atlasMonth === 'aug' ? -16.674 : 3.36,
    caption:
      atlasView === 'stacked'
        ? 'Each image combines frames from a few days, so the faint comet becomes visible.'
        : atlasView === 'buildup'
        ? 'Watch the comet emerge from the noise as more frames are combined.'
        : 'The comet stays centred while background stars drift past.',
    frame_count: atlasView === 'stacked' ? 5 : atlasView === 'buildup' ? 7 : 6,
    tracking: true,
  };

  const handleMonthChange = (month: AtlasMonth) => {
    setAtlasMonth(month);
    const newId = getAtlasTargetId(month, atlasView);
    onSelect(newId);
  };

  const handleViewChange = (view: AtlasView) => {
    setAtlasView(view);
    const newId = getAtlasTargetId(atlasMonth, view);
    onSelect(newId);
  };

  // Filter out targets belonging to 3I/ATLAS group to list remaining standalone targets
  const standaloneTargets = targets.filter((t) => !t.id.startsWith('3i-atlas-'));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          Target Catalog
        </span>
        <span className="text-[11px] text-zinc-500 font-mono">
          2 Catalog Objects
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse text-zinc-400 text-xs">
          Loading sky targets...
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* GROUP 1: Comet 3I/ATLAS with Month Switch and View Switch */}
          <div
            onClick={() => onSelect(currentAtlasId)}
            className={`group text-left p-3.5 rounded-xl border transition-all duration-150 flex flex-col gap-2.5 cursor-pointer ${
              isAtlasSelected
                ? 'border-cyan-500/80 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.18)] ring-1 ring-cyan-500/40'
                : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
            }`}
          >
            {/* Header: Title + Tracking Badge + Frames */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                  <Orbit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold tracking-tight ${isAtlasSelected ? 'text-cyan-200' : 'text-zinc-100'}`}>
                    Comet 3I/ATLAS
                  </h3>
                  <div className="text-[10px] font-mono text-zinc-400">
                    Interstellar Comet &bull; Centre-tracked
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/90 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                  Tracking
                </span>
                <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>{currentAtlasTarget.frame_count} frames</span>
                </div>
              </div>
            </div>

            {/* Month Switch: August / December */}
            <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800/60" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  Epoch Month:
                </span>
                <span className="text-zinc-500">{atlasMonth === 'aug' ? 'Aug 2025' : 'Dec 2025'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-zinc-950/90 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleMonthChange('aug')}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium transition ${
                    atlasMonth === 'aug'
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  August
                </button>
                <button
                  type="button"
                  onClick={() => handleMonthChange('dec')}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium transition ${
                    atlasMonth === 'dec'
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  December
                </button>
              </div>
            </div>

            {/* View Switch: "Single frames", "Stacked over days", "Build-up" */}
            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  View Mode:
                </span>
                <span className="text-cyan-400 font-mono lowercase">
                  {currentAtlasId}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-zinc-950/90 border border-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleViewChange('single')}
                  className={`py-1.5 px-1 rounded-md font-medium text-center truncate transition ${
                    atlasView === 'single'
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Single frames"
                >
                  Single frames
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('stacked')}
                  className={`py-1.5 px-1 rounded-md font-medium text-center truncate transition ${
                    atlasView === 'stacked'
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Stacked over days"
                >
                  Stacked over days
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('buildup')}
                  className={`py-1.5 px-1 rounded-md font-medium text-center truncate transition ${
                    atlasView === 'buildup'
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Build-up"
                >
                  Build-up
                </button>
              </div>
            </div>

            {/* Active Coordinates & Caption */}
            <div className="pt-2 border-t border-zinc-800/60 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Compass className="w-3.5 h-3.5 text-zinc-500" />
                <span>
                  RA {currentAtlasTarget.ra.toFixed(3)}&deg; &nbsp; Dec {currentAtlasTarget.dec.toFixed(3)}&deg;
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                {currentAtlasTarget.caption}
              </p>
            </div>
          </div>

          {/* GROUP 2: Standalone Entries (e.g. "test-field") */}
          {standaloneTargets.map((target) => {
            const isSelected = target.id === selectedId;
            return (
              <button
                key={target.id}
                onClick={() => onSelect(target.id)}
                className={`group text-left p-3.5 rounded-xl border transition-all duration-150 flex flex-col gap-1.5 ${
                  isSelected
                    ? 'border-cyan-500/70 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                    : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isSelected ? 'text-cyan-200' : 'text-zinc-200'}`}>
                    {target.title || target.id}
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
                    RA {target.ra.toFixed(3)}&deg; &nbsp; Dec {target.dec.toFixed(3)}&deg;
                  </span>
                </div>

                {target.caption && (
                  <p className="text-[11px] text-zinc-400 line-clamp-1">
                    {target.caption}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
