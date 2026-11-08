import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, FolderPlus, Tag } from 'lucide-react';
import { TaskEntity, Priority, PRIORITY_OPTIONS } from '../types';
import { useMomentum } from '../context/MomentumContext';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskEntity | null;
}

export const TaskDialog: React.FC<TaskDialogProps> = ({
  isOpen,
  onClose,
  taskToEdit,
}) => {
  const { createTask, updateTask, categories, todayStr } = useMomentum();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(todayStr);
  const [priority, setPriority] = useState<Priority>('Present 1');
  const [categoryId, setCategoryId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setNotes(taskToEdit.notes || '');
      setDueDate(taskToEdit.dueDate || todayStr);
      setPriority(taskToEdit.priority || 'Present 1');
      setCategoryId(taskToEdit.categoryId || '');
    } else {
      setTitle('');
      setNotes('');
      setDueDate(todayStr);
      setPriority('Present 1');
      setCategoryId('');
    }
    setErrorMessage('');
  }, [taskToEdit, isOpen, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a task title');
      return;
    }

    try {
      if (taskToEdit) {
        updateTask(taskToEdit.id, {
          title: title.trim(),
          notes: notes.trim(),
          dueDate,
          priority,
          categoryId: categoryId ? categoryId : null,
        });
      } else {
        createTask({
          title: title.trim(),
          notes: notes.trim(),
          dueDate,
          priority,
          categoryId: categoryId ? categoryId : null,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save task';
      setErrorMessage(msg);
    }
  };

  const getPriorityDescription = (p: Priority) => {
    switch (p) {
      case 'Present 1':
        return 'Top Focus · Urgent';
      case 'Present 5':
        return 'Current Sprint · Normal';
      case 'Later 1':
        return 'Deferred · High Value';
      case 'Later 5':
        return 'Backlog · Someday';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {taskToEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-700 dark:text-rose-400">
              {errorMessage}
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="task-title"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete quarterly product review"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors min-h-[44px]"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="task-notes"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Notes (Optional)
            </label>
            <textarea
              id="task-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key context, links, or criteria..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors resize-none"
            />
          </div>

          {/* Grid: Due Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Due Date */}
            <div>
              <label
                htmlFor="task-duedate"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Due Date</span>
              </label>
              <input
                id="task-duedate"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none text-[var(--text-primary)] min-h-[44px]"
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="task-category"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1"
              >
                <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Category</span>
              </label>
              <select
                id="task-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none text-[var(--text-primary)] min-h-[44px]"
              >
                <option value="">No Category (Uncategorized)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority Selection: EXACTLY the 4 required options */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-1">
              <Flag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Priority Level</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex flex-col text-left p-2.5 rounded-xl border transition-all min-h-[52px] ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-highlight)] text-[var(--text-primary)] ring-1 ring-[var(--accent-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight">
                      {p}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {getPriorityDescription(p)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-[var(--accent-contrast)] bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors min-h-[40px]"
            >
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
