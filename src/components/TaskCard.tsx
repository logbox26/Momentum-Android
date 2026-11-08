import React from 'react';
import {
  Check,
  RotateCcw,
  Clock,
  Calendar,
  MoreVertical,
  History,
  Edit2,
  Trash2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { TaskEntity, Priority } from '../types';
import { useMomentum } from '../context/MomentumContext';

interface TaskCardProps {
  task: TaskEntity;
  onEdit: (task: TaskEntity) => void;
  onPostpone: (task: TaskEntity) => void;
  onViewHistory: (task: TaskEntity) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onPostpone,
  onViewHistory,
}) => {
  const { completeTask, reopenTask, deleteTask, categories, todayStr } = useMomentum();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));
  const categoryName = task.categoryId ? categoryMap.get(task.categoryId) || null : null;

  const isCompleted = task.status === 'COMPLETED';
  const isPostponed = task.status === 'POSTPONED';
  const isOverdue = !isCompleted && task.dueDate < todayStr;
  const isDueToday = !isCompleted && task.dueDate === todayStr;

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'Present 1':
        return 'text-rose-700 dark:text-rose-400 font-semibold';
      case 'Present 5':
        return 'text-amber-700 dark:text-amber-400 font-medium';
      case 'Later 1':
        return 'text-sky-700 dark:text-sky-400 font-medium';
      case 'Later 5':
        return 'text-[var(--text-muted)] font-normal';
    }
  };

  const handleToggleComplete = () => {
    if (isCompleted) {
      reopenTask(task.id);
    } else {
      completeTask(task.id);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${task.title}"? This action will be recorded in task history.`)) {
      deleteTask(task.id);
    }
    setMenuOpen(false);
  };

  return (
    <article
      className={`group relative rounded-xl border bg-[var(--bg-surface)] p-3.5 transition-all duration-150 hover:shadow-sm ${
        isCompleted
          ? 'border-[var(--border-subtle)] opacity-75'
          : isOverdue
          ? 'border-rose-300 dark:border-rose-900/50'
          : isDueToday
          ? 'border-[var(--accent-secondary)]/50'
          : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox Touch Target >= 44px */}
        <button
          onClick={handleToggleComplete}
          aria-label={isCompleted ? 'Mark pending' : 'Mark completed'}
          className={`mt-0.5 w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors min-h-[44px] min-w-[44px] -ml-2.5 -mt-2.5 p-2.5 ${
            isCompleted
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-[var(--border-strong)] hover:border-[var(--accent-primary)] bg-[var(--bg-surface)] text-transparent hover:text-[var(--text-muted)]'
          }`}
        >
          <div
            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
              isCompleted
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-[var(--border-strong)]'
            }`}
          >
            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => onEdit(task)}
              className={`text-sm font-semibold cursor-pointer transition-colors ${
                isCompleted
                  ? 'text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/50'
                  : 'text-[var(--text-primary)] hover:text-[var(--accent-primary)]'
              }`}
            >
              {task.title}
            </h3>

            {/* Overflow Menu Button */}
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Task options"
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] min-h-[40px] min-w-[40px] flex items-center justify-center -mr-2 -mt-1"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-50 w-44 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg py-1 text-xs">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(task);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Edit Task</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onPostpone(task);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
                    >
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Postpone</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onViewHistory(task);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
                    >
                      <History className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>View History</span>
                    </button>

                    <div className="my-1 border-t border-[var(--border-subtle)]" />

                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Task</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes preview if any */}
          {task.notes && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1">
              {task.notes}
            </p>
          )}

          {/* Unboxed Metadata per Zero-Pill Constitution */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] mt-2">
            {/* Priority */}
            <span className={getPriorityStyle(task.priority)}>
              {task.priority}
            </span>

            {/* Category */}
            {categoryName && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--text-secondary)]">{categoryName}</span>
              </>
            )}

            {/* Due date */}
            <span aria-hidden="true">·</span>
            <span
              className={`flex items-center gap-1 tabular-nums ${
                isOverdue
                  ? 'text-rose-600 dark:text-rose-400 font-medium'
                  : isDueToday
                  ? 'text-[var(--accent-primary)] font-medium'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>
                {isDueToday ? 'Today' : isOverdue ? `Overdue (${task.dueDate})` : task.dueDate}
              </span>
            </span>

            {/* Postpone status */}
            {task.postponedCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 dark:text-amber-400 tabular-nums">
                  Postponed {task.postponedCount}×
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
