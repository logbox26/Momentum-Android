/**
 * Momentum Data Models
 * Designed to mirror Kotlin Jetpack Compose + Room entities
 */

export type Priority = 'Present 1' | 'Present 5' | 'Later 1' | 'Later 5';

export const PRIORITY_OPTIONS: readonly Priority[] = [
  'Present 1',
  'Present 5',
  'Later 1',
  'Later 5',
] as const;

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
    previousPriority?: Priority;
    newPriority?: Priority;
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
    present5: number;
    later1: number;
    later5: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

