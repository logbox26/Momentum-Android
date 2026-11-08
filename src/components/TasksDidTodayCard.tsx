import React from 'react';
import { Flame } from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';

export const TasksDidTodayCard: React.FC = () => {
  const { tasksCompletedToday } = useMomentum();
  const count = tasksCompletedToday.length;

  return (
    <section
      aria-label="Tasks Did Today"
      className="w-full rounded-2xl p-4 sm:p-5 border transition-all duration-200"
      style={{
        backgroundColor: 'var(--card-today)',
        borderColor: 'var(--card-today-border)',
        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] flex items-center justify-center shrink-0 shadow-sm">
            <Flame className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            {/* Slightly larger text than surrounding secondary information */}
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] truncate">
              Tasks Did Today
            </h2>
            <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5 truncate">
              {count === 0
                ? 'Ready to make progress today'
                : count === 1
                ? '1 task completed today · Great start!'
                : `${count} tasks completed today · Momentum active`}
            </p>
          </div>
        </div>

        {/* Distinct Prominent Number */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs shrink-0">
          <span className="text-3xl sm:text-4xl font-extrabold text-[var(--accent-primary)] tabular-nums leading-none">
            {count}
          </span>
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Done
          </span>
        </div>
      </div>
    </section>
  );
};
