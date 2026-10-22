import React, { useState, useEffect } from 'react';
import { Telescope, Radio, Flame, Sparkles, Download, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface FirstVisitTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to SPHEREx Sky Explorer',
    subtitle: "NASA's All-Sky Infrared Spectral Survey",
    description:
      "You are looking at real infrared light captured by NASA's SPHEREx space telescope. SPHEREx maps the entire sky repeatedly, allowing us to uncover moving objects and dynamic changes across the cosmos.",
    icon: <Telescope className="w-6 h-6 text-cyan-400" />,
    badge: 'Step 1 of 5',
  },
  {
    title: 'Timeline & Infrared Wavelengths',
    subtitle: 'Seeing the Universe in Invisible "Colours"',
    description:
      "Use the timeline slider and Play button to step through observation dates. Notice the badge on each frame: each image is taken at a different wavelength (colour of infrared) from 0.75 to 5.0 µm.",
    icon: <Radio className="w-6 h-6 text-amber-400" />,
    badge: 'Step 2 of 5',
  },
  {
    title: 'Download & Export Images',
    subtitle: 'High-Resolution PNGs & Scientific Montages',
    description:
      'Save any observation frame, co-added comet stack, side-by-side comparison montage, or difference map directly to your device with clear astronomical metadata in filenames.',
    icon: <Download className="w-6 h-6 text-cyan-400" />,
    badge: 'Step 3 of 5',
  },
  {
    title: 'Compare & Blink Comparator',
    subtitle: 'Blink, Side-by-Side & Difference Maps',
    description:
      'Switch to the Compare tab! Alternate between two epochs with the Blink comparator, inspect them side-by-side with synced pan and zoom, or compute a Difference map (B − A) to reveal changes.',
    icon: <Flame className="w-6 h-6 text-emerald-400" />,
    badge: 'Step 4 of 5',
  },
  {
    title: 'What to Look For',
    subtitle: 'Spotting Asteroids, Comets & Planet X Candidates',
    description:
      'Distant stars stay fixed in place. Any point of light that shifts position between images is a moving object! Remember: brightness changes can be due to wavelength rather than physical changes in the object.',
    icon: <Sparkles className="w-6 h-6 text-indigo-400" />,
    badge: 'Step 5 of 5',
  },
];

export const FirstVisitTour: React.FC<FirstVisitTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0c1017] p-6 shadow-2xl flex flex-col gap-5 text-zinc-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
      >
        {/* Top Bar: Badge, Progress Dots, Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              {step.badge}
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep ? 'w-5 bg-cyan-400' : 'bg-zinc-700 hover:bg-zinc-500'
                  }`}
                  aria-label={`Jump to step ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition active:scale-95"
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 shrink-0 shadow-inner">
            {step.icon}
          </div>
          <div className="flex flex-col gap-1">
            <h3 id="tour-step-title" className="text-lg font-bold text-white tracking-tight">
              {step.title}
            </h3>
            <p className="text-xs font-medium text-cyan-400 font-mono">
              {step.subtitle}
            </p>
          </div>
        </div>

        {/* Step Description */}
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60">
          {step.description}
        </p>

        {/* Action Controls - All buttons min-h-[44px] */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
          <button
            onClick={onClose}
            className="min-h-[44px] px-3 flex items-center text-xs font-mono text-zinc-400 hover:text-zinc-200 transition active:scale-95"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="min-h-[44px] flex items-center gap-1.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition active:scale-95 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="min-h-[44px] flex items-center gap-2 px-5 rounded-xl font-semibold text-xs transition bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 active:scale-95"
            >
              {isLast ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Get Started</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
