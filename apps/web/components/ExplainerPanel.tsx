import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, Compass, Eye } from 'lucide-react';

export const ExplainerPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900/40 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">What am I looking at?</h2>
            <p className="text-xs text-zinc-400">
              Understanding SPHEREx infrared all-sky surveys &amp; the Planet X hunt
            </p>
          </div>
        </div>

        <div className="text-zinc-500 hover:text-zinc-300">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-0 text-xs text-zinc-400 flex flex-col gap-3 border-t border-zinc-900 leading-relaxed">
          <p>
            <strong className="text-zinc-200">SPHEREx</strong> (Spectro-Photometer for the History of the Universe,
            Epoch of Reionization and Ices Explorer) is NASA’s upcoming all-sky spectral survey mission. Every six months,
            SPHEREx maps the entire sky across <span className="text-cyan-300 font-mono">0.75 to 5.0 µm</span> in 102 distinct
            infrared wavelength bands.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-1">
            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-cyan-400 font-medium text-xs">
                <Compass className="w-3.5 h-3.5" />
                <span>Multi-Epoch Sky</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Because SPHEREx surveys the entire sky repeatedly, we obtain consistent snapshots separated by weeks and months.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium text-xs">
                <Eye className="w-3.5 h-3.5" />
                <span>Blink Detection</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Distant background stars stay fixed between frames. Any point of light that jumps or blinks position is moving through our Solar System!
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Planet X Challenge</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                A distant hypothetical Planet X or trans-Neptunian object emits faint thermal infrared glow that shifts slowly against the stellar background.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 font-mono pt-1">
            Data pipeline: Raw FITS cutouts &rarr; Quality Masking &rarr; Zodiacal Subtraction &rarr; Common WCS Reprojection &rarr; Asinh/ZScale Stretch &rarr; WebP.
          </div>
        </div>
      )}
    </div>
  );
};
