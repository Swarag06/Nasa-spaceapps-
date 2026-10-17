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
import {
  Telescope,
  Flame,
  Eye,
  RefreshCw,
  AlertTriangle,
  Layers,
  HelpCircle,
  Compass,
  Play,
  Pause,
  X,
} from 'lucide-react';

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Respect system prefers-reduced-motion: never auto-play animations
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mql.matches) {
        setIsPlaying(false);
      }
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) {
          setIsPlaying(false);
        }
      };
      mql.addEventListener?.('change', listener);
      return () => mql.removeEventListener?.('change', listener);
    }
  }, []);

  // Keyboard shortcut: close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) setIsDrawerOpen(false);
        if (isTourOpen) setIsTourOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isTourOpen]);

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
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden w-full max-w-full">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-30 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20 shrink-0">
              <Telescope className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate max-w-[190px] sm:max-w-none">
                  SPHEREx Sky Explorer
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold shrink-0">
                  Space Apps 2026
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-300 hidden xs:block">
                All-sky infrared time series &amp; Planet X hunting
              </p>
            </div>
          </div>

          {/* Header Controls: Drawer Menu Button (<900px), Tour Button + Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            {/* Menu Button for Slide-Up Drawer (<900px) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open Target Catalog Drawer"
              className="mobile-drawer-trigger min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-500/50 bg-cyan-950/70 hover:bg-cyan-900/80 text-xs text-cyan-200 transition font-medium shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Open Target Catalog Drawer"
            >
              <Compass className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[120px] font-mono">
                {framesData?.target || selectedTargetId || 'Targets'}
              </span>
            </button>

            {/* Quick Tour Button */}
            <button
              onClick={() => setIsTourOpen(true)}
              aria-label="Open First-Visit Interactive Tour"
              className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-xs text-zinc-200 hover:text-white transition font-medium shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Open First-Visit Interactive Tour"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span className="hidden sm:inline">Quick Tour</span>
            </button>

            {/* Mode Switcher Tabs (All buttons min-h-[44px]) */}
            <div role="tablist" aria-label="Explorer View Modes" className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-700 rounded-xl p-1 text-xs">
              <button
                role="tab"
                aria-selected={activeMode === 'single'}
                aria-label="Switch to single frame timeline view"
                onClick={() => setActiveMode('single')}
                className={`min-h-[44px] flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg font-medium transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  activeMode === 'single'
                    ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span className="hidden xs:inline">Timeline</span>
              </button>

              <button
                role="tab"
                aria-selected={activeMode === 'compare'}
                aria-label="Switch to frame comparison view"
                onClick={() => setActiveMode('compare')}
                className={`min-h-[44px] flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg font-medium transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  activeMode === 'compare'
                    ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4" aria-hidden="true" />
                <span>Compare</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout using Responsive CSS Media Queries */}
      <main className="explorer-main w-full flex-1 flex flex-col gap-4 sm:gap-6 overflow-x-hidden">
        {/* Error notification if targets failed to load */}
        {targetsError && (
          <div className="mobile-padded-content w-full">
            <div className="p-3.5 sm:p-4 rounded-xl border border-red-900/50 bg-red-950/20 text-red-300 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Failed to load SPHEREx targets from the remote repository. Check network connection or FRAMES_BASE_URL.</span>
              </div>
              <button
                onClick={() => refetchTargets()}
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-900/40 hover:bg-red-800/50 border border-red-700/50 font-medium active:scale-95 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Responsive Grid Container: 2-column on >=900px, single column on <900px */}
        <div className="desktop-layout-grid w-full max-w-full">
          {/* Desktop Left Column: Persistent Sidebar (Unchanged on >=900px, hidden on <900px) */}
          <aside aria-label="Target Catalog Sidebar" className="desktop-sidebar flex flex-col gap-5">
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
          </aside>

          {/* Right Column / Mobile Top: Interactive Visualizer & Controls */}
          <section aria-label="Visualizer and Controls" className="desktop-main-col w-full flex flex-col gap-4 sm:gap-5">
            {framesLoading ? (
              <div className="min-h-[460px] flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-300 text-xs gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span>Loading SPHEREx frame sequence...</span>
              </div>
            ) : framesError || !selectedTargetId ? (
              <div className="min-h-[460px] flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-300 text-xs p-6 text-center">
                <span>Select a target from the catalog to inspect infrared frames.</span>
              </div>
            ) : activeMode === 'single' ? (
              <>
                {/* 1. Image fills the full screen width at the top on mobile */}
                <ImageViewer
                  targetId={selectedTargetId}
                  targetTitle={framesData?.title}
                  frame={currentFrame}
                  tracking={framesData?.tracking}
                  stack={framesData?.stack}
                  caption={framesData?.caption}
                />

                {/* 2. Controls under the image */}
                <div className="mobile-padded-content w-full">
                  <Timeline
                    frames={frames}
                    currentIndex={currentFrameIndex}
                    onChangeIndex={setCurrentFrameIndex}
                    isPlaying={isPlaying}
                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                    fps={fps}
                    onChangeFps={setFps}
                  />
                </div>
              </>
            ) : (
              /* Compare View (Side-by-Side stacks vertically on <900px, Side-by-Side on >=900px) */
              <ComparisonViewer
                targetId={selectedTargetId}
                targetTitle={framesData?.title}
                frames={frames}
                tracking={framesData?.tracking}
              />
            )}

            {/* "What am I looking at?" Explainer Panel */}
            <div className="mobile-padded-content w-full">
              <ExplainerPanel
                caption={framesData?.caption}
                targetTitle={framesData?.title}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Slide-Up Drawer for Sidebar on screens < 900px */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer sheet container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            className="relative w-full max-w-lg max-h-[85vh] bg-zinc-950 border-t border-zinc-700/80 rounded-t-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 overflow-y-auto z-50"
          >
            {/* Grab handle indicator */}
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto shrink-0 -mt-1 mb-0.5" aria-hidden="true" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                <h2 id="drawer-title" className="text-sm font-bold text-white tracking-wide">
                  SPHEREx Target Catalog
                </h2>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-900 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                aria-label="Close targets drawer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Target Catalog & Metadata inside Drawer */}
            <div className="flex flex-col gap-4 pb-4">
              <TargetPicker
                targets={targets}
                selectedId={selectedTargetId}
                onSelect={(id) => {
                  setSelectedTargetId(id);
                  setIsDrawerOpen(false);
                }}
                isLoading={targetsLoading}
              />

              {framesData && (
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 backdrop-blur-md shadow-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Target Metadata</h3>
                    <span className="font-mono text-[11px] text-cyan-300 font-semibold">{framesData.target}</span>
                  </div>
                  <div className="text-xs text-zinc-300">
                    <div className="text-sm font-semibold text-zinc-100">{framesData.title}</div>
                    <div className="font-mono text-zinc-300 text-[11px] pt-0.5">
                      RA: {framesData.ra.toFixed(4)}° &nbsp;|&nbsp; Dec: {framesData.dec.toFixed(4)}°
                    </div>
                    {framesData.caption && (
                      <p className="text-xs text-zinc-300 pt-1 leading-relaxed">{framesData.caption}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Controls Bar (<900px, hidden on desktop >=900px via CSS) */}
      <nav
        aria-label="Mobile Navigation and Controls"
        className="mobile-bottom-bar fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 px-3 py-2 pb-safe shadow-[0_-5px_25px_rgba(0,0,0,0.8)]"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1.5 items-center w-full">
          {/* 1. Target Drawer Menu Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Target Catalog Drawer"
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-medium transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isDrawerOpen
                ? 'bg-cyan-950 text-cyan-200 border-cyan-500/60 shadow-sm'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
            title="Open Target Catalog Drawer"
          >
            <Compass className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span className="truncate max-w-[70px]">Targets</span>
          </button>

          {/* 2. Play / Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={frames.length <= 1}
            aria-label={isPlaying ? 'Pause timeline playback' : 'Start timeline playback'}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isPlaying
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/60 shadow-md'
                : 'bg-cyan-950/90 text-cyan-200 border-cyan-500/60 shadow-sm'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isPlaying ? 'Pause timeline playback' : 'Start timeline playback'}
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

          {/* 3. Mode Toggle: Timeline vs Compare */}
          <button
            onClick={() => setActiveMode(activeMode === 'single' ? 'compare' : 'single')}
            aria-label={activeMode === 'single' ? 'Switch to compare view' : 'Switch to timeline view'}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-medium transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeMode === 'compare'
                ? 'bg-cyan-950 text-cyan-200 border-cyan-500/60 shadow-sm'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-200'
            }`}
            title="Toggle between single timeline and comparison modes"
          >
            {activeMode === 'single' ? (
              <>
                <Flame className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Compare</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                <span>Timeline</span>
              </>
            )}
          </button>

          {/* 4. Help / Quick Tour */}
          <button
            onClick={() => setIsTourOpen(true)}
            aria-label="Open Interactive Quick Tour"
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white text-[10px] font-medium active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            title="Open Interactive Tour"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span>Tour</span>
          </button>
        </div>
      </nav>

      {/* First-Visit Session Tour */}
      <FirstVisitTour
        isOpen={isTourOpen}
        onClose={handleCloseTour}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-4 px-4 text-center text-xs text-zinc-400 font-mono">
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
