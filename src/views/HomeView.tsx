import React, { useState, useMemo } from 'react';
import {
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Inbox,
  Clock,
} from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';
import { TaskEntity, Priority, PRIORITY_OPTIONS } from '../types';
import { TasksDidTodayCard } from '../components/TasksDidTodayCard';
import { TaskCard } from '../components/TaskCard';
import { TaskDialog } from '../components/TaskDialog';
import { PostponeDialog } from '../components/PostponeDialog';
import { TaskHistoryModal } from '../components/TaskHistoryModal';

export const HomeView: React.FC = () => {
  const {
    tasksDueToday,
    pendingTasks,
    completedTasks,
    categories,
    todayStr,
  } = useMomentum();

  // State for modals
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskEntity | null>(null);
  const [taskToPostpone, setTaskToPostpone] = useState<TaskEntity | null>(null);
  const [taskForHistory, setTaskForHistory] = useState<TaskEntity | null>(null);

  // Filters
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  // Category map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Filtering helper
  const filterTask = (task: TaskEntity) => {
    if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) {
      return false;
    }
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'uncategorized') {
        if (task.categoryId !== null) return false;
      } else if (task.categoryId !== selectedCategory) {
        return false;
      }
    }
    return true;
  };

  // Today's active tasks (due today and not completed)
  const filteredTodayTasks = useMemo(() => {
    return tasksDueToday.filter(filterTask);
  }, [tasksDueToday, selectedPriority, selectedCategory]);

  // Upcoming / other pending tasks (due after today or no specific date, pending/postponed)
  const filteredUpcomingTasks = useMemo(() => {
    return pendingTasks
      .filter((t) => t.dueDate !== todayStr)
      .filter(filterTask)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [pendingTasks, todayStr, selectedPriority, selectedCategory]);

  const filteredCompletedTasks = useMemo(() => {
    return completedTasks.filter(filterTask);
  }, [completedTasks, selectedPriority, selectedCategory]);

  return (
    <div className="w-full space-y-6 pb-24">
      {/* 1. Visually Prominent: Tasks Did Today */}
      <TasksDidTodayCard />

      {/* 2. Filter Bar & Quick Stats */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Home Dashboard
            </h2>
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              ({pendingTasks.length} pending · {completedTasks.length} completed)
            </span>
          </div>

          {/* New Task CTA */}
          <button
            onClick={() => setIsNewTaskOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] shadow-sm transition-all min-h-[40px]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Priority Filter Segmented Bar (Interactive controls allowed per design constitution) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedPriority('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors min-h-[36px] ${
              selectedPriority === 'ALL'
                ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]'
                : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
            }`}
          >
            All Priorities
          </button>
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                selectedPriority === p
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Category Filter Selector if categories exist */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="uncategorized">Uncategorized</option>
            </select>
            {(selectedPriority !== 'ALL' || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedPriority('ALL');
                  setSelectedCategory('ALL');
                }}
                className="text-[11px] text-[var(--accent-primary)] hover:underline ml-1"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* 3. Today's Tasks Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Scheduled For Today
            </h3>
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              ({filteredTodayTasks.length})
            </span>
          </div>
        </div>

        {filteredTodayTasks.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[var(--border-subtle)] text-center bg-[var(--bg-surface)]/50">
            <p className="text-xs text-[var(--text-muted)]">
              No pending tasks scheduled for today.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTodayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => setTaskToEdit(t)}
                onPostpone={(t) => setTaskToPostpone(t)}
                onViewHistory={(t) => setTaskForHistory(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Upcoming & Backlog Tasks Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--accent-secondary)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Upcoming & Backlog Tasks
            </h3>
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              ({filteredUpcomingTasks.length})
            </span>
          </div>
        </div>

        {filteredUpcomingTasks.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[var(--border-subtle)] text-center bg-[var(--bg-surface)]/50">
            <p className="text-xs text-[var(--text-muted)]">
              No upcoming or backlog tasks matching your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredUpcomingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => setTaskToEdit(t)}
                onPostpone={(t) => setTaskToPostpone(t)}
                onViewHistory={(t) => setTaskForHistory(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Completed Tasks (Collapsible Accordion) */}
      <section className="pt-2 border-t border-[var(--border-subtle)]">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all text-xs font-semibold text-[var(--text-secondary)]"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All Completed Tasks</span>
            <span className="text-[var(--text-muted)] tabular-nums">
              ({filteredCompletedTasks.length})
            </span>
          </div>
          {showCompleted ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </button>

        {showCompleted && (
          <div className="space-y-2.5 mt-3 animate-in fade-in duration-150">
            {filteredCompletedTasks.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">
                No completed tasks found for current filters.
              </p>
            ) : (
              filteredCompletedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={(t) => setTaskToEdit(t)}
                  onPostpone={(t) => setTaskToPostpone(t)}
                  onViewHistory={(t) => setTaskForHistory(t)}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* Dialog Modals */}
      <TaskDialog
        isOpen={isNewTaskOpen || taskToEdit !== null}
        onClose={() => {
          setIsNewTaskOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
      />

      <PostponeDialog
        isOpen={taskToPostpone !== null}
        task={taskToPostpone}
        onClose={() => setTaskToPostpone(null)}
      />

      <TaskHistoryModal
        isOpen={taskForHistory !== null}
        task={taskForHistory}
        onClose={() => setTaskForHistory(null)}
      />
    </div>
  );
};
