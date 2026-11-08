import React, { useState } from 'react';
import { X, Clock, Calendar, ArrowRight } from 'lucide-react';
import { TaskEntity } from '../types';
import { useMomentum } from '../context/MomentumContext';
import { formatDateStr } from '../db/storage';

interface PostponeDialogProps {
  task: TaskEntity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PostponeDialog: React.FC<PostponeDialogProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { postponeTask } = useMomentum();

  const getPresetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatDateStr(d);
  };

  const [selectedDate, setSelectedDate] = useState(() => getPresetDate(1));
  const [reason, setReason] = useState('');

  if (!isOpen || !task) return null;

  const handlePostpone = (newDate: string) => {
    postponeTask(task.id, newDate, reason.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Postpone Task
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Postponing:</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 truncate">
              {task.title}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Current Due Date: <span className="font-medium tabular-nums">{task.dueDate}</span>
            </p>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
              Choose New Due Date
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(getPresetDate(1))}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all min-h-[40px] ${
                  selectedDate === getPresetDate(1)
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-highlight)] text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                Tomorrow (+1d)
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getPresetDate(3))}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all min-h-[40px] ${
                  selectedDate === getPresetDate(3)
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-highlight)] text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                +3 Days
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getPresetDate(7))}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all min-h-[40px] ${
                  selectedDate === getPresetDate(7)
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-highlight)] text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                Next Week (+7d)
              </button>
            </div>
          </div>

          {/* Custom Date Input */}
          <div>
            <label
              htmlFor="custom-postpone-date"
              className="block text-xs font-medium text-[var(--text-muted)] mb-1 flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Or Select Custom Date</span>
            </label>
            <input
              id="custom-postpone-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none text-[var(--text-primary)] min-h-[44px]"
            />
          </div>

          {/* Reason (Optional) */}
          <div>
            <label
              htmlFor="postpone-reason"
              className="block text-xs font-medium text-[var(--text-muted)] mb-1"
            >
              Reason / Context (Optional)
            </label>
            <input
              id="postpone-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Awaiting client specs, rescheduled"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-h-[44px]"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handlePostpone(selectedDate)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors min-h-[40px]"
            >
              <span>Confirm Postpone</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
