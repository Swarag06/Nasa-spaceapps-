import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Telescope, Radio, ArrowRightLeft, Sparkles, Compass } from 'lucide-react';

interface ExplainerPanelProps {
  caption?: string;
  targetTitle?: string;
  className?: string;
}

export const ExplainerPanel: React.FC<ExplainerPanelProps> = ({
  caption = '',
  targetTitle = '',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Use target's caption from index.json as the "what to look for" line
  const whatToLookForText = caption && caption.trim().length > 0
    ? caption.trim()
    : 'Look for objects that shift position between frames while background stars stay still, or use Blink mode to spot faint moving asteroids.';

  return (
    <div
      data-tour="explainer-panel"
      className={`rounded-2xl border border-slate-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/85 backdrop-blur-xl shadow-lg dark:shadow-xl overflow-hidden transition-all ${className}`}
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[44px] flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-100 border border-cyan-300 text-cyan-700 dark:bg-cyan-950/70 dark:border-cyan-500/40 dark:text-cyan-400 group-hover:border-cyan-400/60 transition shadow-sm">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              What am I looking at?
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              A quick guide to interpreting SPHEREx infrared images and spotting moving objects
            </p>
          </div>
        </div>

        <div className="text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition pr-1">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Panel Body */}
      {isOpen && (
        <div className="p-4 sm:p-5 pt-0 text-xs text-slate-700 dark:text-zinc-300 flex flex-col gap-4 border-t border-slate-200 dark:border-zinc-900 leading-relaxed">
          {/* Target's "What to look for" callout box */}
          <div className="p-3.5 rounded-xl border border-cyan-300 dark:border-cyan-500/40 bg-cyan-50/80 dark:bg-cyan-950/25 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-400 font-mono text-[11px] font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>What to look for{targetTitle ? ` in ${targetTitle}` : ''}:</span>
            </div>
            <p className="text-xs text-cyan-950 dark:text-cyan-100/90 font-medium leading-normal">
              {whatToLookForText}
            </p>
          </div>

          {/* Core Explanation Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Point 1: Infrared from NASA SPHEREx */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/40 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 border border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-500/30 dark:text-indigo-400 shrink-0 mt-0.5">
                <Telescope className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-xs">Infrared Light from SPHEREx</h3>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                  These images show infrared light captured by NASA&apos;s SPHEREx space telescope. Infrared radiation reveals cold dust, faint thermal signatures, and objects too dim for optical telescopes.
                </p>
              </div>
            </div>

            {/* Point 2: Different Wavelengths */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/40 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 dark:bg-amber-950/60 dark:border-amber-500/30 dark:text-amber-400 shrink-0 mt-0.5">
                <Radio className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-xs">Different Wavelengths (&ldquo;Colours&rdquo;)</h3>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Each image is taken at a different wavelength (from 0.75 to 5.0 µm). Think of these as different &ldquo;colours&rdquo; of infrared light beyond what human eyes can perceive.
                </p>
              </div>
            </div>

            {/* Point 3: Position Changes Reveal Moving Objects */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/40 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-500/30 dark:text-emerald-400 shrink-0 mt-0.5">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-xs">Position Changes Show Motion</h3>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Distant background stars stay fixed in the exact same place. Any point of light that shifts position between observation dates is a moving solar system body, such as an asteroid or comet!
                </p>
              </div>
            </div>

            {/* Point 4: Brightness Changes & Wavelength */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/40 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-700 dark:bg-rose-950/60 dark:border-rose-500/30 dark:text-rose-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-xs">Brightness Differences</h3>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                  If an object looks brighter or dimmer in different images, that brightness difference may be caused by the change in wavelength rather than real physical variation in the object.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
