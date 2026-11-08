import React, { useState } from 'react';
import { X, Tag, Plus, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';
import { CategoryEntity } from '../types';
import { useMomentum } from '../context/MomentumContext';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { categories, createCategory, renameCategory, deleteCategorySafely } = useMomentum();

  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      createCategory(newCatName.trim());
      setNewCatName('');
      setErrorMessage('');
      setInfoMessage('Category created successfully.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const startRename = (cat: CategoryEntity) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setErrorMessage('');
    setInfoMessage('');
  };

  const saveRename = (id: string) => {
    if (!editName.trim()) return;
    try {
      renameCategory(id, editName.trim());
      setEditingId(null);
      setErrorMessage('');
      setInfoMessage('Category renamed.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to rename category');
    }
  };

  const handleDelete = (id: string, name: string) => {
    const confirmed = window.confirm(
      `Delete category "${name}"?\n\nSafety guarantee: None of your tasks will be deleted. Any tasks in this category will remain safe and become Uncategorized.`
    );
    if (!confirmed) return;

    try {
      const res = deleteCategorySafely(id);
      setErrorMessage('');
      setInfoMessage(
        `Category deleted safely. ${res.affectedTasksCount} task(s) preserved as Uncategorized.`
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete category');
    }
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
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[var(--accent-primary)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Category Management
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Safety Notice */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong>Safe Deletion Guarantee:</strong> Deleting a category never deletes its tasks. Existing tasks remain valid and move to Uncategorized.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-700 dark:text-rose-400">
              {errorMessage}
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {infoMessage}
            </div>
          )}

          {/* Create Category Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Add new category name..."
              className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-h-[44px]"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors min-h-[44px] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>

          {/* List of Categories */}
          <div className="space-y-2 mt-4">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Existing Categories ({categories.length})
            </p>

            {categories.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                No categories created yet.
              </p>
            ) : (
              categories.map((cat) => {
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          className="flex-1 px-2.5 py-1 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] focus:outline-none min-h-[36px]"
                        />
                        <button
                          type="button"
                          onClick={() => saveRename(cat.id)}
                          aria-label="Save category name"
                          className="p-1.5 rounded-md bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel rename"
                          className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-surface)] min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.colorHex || '#2563eb' }}
                          />
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {cat.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startRename(cat)}
                            title="Rename category"
                            aria-label={`Rename ${cat.name}`}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.name)}
                            title="Delete category safely"
                            aria-label={`Delete ${cat.name}`}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-highlight)] text-[var(--text-primary)] transition-colors min-h-[40px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
