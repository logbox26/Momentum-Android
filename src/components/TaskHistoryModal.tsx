import React from 'react';
import { X, History, PlusCircle, CheckCircle2, RotateCcw, Clock, Calendar, Flag, Tag, Edit3 } from 'lucide-react';
import { TaskEntity, TaskHistoryEntity } from '../types';
import { useMomentum } from '../context/MomentumContext';

interface TaskHistoryModalProps {
  task: TaskEntity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { history } = useMomentum();

  if (!isOpen || !task) return null;

  const taskEvents = history
    .filter((h) => h.taskId === task.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  const getEventIcon = (type: TaskHistoryEntity['eventType']) => {
    switch (type) {
      case 'TASK_CREATED':
        return <PlusCircle className="w-4 h-4 text-emerald-600" />;
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'TASK_REOPENED':
        return <RotateCcw className="w-4 h-4 text-sky-600" />;
      case 'TASK_POSTPONED':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'DUE_DATE_CHANGED':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'PRIORITY_CHANGED':
        return <Flag className="w-4 h-4 text-rose-600" />;
      case 'CATEGORY_CHANGED':
        return <Tag className="w-4 h-4 text-purple-600" />;
      default:
        return <Edit3 className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatEventTimestamp = (ms: number) => {
    const d = new Date(ms);
    return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl overflow-hidden flex flex-col max-h-[85vh] transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                Task History Audit Log
              </h2>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {task.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Event List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {taskEvents.length === 0 ? (
            <p className="text-xs text-center text-[var(--text-muted)] py-6">
              No historical events recorded for this task.
            </p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-subtle)]">
              {taskEvents.map((evt) => (
                <div key={evt.id} className="relative">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center">
                    {getEventIcon(evt.eventType)}
                  </div>
                  <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                      <span className="font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                        {evt.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="tabular-nums">
                        {formatEventTimestamp(evt.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                      {evt.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-highlight)] text-[var(--text-primary)] transition-colors min-h-[40px]"
          >
            Close Log
          </button>
        </div>
      </div>
    </div>
  );
};
