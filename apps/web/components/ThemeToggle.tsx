import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl border flex items-center justify-center gap-1.5 transition active:scale-95 focus:outline-none focus-visible:ring-2 ${
        isDark
          ? 'bg-zinc-900/90 border-zinc-700/80 text-amber-300 hover:text-amber-200 hover:bg-zinc-800 focus-visible:ring-cyan-400'
          : 'bg-white border-slate-300 text-indigo-600 hover:text-indigo-800 hover:bg-slate-100 shadow-sm focus-visible:ring-indigo-500'
      } ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-300 shrink-0 transition-transform duration-300 hover:rotate-45" aria-hidden="true" />
          {showLabel && <span className="text-xs font-medium text-zinc-200">Light</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-600 shrink-0 transition-transform duration-300 hover:-rotate-12" aria-hidden="true" />
          {showLabel && <span className="text-xs font-medium text-slate-800">Dark</span>}
        </>
      )}
    </button>
  );
};
