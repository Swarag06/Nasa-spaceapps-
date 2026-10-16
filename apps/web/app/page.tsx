'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTargets } from '../hooks/useTargets';
import { useFrames } from '../hooks/useFrames';
import { TargetPicker } from '../components/TargetPicker';
import { ImageViewer } from '../components/ImageViewer';
import { Timeline } from '../components/Timeline';
import { ComparisonViewer } from '../components/ComparisonViewer';
import { ExplainerPanel } from '../components/ExplainerPanel';
import { FirstVisitTour } from '../components/FirstVisitTour';
import { Telescope, Flame, Eye, RefreshCw, AlertTriangle, Layers, HelpCircle } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export function SkyExplorerContent() {
  const { data: targets = [], isLoading: targetsLoading, isError: targetsError, refetch: refetchTargets } = useTargets();

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(2);
  const [activeMode, setActiveMode] = useState<'single' | 'compare'>('single');
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Check first-visit tour status in sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tourSeen = sessionStorage.getItem('spherex_tour_seen');
      if (!tourSeen) {
        setIsTourOpen(true);
      }
    }
  }, []);

  const handleCloseTour = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('spherex_tour_seen', 'true');
    }
    setIsTourOpen(false);
  };

  // Automatically select target once loaded (prefer Comet 3I/ATLAS)
  useEffect(() => {
    if (targets.length > 0 && !selectedTargetId) {
      const preferred = targets.find((t) => t.id === '3i-atlas-aug') || targets[0];
      setSelectedTargetId(preferred.id);
    }
  }, [targets, selectedTargetId]);

  // Reset frame index and stop playing when switching targets
  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  }, [selectedTargetId]);

  const { data: framesData, isLoading: framesLoading, isError: framesError } = useFrames(selectedTargetId);

  const frames = framesData?.frames || [];
  const currentFrame = frames[currentFrameIndex] || null;

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
              <Telescope className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">SPHEREx Sky Explorer</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold">
                  Space Apps 2026
                </span>
              </div>
              <p className="text-xs text-zinc-400">All-sky infrared time series &amp; Planet X hunting</p>
            </div>
          </div>

          {/* Header Controls: Tour Button + Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTourOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition font-medium shadow-sm"
              title="Open First-Visit Interactive Tour"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Quick Tour</span>
            </button>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setActiveMode('single')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                  activeMode === 'single'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Timeline Viewer</span>
              </button>

              <button
                onClick={() => setActiveMode('compare')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                  activeMode === 'compare'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Compare</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col gap-6">
        {/* Error notification if targets failed to load */}
        {targetsError && (
          <div className="p-4 rounded-xl border border-red-900/50 bg-red-950/20 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Failed to load SPHEREx targets from the remote repository. Check network connection or FRAMES_BASE_URL.</span>
            </div>
            <button
              onClick={() => refetchTargets()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-900/40 hover:bg-red-800/50 border border-red-700/50 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Target Selector & Target Details (3 or 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <TargetPicker
                targets={targets}
                selectedId={selectedTargetId}
                onSelect={setSelectedTargetId}
                isLoading={targetsLoading}
              />
            </div>

            {/* Target Information Card */}
            {framesData && (
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 backdrop-blur-md shadow-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Target Metadata</h2>
                  <span className="font-mono text-[11px] text-cyan-400 font-semibold">{framesData.target}</span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="text-sm font-semibold text-zinc-200">{framesData.title}</div>
                  <div className="font-mono text-zinc-400 text-[11px]">
                    RA: <span className="text-zinc-300">{framesData.ra.toFixed(4)}°</span> &nbsp;|&nbsp; Dec:{' '}
                    <span className="text-zinc-300">{framesData.dec.toFixed(4)}°</span>
                  </div>
                  {framesData.caption && (
                    <p className="text-xs text-zinc-400 pt-1 leading-relaxed">{framesData.caption}</p>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    <span>{frames.length} Infrared Epochs</span>
                  </div>
                  <span>0.75 - 5.0 µm</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Visualizer & Timeline / Blink (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {framesLoading ? (
              <div className="min-h-[460px] flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-xs gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading SPHEREx frame sequence...</span>
              </div>
            ) : framesError || !selectedTargetId ? (
              <div className="min-h-[460px] flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-500 text-xs p-6 text-center">
                <span>Select a target from the catalog to inspect infrared frames.</span>
              </div>
            ) : activeMode === 'single' ? (
              <>
                <ImageViewer
                  targetId={selectedTargetId}
                  frame={currentFrame}
                  tracking={framesData?.tracking}
                  stack={framesData?.stack}
                  caption={framesData?.caption}
                />

                <Timeline
                  frames={frames}
                  currentIndex={currentFrameIndex}
                  onChangeIndex={setCurrentFrameIndex}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  fps={fps}
                  onChangeFps={setFps}
                />
              </>
            ) : (
              <ComparisonViewer
                targetId={selectedTargetId}
                frames={frames}
                tracking={framesData?.tracking}
              />
            )}

            {/* "What am I looking at?" Explainer Panel */}
            <ExplainerPanel
              caption={framesData?.caption}
              targetTitle={framesData?.title}
            />
          </div>
        </div>
      </main>

      {/* First-Visit Session Tour */}
      <FirstVisitTour
        isOpen={isTourOpen}
        onClose={handleCloseTour}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-4 px-4 text-center text-xs text-zinc-500 font-mono">
        SPHEREx Sky Explorer &bull; NASA Space Apps 2026 &ldquo;Planet X and SPHEREx&rdquo; Scaffold &bull; Heavy image processing offline in Python
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <SkyExplorerContent />
    </QueryClientProvider>
  );
}
