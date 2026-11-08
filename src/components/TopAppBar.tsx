import React from 'react';
import { Smartphone, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';

export const TopAppBar: React.FC = () => {
  const { currentTheme, deviceFrameEnabled, toggleDeviceFrame, activeTab } = useMomentum();

  const getThemeTitle = () => {
    switch (currentTheme) {
      case 'calm-blue':
        return 'Calm Blue';
      case 'sage-green':
        return 'Sage Green';
      case 'warm-focus':
        return 'Warm Focus';
      case 'modern-slate':
        return 'Modern Slate';
      case 'deep-focus':
        return 'Deep Focus';
      default:
        return 'Theme';
    }
  };

  const getScreenTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'Momentum';
      case 'reports':
        return 'Productivity Reports';
      case 'settings':
        return 'Settings';
      default:
        return 'Momentum';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] transition-colors">
      <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
        {/* Brand & Screen Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-contrast)] font-bold text-sm shrink-0 shadow-sm">
            M
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)] truncate">
              {getScreenTitle()}
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1.5">
              <span>Offline First</span>
              <span aria-hidden="true">·</span>
              <span>Room DB</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{getThemeTitle()}</span>
            </p>
          </div>
        </div>

        {/* Top App Bar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Offline Verified Indicator */}
          <div
            title="Fully offline with local Room persistence. No network required."
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Local Only</span>
          </div>

          {/* Toggle Device Frame / Fullscreen View */}
          <button
            onClick={toggleDeviceFrame}
            title={deviceFrameEnabled ? 'Switch to Full Screen Responsive Canvas' : 'Preview in Android Device Frame'}
            aria-label="Toggle device frame"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors min-h-[40px]"
          >
            {deviceFrameEnabled ? (
              <>
                <Monitor className="w-4 h-4 text-[var(--accent-primary)]" />
                <span className="hidden sm:inline">Expanded</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-[var(--accent-primary)]" />
                <span className="hidden sm:inline">Phone Frame</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
