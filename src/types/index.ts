/**
 * Momentum Data Models
 * Designed to mirror Kotlin Jetpack Compose + Room entities
 */

export type Priority =
  | 'Present 1'
  | 'Present 2'
  | 'Present 15'
  | 'Future 1'
  | 'Future 2'
  | 'Trashable';

export const PRIORITY_OPTIONS: readonly Priority[] = [
  'Present 1',
  'Present 2',
  'Present 15',
  'Future 1',
  'Future 2',
  'Trashable',
] as const;

/**
 * Normalizes legacy and current priority strings safely.
 * Maps:
 * - Present 1 -> Present 1
 * - Present 5 -> Present 2
 * - Later 1 -> Future 1
 * - Later 5 -> Future 2
 */
export function normalizePriority(raw: string | undefined | null): Priority {
  if (!raw) return 'Present 1';
  const trimmed = raw.trim();
  switch (trimmed) {
    case 'Present 1':
      return 'Present 1';
    case 'Present 5':
      return 'Present 2';
    case 'Present 2':
      return 'Present 2';
    case 'Present 15':
      return 'Present 15';
    case 'Later 1':
      return 'Future 1';
    case 'Future 1':
      return 'Future 1';
    case 'Later 5':
      return 'Future 2';
    case 'Future 2':
      return 'Future 2';
    case 'Trashable':
      return 'Trashable';
    default:
      return 'Present 1';
  }
}

export type TaskStatus = 'PENDING' | 'COMPLETED' | 'POSTPONED';

export type HistoryEventType =
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'TASK_REOPENED'
  | 'TASK_POSTPONED'
  | 'DUE_DATE_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'CATEGORY_CHANGED'
  | 'TASK_EDITED'
  | 'TASK_DELETED';

export interface TaskEntity {
  id: string; // Stable UUID
  title: string;
  notes: string;
  createdDate: number; // Timestamp (epoch millis)
  dueDate: string; // Format: YYYY-MM-DD
  priority: Priority;
  categoryId: string | null; // Nullable; task remains valid if category is deleted
  status: TaskStatus;
  completedAt: number | null; // Timestamp (epoch millis) or null
  postponedCount: number;
  postponedUntil: string | null; // Format: YYYY-MM-DD or null
  updatedAt: number;
}

export interface TaskHistoryEntity {
  id: string; // Stable UUID
  taskId: string;
  taskTitle: string; // Snapshot of title at event time
  eventType: HistoryEventType;
  timestamp: number; // Epoch millis
  details: string; // Human-readable explanation of event
  metadata?: {
    previousStatus?: TaskStatus;
    newStatus?: TaskStatus;
    previousDueDate?: string | null;
    newDueDate?: string | null;
    previousPriority?: Priority | string;
    newPriority?: Priority | string;
    previousCategoryId?: string | null;
    newCategoryId?: string | null;
    categoryName?: string | null;
    postponedUntil?: string;
  };
}

export interface CategoryEntity {
  id: string; // Stable UUID
  name: string;
  colorHex?: string;
  createdAt: number;
}

export type ThemeId =
  | 'calm-blue'
  | 'sage-green'
  | 'warm-focus'
  | 'modern-slate'
  | 'deep-focus';

export interface SettingEntity {
  key: string;
  value: string;
}

export interface ReportCacheEntity {
  cacheKey: string; // e.g. "2026-11_quick_v12"
  month: string; // YYYY-MM
  reportType: 'quick' | 'detailed' | 'comparison';
  dataVersion: number;
  timestamp: number;
  payloadJson: string;
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  monthName: string; // e.g. "November 2026"
  tasksCreated: number;
  tasksCompleted: number;
  unfinishedTasks: number;
  postponedTasks: number;
  completionRate: number; // 0 to 100
  accomplishments: Array<{
    id: string;
    title: string;
    completedAt: number;
    notes?: string;
    priority: Priority;
    categoryName: string;
  }>;
  priorityBreakdown: Record<Priority, { created: number; completed: number; active: number }>;
  categoryBreakdown: Record<string, { name: string; completed: number; created: number }>;
  timelineEvents: TaskHistoryEntity[];
}

export interface MonthComparison {
  monthA: MonthlyStats;
  monthB: MonthlyStats;
  deltaCreated: number;
  deltaCompleted: number;
  deltaPostponed: number;
  deltaUnfinished: number;
  deltaCompletionRate: number;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  appName: string;
  tasks: TaskEntity[];
  taskHistory: TaskHistoryEntity[];
  categories: CategoryEntity[];
  settings: Record<string, string>;
  reportCaches?: ReportCacheEntity[];
}

export interface ReportsFourTiles {
  daily: {
    rate: number;
    completed: number;
    total: number;
  };
  weekly: {
    rate: number;
    completed: number;
    total: number;
  };
  monthly: {
    rate: number;
    completed: number;
    total: number;
  };
  unfinished: {
    total: number;
    present1: number;
    present2: number;
    present15: number;
    future1: number;
    future2: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

