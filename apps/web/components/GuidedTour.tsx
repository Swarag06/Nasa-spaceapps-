import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, X, Compass, Sparkles } from 'lucide-react';

export interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: 'single' | 'compare';
  setActiveMode: (mode: 'single' | 'compare') => void;
  isDrawerOpen?: boolean;
  setIsDrawerOpen?: (open: boolean) => void;
  targetHasStack?: boolean;
}

interface StepDefinition {
  id: string;
  selector: string;
  title: string;
  description: string;
  before?: () => void | Promise<void>;
  condition?: () => boolean;
}

// In-memory fallback if localStorage fails
let inMemoryTourSeen = false;

export function getHasSeenTour(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('spherex_guided_tour_seen') === 'true' || inMemoryTourSeen;
    }
  } catch {
    // Storage unavailable
  }
  return inMemoryTourSeen;
}

export function setHasSeenTour(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('spherex_guided_tour_seen', 'true');
    }
  } catch {
    // Storage unavailable
  }
  inMemoryTourSeen = true;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isOpen,
  onClose,
  setActiveMode,
  setIsDrawerOpen,
  targetHasStack = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    side: 'below' | 'above' | 'right' | 'left' | 'pinned-bottom';
    arrowPos: number;
  }>({
    top: 0,
    left: 0,
    side: 'below',
    arrowPos: 16,
  });

  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mql.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mql.addEventListener?.('change', listener);
      return () => mql.removeEventListener?.('change', listener);
    }
  }, []);

  // TOUR STEPS definition matching user's exact specification
  const rawSteps: StepDefinition[] = [
    {
      id: 'target-picker',
      selector: '[data-tour="target-picker"]',
      title: 'Choose a place in the sky',
      description:
        "Each target is a real patch of sky seen by NASA's SPHEREx telescope. Try the comet first.",
      before: () => {
        if (typeof window !== 'undefined' && window.innerWidth < 900) {
          setIsDrawerOpen?.(true);
        }
      },
    },
    {
      id: 'image-viewer',
      selector: '[data-tour="image-viewer"]',
      title: 'Real telescope images',
      description:
        'This is infrared light we cannot see with our eyes. Zoom and drag to look closer.',
      before: () => {
        setIsDrawerOpen?.(false);
        setActiveMode('single');
      },
    },
    {
      id: 'wavelength-badge',
      selector: '[data-tour="wavelength-badge"]',
      title: 'Date and wavelength',
      description:
        'Every image is taken at a different infrared colour (wavelength). Brightness can change because of this, not because the sky changed.',
      before: () => {
        setIsDrawerOpen?.(false);
        setActiveMode('single');
      },
    },
    {
      id: 'timeline',
      selector: '[data-tour="timeline"]',
      title: 'Move through time',
      description: 'Drag the slider to step through the observations in order.',
      before: () => {
        setIsDrawerOpen?.(false);
        setActiveMode('single');
      },
    },
    {
      id: 'play-pause',
      selector: '[data-tour="play-pause"]',
      title: 'Play it like a movie',
      description:
        'Watch things move. Stars stay put; comets and asteroids shift position.',
      before: () => {
        setIsDrawerOpen?.(false);
        setActiveMode('single');
      },
    },
    {
      id: 'compare-tab',
      selector: '[data-tour="compare-tab"]',
      title: 'Compare two images',
      description: 'Switch here to compare two moments in the sky.',
      before: () => {
        setIsDrawerOpen?.(false);
      },
    },
    {
      id: 'blink-mode',
      selector: '[data-tour="blink-mode"]',
      title: 'Blink',
      description:
        'Flip quickly between two images. Anything that jumps or moves has changed.',
      before: () => {
        setIsDrawerOpen?.(false);
        setActiveMode('compare');
        // Click blink mode tab if comparison viewer is ready
        setTimeout(() => {
          (document.querySelector('[data-tour="blink-mode"]') as HTMLButtonElement)?.click();
        }, 50);
      },
    },
    {
      id: 'difference-mode',
      selector: '[data-tour="difference-mode"]',
      title: 'Difference view',
      description:
        'Shows what is different between two images. A warning appears if they are at different wavelengths.',
      before: () => {
        setIsDrawerOpen?.(false);
        setActiveMode('compare');
      },
    },
    {
      id: 'stacked-view',
      selector: '[data-tour="stacked-view"]',
      title: 'Stacked view (comets)',
      description:
        'A single image of this comet is too faint to see. Combining many images makes it stand out. Background stars drift, so they fade, while the comet stays at the centre.',
      before: () => {
        setIsDrawerOpen?.(false);
        setActiveMode('single');
      },
      condition: () => targetHasStack,
    },
    {
      id: 'explainer-panel',
      selector: '[data-tour="explainer-panel"]',
      title: 'What am I looking at?',
      description:
        'Open this any time for a plain-language explanation of what you see.',
      before: () => {
        setIsDrawerOpen?.(false);
      },
    },
    {
      id: 'tour-button',
      selector: '[data-tour="tour-button"]',
      title: 'Replay the tour',
      description: 'You can restart this tour from here whenever you like.',
      before: () => {
        setIsDrawerOpen?.(false);
      },
    },
  ];

  // Helper: check if element is visible on screen
  const isElementVisible = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  // Find step element with up to 500ms polling wait
  const resolveStepElement = async (step: StepDefinition): Promise<HTMLElement | null> => {
    if (step.condition && !step.condition()) {
      return null;
    }
    if (step.before) {
      await step.before();
    }

    const startTime = Date.now();
    while (Date.now() - startTime <= 500) {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (isElementVisible(el)) {
        return el;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return null;
  };

  // Update spotlight and tooltip positions based on active element
  const updatePositions = useCallback(() => {
    if (!activeElement) return;

    const rect = activeElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const PADDING = 8;
    const spotX = Math.max(0, rect.left - PADDING);
    const spotY = Math.max(0, rect.top - PADDING);
    const spotW = Math.min(window.innerWidth - spotX, rect.width + PADDING * 2);
    const spotH = Math.min(window.innerHeight - spotY, rect.height + PADDING * 2);

    setSpotlightRect({
      left: spotX,
      top: spotY,
      width: spotW,
      height: spotH,
    });

    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      // Pin card to bottom of screen on mobile (<640px)
      setTooltipPos({
        top: 0,
        left: 0,
        side: 'pinned-bottom',
        arrowPos: 0,
      });
      return;
    }

    // Desktop: calculate side with most room
    const tooltipWidth = 350;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 190;

    const spaceBelow = window.innerHeight - (spotY + spotH) - 16;
    const spaceAbove = spotY - 16;
    const spaceRight = window.innerWidth - (spotX + spotW) - 16;
    const spaceLeft = spotX - 16;

    const options = [
      { side: 'below' as const, space: spaceBelow },
      { side: 'above' as const, space: spaceAbove },
      { side: 'right' as const, space: spaceRight },
      { side: 'left' as const, space: spaceLeft },
    ];
    options.sort((a, b) => b.space - a.space);

    let chosenSide: 'below' | 'above' | 'right' | 'left' = options[0].side;

    // Prefer below or above if there is ample room (>= 200px)
    if (spaceBelow >= 200) {
      chosenSide = 'below';
    } else if (spaceAbove >= 200 && spaceRight < 360 && spaceLeft < 360) {
      chosenSide = 'above';
    }

    let top = 0;
    let left = 0;
    let arrowPos = 16;

    if (chosenSide === 'below') {
      top = spotY + spotH + 12;
      left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, spotX + spotW / 2 - tooltipWidth / 2));
      arrowPos = Math.max(16, Math.min(tooltipWidth - 26, spotX + spotW / 2 - left - 6));
    } else if (chosenSide === 'above') {
      top = Math.max(16, spotY - tooltipHeight - 12);
      left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, spotX + spotW / 2 - tooltipWidth / 2));
      arrowPos = Math.max(16, Math.min(tooltipWidth - 26, spotX + spotW / 2 - left - 6));
    } else if (chosenSide === 'right') {
      left = spotX + spotW + 12;
      top = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, spotY + spotH / 2 - tooltipHeight / 2));
      arrowPos = Math.max(16, Math.min(tooltipHeight - 26, spotY + spotH / 2 - top - 6));
    } else if (chosenSide === 'left') {
      left = Math.max(16, spotX - tooltipWidth - 12);
      top = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, spotY + spotH / 2 - tooltipHeight / 2));
      arrowPos = Math.max(16, Math.min(tooltipHeight - 26, spotY + spotH / 2 - top - 6));
    }

    setTooltipPos({
      top,
      left,
      side: chosenSide,
      arrowPos,
    });
  }, [activeElement]);

  // Navigate to target step index with automatic skipping of missing/hidden elements
  const goToStep = useCallback(
    async (targetIdx: number, direction: 1 | -1 = 1) => {
      if (targetIdx < 0 || targetIdx >= rawSteps.length) {
        // Tour finished or out of range
        setHasSeenTour();
        onClose();
        // Return focus to tour button
        setTimeout(() => {
          (document.querySelector('[data-tour="tour-button"]') as HTMLElement)?.focus();
        }, 100);
        return;
      }

      setIsTransitioning(true);
      let curr = targetIdx;

      while (curr >= 0 && curr < rawSteps.length) {
        const step = rawSteps[curr];
        const el = await resolveStepElement(step);

        if (el) {
          // Found valid visible element
          setActiveElement(el);
          setCurrentStepIndex(curr);

          // Scroll into view smoothly
          const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const isMobile = window.innerWidth < 640;

          el.scrollIntoView({
            behavior: prefersReduced ? 'auto' : 'smooth',
            block: isMobile ? 'start' : 'center',
            inline: 'nearest',
          });

          // Allow scroll to settle before measuring
          setTimeout(() => {
            updatePositions();
            setIsTransitioning(false);
            // Move focus to Next button
            nextBtnRef.current?.focus();
          }, prefersReduced ? 50 : 200);

          return;
        }

        // Element missing or hidden, skip silently
        curr += direction;
      }

      // If no valid steps found in that direction, finish tour
      setHasSeenTour();
      onClose();
      setTimeout(() => {
        (document.querySelector('[data-tour="tour-button"]') as HTMLElement)?.focus();
      }, 100);
    },
    [rawSteps, onClose, updatePositions]
  );

  // Initialize or restart tour when isOpen changes to true
  useEffect(() => {
    if (isOpen) {
      goToStep(0, 1);
    } else {
      setActiveElement(null);
      setSpotlightRect(null);
    }
  }, [isOpen]);

  // Window resize, scroll, and animation frame tracking
  useEffect(() => {
    if (!isOpen || !activeElement) return;

    const handleUpdate = () => {
      updatePositions();
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { capture: true, passive: true });

    let animationId: number;
    const loop = () => {
      updatePositions();
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      cancelAnimationFrame(animationId);
    };
  }, [isOpen, activeElement, updatePositions]);

  // Keyboard navigation: Right/Enter = Next, Left = Back, Esc = Skip
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        goToStep(currentStepIndex + 1, 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToStep(currentStepIndex - 1, -1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setHasSeenTour();
        onClose();
        setTimeout(() => {
          (document.querySelector('[data-tour="tour-button"]') as HTMLElement)?.focus();
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, goToStep, onClose]);

  if (!isOpen || !activeElement || !spotlightRect) {
    return null;
  }

  const currentStep = rawSteps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  // Calculate total visible steps estimate (steps that satisfy condition)
  const eligibleSteps = rawSteps.filter((s) => !s.condition || s.condition());
  const currentStepNumber = eligibleSteps.findIndex((s) => s.id === currentStep.id) + 1 || currentStepIndex + 1;
  const totalVisibleCount = eligibleSteps.length;
  const isLast = currentStepNumber >= totalVisibleCount || currentStepIndex === rawSteps.length - 1;

  const handleNext = () => goToStep(currentStepIndex + 1, 1);
  const handlePrev = () => goToStep(currentStepIndex - 1, -1);
  const handleSkip = () => {
    setHasSeenTour();
    onClose();
    setTimeout(() => {
      (document.querySelector('[data-tour="tour-button"]') as HTMLElement)?.focus();
    }, 100);
  };

  const isMobile = tooltipPos.side === 'pinned-bottom';

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden select-none" role="presentation">
      {/* Screen reader polite announcement of step change */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Step ${currentStepNumber} of ${totalVisibleCount}: ${currentStep.title}. ${currentStep.description}`}
      </div>

      {/* 1. SVG Mask Dimming Overlay with 8px padded rounded transparent cutout */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        style={{ width: '100vw', height: '100vh' }}
        aria-hidden="true"
        onClick={handleSkip}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White background: dim everything */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout: leaves target element clear and fully visible */}
            <rect
              x={spotlightRect.left}
              y={spotlightRect.top}
              width={spotlightRect.width}
              height={spotlightRect.height}
              rx="12"
              ry="12"
              fill="black"
            />
          </mask>
        </defs>
        {/* Dimmed backdrop (82% opacity dark space background) */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4, 7, 14, 0.82)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* 2. Spotlight Box with bright cyan glow and 8px padding */}
      <div
        style={{
          position: 'fixed',
          top: `${spotlightRect.top}px`,
          left: `${spotlightRect.left}px`,
          width: `${spotlightRect.width}px`,
          height: `${spotlightRect.height}px`,
          borderRadius: '12px',
          border: '2px solid #22d3ee',
          boxShadow:
            '0 0 0 1px rgba(6, 182, 212, 0.4), 0 0 25px rgba(34, 211, 238, 0.5), inset 0 0 14px rgba(34, 211, 238, 0.15)',
          pointerEvents: 'none',
          transition: prefersReducedMotion ? 'none' : 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        aria-hidden="true"
      />

      {/* 3. Tooltip Card */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-desc"
        style={
          isMobile
            ? {
                position: 'fixed',
                bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
                left: '12px',
                right: '12px',
                width: 'calc(100% - 24px)',
                maxWidth: '480px',
                margin: '0 auto',
                zIndex: 101,
              }
            : {
                position: 'fixed',
                top: `${tooltipPos.top}px`,
                left: `${tooltipPos.left}px`,
                width: '350px',
                zIndex: 101,
                transition: prefersReducedMotion ? 'none' : 'top 0.18s ease-out, left 0.18s ease-out',
              }
        }
        className="rounded-2xl border border-zinc-700/90 bg-[#0c1017]/95 p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-zinc-100 flex flex-col gap-3.5"
      >
        {/* Small Arrow pointing at element on Desktop */}
        {!isMobile && (
          <div
            style={
              tooltipPos.side === 'below'
                ? {
                    position: 'absolute',
                    top: '-6px',
                    left: `${tooltipPos.arrowPos}px`,
                    width: '12px',
                    height: '12px',
                    transform: 'rotate(45deg)',
                    backgroundColor: '#0c1017',
                    borderTop: '1px solid #3f3f46',
                    borderLeft: '1px solid #3f3f46',
                  }
                : tooltipPos.side === 'above'
                ? {
                    position: 'absolute',
                    bottom: '-6px',
                    left: `${tooltipPos.arrowPos}px`,
                    width: '12px',
                    height: '12px',
                    transform: 'rotate(45deg)',
                    backgroundColor: '#0c1017',
                    borderBottom: '1px solid #3f3f46',
                    borderRight: '1px solid #3f3f46',
                  }
                : tooltipPos.side === 'right'
                ? {
                    position: 'absolute',
                    left: '-6px',
                    top: `${tooltipPos.arrowPos}px`,
                    width: '12px',
                    height: '12px',
                    transform: 'rotate(45deg)',
                    backgroundColor: '#0c1017',
                    borderBottom: '1px solid #3f3f46',
                    borderLeft: '1px solid #3f3f46',
                  }
                : {
                    position: 'absolute',
                    right: '-6px',
                    top: `${tooltipPos.arrowPos}px`,
                    width: '12px',
                    height: '12px',
                    transform: 'rotate(45deg)',
                    backgroundColor: '#0c1017',
                    borderTop: '1px solid #3f3f46',
                    borderRight: '1px solid #3f3f46',
                  }
            }
            aria-hidden="true"
          />
        )}

        {/* Header: Step counter ("3 of 9") and Skip Tour button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300">
              {currentStepNumber} of {totalVisibleCount}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 -mr-2 -mt-2"
            aria-label="Skip guided tour"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content: Step Title & Description */}
        <div className="flex flex-col gap-1.5">
          <h3 id="tour-step-title" className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
            <span>{currentStep.title}</span>
          </h3>
          <p id="tour-step-desc" className="text-xs text-zinc-300 leading-relaxed font-sans">
            {currentStep.description}
          </p>
        </div>

        {/* Action Buttons: All at least 44px tall for touch target accessibility */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={handleSkip}
            className="min-h-[44px] px-2.5 flex items-center text-xs font-mono text-zinc-400 hover:text-zinc-200 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isTransitioning}
                className="min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-xs font-medium text-zinc-200 hover:text-white transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                aria-label="Previous tour step (Left arrow key)"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            <button
              ref={nextBtnRef}
              type="button"
              onClick={handleNext}
              disabled={isTransitioning}
              className="min-h-[44px] px-5 flex items-center gap-2 rounded-xl font-semibold text-xs transition bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label={isLast ? 'Finish tour' : 'Next tour step (Right arrow or Enter key)'}
            >
              {isLast ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Finish</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
