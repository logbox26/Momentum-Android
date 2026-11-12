import React from 'react';
import { MomentumProvider, useMomentum } from './context/MomentumContext';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { HomeView } from './views/HomeView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { WifiOff, Battery, Wifi } from 'lucide-react';

const TABS: Array<'home' | 'reports' | 'settings'> = ['home', 'reports', 'settings'];

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, deviceFrameEnabled } = useMomentum();

  const mainRef = React.useRef<HTMLElement>(null);
  const swipeStartX = React.useRef<number | null>(null);
  const swipeStartY = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    if (!deviceFrameEnabled) {
      window.scrollTo(0, 0);
    }
  }, [activeTab, deviceFrameEnabled]);

  const handleSwipe = (deltaX: number, deltaY: number) => {
    // Requires at least 45px horizontal travel and horizontal dominance to protect vertical scroll
    if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      const currentIndex = TABS.indexOf(activeTab);
      if (deltaX < 0 && currentIndex < TABS.length - 1) {
        // Swipe left -> next tab
        setActiveTab(TABS[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right -> previous tab
        setActiveTab(TABS[currentIndex - 1]);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - swipeStartX.current;
    const deltaY = e.changedTouches[0].clientY - swipeStartY.current;
    handleSwipe(deltaX, deltaY);
    swipeStartX.current = null;
    swipeStartY.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button === 0) {
      swipeStartX.current = e.clientX;
      swipeStartY.current = e.clientY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && swipeStartX.current !== null && swipeStartY.current !== null) {
      const deltaX = e.clientX - swipeStartX.current;
      const deltaY = e.clientY - swipeStartY.current;
      handleSwipe(deltaX, deltaY);
      swipeStartX.current = null;
      swipeStartY.current = null;
    }
  };

  const renderActiveView = () => {
    const view = (() => {
      switch (activeTab) {
        case 'home':
          return <HomeView />;
        case 'reports':
          return <ReportsView />;
        case 'settings':
          return <SettingsView />;
        default:
          return <HomeView />;
      }
    })();

    return (
      <div key={activeTab} className="transition-opacity duration-150 ease-out">
        {view}
      </div>
    );
  };

  if (!deviceFrameEnabled) {
    // Expanded Responsive Layout (Full Screen)
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col transition-colors duration-200">
        <TopAppBar />
        <main
          ref={mainRef}
          className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {renderActiveView()}
        </main>
        <BottomNavBar />
      </div>
    );
  }

  // Native Android Device Frame (Pixel-style)
  return (
    <div className="min-h-screen bg-slate-900/10 dark:bg-black/60 flex items-center justify-center p-2 sm:p-6 transition-colors duration-200">
      <div className="relative w-full max-w-[430px] h-[92vh] max-h-[900px] bg-[var(--bg-app)] text-[var(--text-primary)] rounded-[40px] shadow-2xl border-[8px] border-slate-900/90 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-200">
        {/* Android Status Bar */}
        <div className="h-7 w-full bg-[var(--bg-surface)] px-6 flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)] select-none shrink-0 z-40">
          <span>9:41</span>
          {/* Camera Notch */}
          <div className="w-3.5 h-3.5 rounded-full bg-black/80 dark:bg-black shrink-0" />
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3 h-3 text-[var(--text-muted)]" />
            <Battery className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </div>
        </div>

        {/* Top App Bar */}
        <TopAppBar />

        {/* Scrollable Screen Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto px-4 pt-4 scrollbar-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {renderActiveView()}
        </main>

        {/* Bottom Nav Bar */}
        <BottomNavBar />

        {/* Android Gesture Bar */}
        <div className="h-3 w-full bg-[var(--bg-surface)] flex items-center justify-center shrink-0 z-40 pb-1">
          <div className="w-28 h-1 rounded-full bg-[var(--text-muted)]/40" />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <MomentumProvider>
      <AppContent />
    </MomentumProvider>
  );
}
