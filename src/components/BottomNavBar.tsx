import React from 'react';
import {
  Home,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';

export const BottomNavBar: React.FC = () => {
  const { activeTab, setActiveTab } = useMomentum();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <nav
      aria-label="Primary Navigation"
      className="sticky bottom-0 z-30 w-full bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] transition-colors"
    >
      <div className="grid grid-cols-3 items-center max-w-sm mx-auto h-16 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-[var(--accent-primary)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                  isActive
                    ? 'bg-[var(--bg-highlight)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon className="w-5 h-5 transition-transform duration-150" />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5 truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
