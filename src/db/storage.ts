import {
  TaskEntity,
  TaskHistoryEntity,
  CategoryEntity,
  ReportCacheEntity,
  BackupPayload,
  Priority,
  ThemeId,
  normalizePriority,
} from '../types';

const STORAGE_KEYS = {
  TASKS: 'momentum_tasks_v1',
  HISTORY: 'momentum_history_v1',
  CATEGORIES: 'momentum_categories_v1',
  SETTINGS: 'momentum_settings_v1',
  REPORT_CACHE: 'momentum_report_cache_v1',
  DATA_VERSION: 'momentum_data_version_v1',
};

// Generate stable UUID
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'm_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

// Initial default categories
const DEFAULT_CATEGORIES: CategoryEntity[] = [
  { id: 'cat_work', name: 'Work & Projects', colorHex: '#2563eb', createdAt: 1730000000000 },
  { id: 'cat_personal', name: 'Personal & Health', colorHex: '#16a34a', createdAt: 1730000000000 },
  { id: 'cat_learning', name: 'Deep Learning', colorHex: '#9333ea', createdAt: 1730000000000 },
  { id: 'cat_admin', name: 'Admin & Logistics', colorHex: '#ea580c', createdAt: 1730000000000 },
];

// Helper to get formatted date string YYYY-MM-DD
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Seed initial realistic data with historical accuracy for demonstrations
function getInitialSeedData(): {
  tasks: TaskEntity[];
  history: TaskHistoryEntity[];
  categories: CategoryEntity[];
} {
  const now = Date.now();
  const todayStr = getTodayString();
  const oneDay = 24 * 60 * 60 * 1000;

  // Let's create dates:
  // 1. Task created today, completed today (for "Tasks Did Today")
  // 2. Task created 2 days ago, completed today
  // 3. Task created today, pending today (Present 1)
  // 4. Task created yesterday, postponed to tomorrow (Present 5)
  // 5. Task created 40 days ago (last month), completed last month
  // 6. Task created 35 days ago (last month), completed this month (historical reconstruction test case!)
  // 7. Task later backlog (Later 1)

  const task1Id = 'seed_task_1';
  const task2Id = 'seed_task_2';
  const task3Id = 'seed_task_3';
  const task4Id = 'seed_task_4';
  const task5Id = 'seed_task_5';
  const task6Id = 'seed_task_6';
  const task7Id = 'seed_task_7';

  // Last month date
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthCreated = lastMonthDate.getTime() - 5 * oneDay;
  const lastMonthCompleted = lastMonthDate.getTime();
  const lastMonthStr = formatDateStr(lastMonthDate);

  const tasks: TaskEntity[] = [
    {
      id: task1Id,
      title: 'Review Sprint Deliverables & Code Audits',
      notes: 'Completed technical verification of offline Room database layer.',
      createdDate: now - 3 * 3600 * 1000,
      dueDate: todayStr,
      priority: 'Present 1',
      categoryId: 'cat_work',
      status: 'COMPLETED',
      completedAt: now - 1 * 3600 * 1000,
      postponedCount: 0,
      postponedUntil: null,
      updatedAt: now - 1 * 3600 * 1000,
    },
    {
      id: task2Id,
      title: 'Morning 5km Cardio Run & Mobility',
      notes: 'Maintained 5:20/km pace in Zone 2 cardio.',
      createdDate: now - 2 * oneDay,
      dueDate: todayStr,
      priority: 'Present 2',
      categoryId: 'cat_personal',
      status: 'COMPLETED',
      completedAt: now - 4 * 3600 * 1000,
      postponedCount: 0,
      postponedUntil: null,
      updatedAt: now - 4 * 3600 * 1000,
    },
    {
      id: task3Id,
      title: 'Implement Room DAO Unit Test Coverage',
      notes: 'Verify historical reconstruction of task states across month boundaries.',
      createdDate: now - 4 * 3600 * 1000,
      dueDate: todayStr,
      priority: 'Present 1',
      categoryId: 'cat_work',
      status: 'PENDING',
      completedAt: null,
      postponedCount: 0,
      postponedUntil: null,
      updatedAt: now,
    },
    {
      id: task4Id,
      title: 'Refactor Category Safe Deletion Flow',
      notes: 'Ensure orphan tasks remain valid when categories are deleted.',
      createdDate: now - 1 * oneDay,
      dueDate: formatDateStr(new Date(now + oneDay)),
      priority: 'Present 2',
      categoryId: 'cat_learning',
      status: 'POSTPONED',
      completedAt: null,
      postponedCount: 1,
      postponedUntil: formatDateStr(new Date(now + oneDay)),
      updatedAt: now,
    },
    {
      id: task5Id,
      title: 'Monthly Financial Ledger Balancing',
      notes: 'Closed accounting for the previous fiscal period.',
      createdDate: lastMonthCreated,
      dueDate: lastMonthStr,
      priority: 'Present 1',
      categoryId: 'cat_admin',
      status: 'COMPLETED',
      completedAt: lastMonthCompleted,
      postponedCount: 0,
      postponedUntil: null,
      updatedAt: lastMonthCompleted,
    },
    {
      id: task6Id,
      title: 'Architecture Blueprint for Offline Sync Engine',
      notes: 'Drafted in prior month, finalized and completed this month.',
      createdDate: lastMonthCreated + 2 * oneDay,
      dueDate: todayStr,
      priority: 'Future 1',
      categoryId: 'cat_learning',
      status: 'COMPLETED',
      completedAt: now - 8 * 3600 * 1000, // completed this month!
      postponedCount: 1,
      postponedUntil: todayStr,
      updatedAt: now - 8 * 3600 * 1000,
    },
    {
      id: task7Id,
      title: 'Research Kotlin Multiplatform Compose for Desktop',
      notes: 'Investigate potential future cross-platform desktop target.',
      createdDate: now - 5 * oneDay,
      dueDate: formatDateStr(new Date(now + 7 * oneDay)),
      priority: 'Future 2',
      categoryId: 'cat_learning',
      status: 'PENDING',
      completedAt: null,
      postponedCount: 0,
      postponedUntil: null,
      updatedAt: now,
    },
  ];

  const history: TaskHistoryEntity[] = [
    // Task 1 events
    {
      id: 'hist_1_1',
      taskId: task1Id,
      taskTitle: 'Review Sprint Deliverables & Code Audits',
      eventType: 'TASK_CREATED',
      timestamp: now - 3 * 3600 * 1000,
      details: 'Task created with priority Present 1 and due date ' + todayStr,
      metadata: { newStatus: 'PENDING', newPriority: 'Present 1', newDueDate: todayStr },
    },
    {
      id: 'hist_1_2',
      taskId: task1Id,
      taskTitle: 'Review Sprint Deliverables & Code Audits',
      eventType: 'TASK_COMPLETED',
      timestamp: now - 1 * 3600 * 1000,
      details: 'Task marked as completed',
      metadata: { previousStatus: 'PENDING', newStatus: 'COMPLETED' },
    },
    // Task 2 events
    {
      id: 'hist_2_1',
      taskId: task2Id,
      taskTitle: 'Morning 5km Cardio Run & Mobility',
      eventType: 'TASK_CREATED',
      timestamp: now - 2 * oneDay,
      details: 'Task created with priority Present 2',
      metadata: { newStatus: 'PENDING', newPriority: 'Present 2' },
    },
    {
      id: 'hist_2_2',
      taskId: task2Id,
      taskTitle: 'Morning 5km Cardio Run & Mobility',
      eventType: 'TASK_COMPLETED',
      timestamp: now - 4 * 3600 * 1000,
      details: 'Task marked as completed',
      metadata: { previousStatus: 'PENDING', newStatus: 'COMPLETED' },
    },
    // Task 3 events
    {
      id: 'hist_3_1',
      taskId: task3Id,
      taskTitle: 'Implement Room DAO Unit Test Coverage',
      eventType: 'TASK_CREATED',
      timestamp: now - 4 * 3600 * 1000,
      details: 'Task created with priority Present 1 and due date ' + todayStr,
      metadata: { newStatus: 'PENDING', newPriority: 'Present 1' },
    },
    // Task 4 events
    {
      id: 'hist_4_1',
      taskId: task4Id,
      taskTitle: 'Refactor Category Safe Deletion Flow',
      eventType: 'TASK_CREATED',
      timestamp: now - 1 * oneDay,
      details: 'Task created with priority Present 2',
      metadata: { newStatus: 'PENDING', newPriority: 'Present 2' },
    },
    {
      id: 'hist_4_2',
      taskId: task4Id,
      taskTitle: 'Refactor Category Safe Deletion Flow',
      eventType: 'TASK_POSTPONED',
      timestamp: now - 2 * 3600 * 1000,
      details: `Postponed until ${formatDateStr(new Date(now + oneDay))}`,
      metadata: {
        previousStatus: 'PENDING',
        newStatus: 'POSTPONED',
        postponedUntil: formatDateStr(new Date(now + oneDay)),
      },
    },
    // Task 5 events (both created and completed in previous month)
    {
      id: 'hist_5_1',
      taskId: task5Id,
      taskTitle: 'Monthly Financial Ledger Balancing',
      eventType: 'TASK_CREATED',
      timestamp: lastMonthCreated,
      details: 'Task created in prior month',
      metadata: { newStatus: 'PENDING', newPriority: 'Present 1' },
    },
    {
      id: 'hist_5_2',
      taskId: task5Id,
      taskTitle: 'Monthly Financial Ledger Balancing',
      eventType: 'TASK_COMPLETED',
      timestamp: lastMonthCompleted,
      details: 'Completed within prior month',
      metadata: { previousStatus: 'PENDING', newStatus: 'COMPLETED' },
    },
    // Task 6 events (created in prior month, completed in CURRENT month)
    {
      id: 'hist_6_1',
      taskId: task6Id,
      taskTitle: 'Architecture Blueprint for Offline Sync Engine',
      eventType: 'TASK_CREATED',
      timestamp: lastMonthCreated + 2 * oneDay,
      details: 'Task created in prior month',
      metadata: { newStatus: 'PENDING', newPriority: 'Future 1' },
    },
    {
      id: 'hist_6_2',
      taskId: task6Id,
      taskTitle: 'Architecture Blueprint for Offline Sync Engine',
      eventType: 'TASK_POSTPONED',
      timestamp: lastMonthCreated + 6 * oneDay,
      details: 'Postponed to next month',
      metadata: { previousStatus: 'PENDING', newStatus: 'POSTPONED' },
    },
    {
      id: 'hist_6_3',
      taskId: task6Id,
      taskTitle: 'Architecture Blueprint for Offline Sync Engine',
      eventType: 'TASK_COMPLETED',
      timestamp: now - 8 * 3600 * 1000,
      details: 'Completed in current month',
      metadata: { previousStatus: 'POSTPONED', newStatus: 'COMPLETED' },
    },
    // Task 7 events
    {
      id: 'hist_7_1',
      taskId: task7Id,
      taskTitle: 'Research Kotlin Multiplatform Compose for Desktop',
      eventType: 'TASK_CREATED',
      timestamp: now - 5 * oneDay,
      details: 'Task created with priority Future 2',
      metadata: { newStatus: 'PENDING', newPriority: 'Future 2' },
    },
  ];

  return { tasks, history, categories: DEFAULT_CATEGORIES };
}

/**
 * MomentumRepository
 * Clean Room-compatible repository providing data access and transactions.
 */
export class MomentumRepository {
  private static instance: MomentumRepository;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): MomentumRepository {
    if (!MomentumRepository.instance) {
      MomentumRepository.instance = new MomentumRepository();
    }
    return MomentumRepository.instance;
  }

  private ensureInitialized(): void {
    try {
      const existingTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!existingTasks) {
        const seed = getInitialSeedData();
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(seed.tasks));
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(seed.history));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(seed.categories));
        localStorage.setItem(
          STORAGE_KEYS.SETTINGS,
          JSON.stringify({
            theme: 'calm-blue',
            fontSize: 'normal',
            deviceFrame: 'true',
          })
        );
        localStorage.setItem(STORAGE_KEYS.DATA_VERSION, '1');
      }
    } catch (e) {
      console.error('Failed to initialize Momentum local database:', e);
    }
  }

  public getDataVersion(): number {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
      return v ? parseInt(v, 10) : 1;
    } catch {
      return 1;
    }
  }

  private incrementDataVersion(): number {
    try {
      const current = this.getDataVersion();
      const next = current + 1;
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, next.toString());
      // Invalidate report cache when data version changes
      this.clearReportCache();
      return next;
    } catch {
      return 1;
    }
  }

  // --- Task Operations ---
  public getTasks(): TaskEntity[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
      const list: TaskEntity[] = raw ? JSON.parse(raw) : [];
      return list.map((t) => ({
        ...t,
        priority: normalizePriority(t.priority),
      }));
    } catch (e) {
      console.error('getTasks failed:', e);
      return [];
    }
  }

  public getTaskById(id: string): TaskEntity | undefined {
    return this.getTasks().find((t) => t.id === id);
  }

  public createTask(data: {
    title: string;
    notes: string;
    dueDate: string;
    priority: Priority;
    categoryId: string | null;
  }): TaskEntity {
    const now = Date.now();
    const newTask: TaskEntity = {
      id: generateId(),
      title: data.title.trim(),
      notes: data.notes.trim(),
      createdDate: now,
      dueDate: data.dueDate,
      priority: data.priority,
      categoryId: data.categoryId,
      status: 'PENDING',
      completedAt: null,
      postponedCount: 0,
      postponedUntil: null,
      updatedAt: now,
    };

    const tasks = this.getTasks();
    tasks.unshift(newTask);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    const categoryObj = newTask.categoryId
      ? this.getCategories().find((c) => c.id === newTask.categoryId)
      : null;

    // Record History Event
    this.recordHistoryEvent({
      taskId: newTask.id,
      taskTitle: newTask.title,
      eventType: 'TASK_CREATED',
      timestamp: now,
      details: `Created task with priority ${newTask.priority} and due date ${newTask.dueDate}`,
      metadata: {
        newStatus: 'PENDING',
        newPriority: newTask.priority,
        newDueDate: newTask.dueDate,
        newCategoryId: newTask.categoryId,
        categoryName: categoryObj?.name || (newTask.categoryId ? undefined : 'Uncategorized'),
      },
    });

    this.incrementDataVersion();
    return newTask;
  }

  public updateTask(
    taskId: string,
    updates: Partial<Omit<TaskEntity, 'id' | 'createdDate'>>
  ): TaskEntity {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const prev = tasks[index];
    const now = Date.now();
    const updated: TaskEntity = {
      ...prev,
      ...updates,
      updatedAt: now,
    };

    tasks[index] = updated;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    // Detect meaningful changes to record in history
    if (updates.dueDate && updates.dueDate !== prev.dueDate) {
      this.recordHistoryEvent({
        taskId,
        taskTitle: updated.title,
        eventType: 'DUE_DATE_CHANGED',
        timestamp: now,
        details: `Due date changed from ${prev.dueDate} to ${updates.dueDate}`,
        metadata: {
          previousDueDate: prev.dueDate,
          newDueDate: updates.dueDate,
        },
      });
    }

    if (updates.priority && updates.priority !== prev.priority) {
      this.recordHistoryEvent({
        taskId,
        taskTitle: updated.title,
        eventType: 'PRIORITY_CHANGED',
        timestamp: now,
        details: `Priority changed from ${prev.priority} to ${updates.priority}`,
        metadata: {
          previousPriority: prev.priority,
          newPriority: updates.priority,
        },
      });
    }

    if (updates.categoryId !== undefined && updates.categoryId !== prev.categoryId) {
      const newCatObj = updates.categoryId
        ? this.getCategories().find((c) => c.id === updates.categoryId)
        : null;
      this.recordHistoryEvent({
        taskId,
        taskTitle: updated.title,
        eventType: 'CATEGORY_CHANGED',
        timestamp: now,
        details: 'Category assignment changed',
        metadata: {
          previousCategoryId: prev.categoryId,
          newCategoryId: updates.categoryId,
          categoryName: newCatObj?.name || (updates.categoryId ? undefined : 'Uncategorized'),
        },
      });
    }

    if (
      (updates.title && updates.title !== prev.title) ||
      (updates.notes !== undefined && updates.notes !== prev.notes)
    ) {
      this.recordHistoryEvent({
        taskId,
        taskTitle: updated.title,
        eventType: 'TASK_EDITED',
        timestamp: now,
        details: 'Task details or notes edited',
      });
    }

    this.incrementDataVersion();
    return updated;
  }

  public completeTask(taskId: string): TaskEntity {
    const now = Date.now();
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new Error(`Task ${taskId} not found`);

    const prev = tasks[index];
    const updated: TaskEntity = {
      ...prev,
      status: 'COMPLETED',
      completedAt: now,
      updatedAt: now,
    };
    tasks[index] = updated;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    this.recordHistoryEvent({
      taskId,
      taskTitle: updated.title,
      eventType: 'TASK_COMPLETED',
      timestamp: now,
      details: 'Task completed',
      metadata: {
        previousStatus: prev.status,
        newStatus: 'COMPLETED',
      },
    });

    this.incrementDataVersion();
    return updated;
  }

  public reopenTask(taskId: string): TaskEntity {
    const now = Date.now();
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new Error(`Task ${taskId} not found`);

    const prev = tasks[index];
    const updated: TaskEntity = {
      ...prev,
      status: 'PENDING',
      completedAt: null,
      updatedAt: now,
    };
    tasks[index] = updated;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    this.recordHistoryEvent({
      taskId,
      taskTitle: updated.title,
      eventType: 'TASK_REOPENED',
      timestamp: now,
      details: 'Task reopened and marked pending',
      metadata: {
        previousStatus: prev.status,
        newStatus: 'PENDING',
      },
    });

    this.incrementDataVersion();
    return updated;
  }

  public postponeTask(taskId: string, newDueDate: string, reason?: string): TaskEntity {
    const now = Date.now();
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new Error(`Task ${taskId} not found`);

    const prev = tasks[index];
    const updated: TaskEntity = {
      ...prev,
      status: 'POSTPONED',
      postponedCount: prev.postponedCount + 1,
      postponedUntil: newDueDate,
      dueDate: newDueDate,
      updatedAt: now,
    };
    tasks[index] = updated;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

    this.recordHistoryEvent({
      taskId,
      taskTitle: updated.title,
      eventType: 'TASK_POSTPONED',
      timestamp: now,
      details: `Postponed to ${newDueDate}${reason ? ` (${reason})` : ''}`,
      metadata: {
        previousStatus: prev.status,
        newStatus: 'POSTPONED',
        previousDueDate: prev.dueDate,
        newDueDate,
        postponedUntil: newDueDate,
      },
    });

    this.incrementDataVersion();
    return updated;
  }

  public deleteTask(taskId: string): boolean {
    const now = Date.now();
    const tasks = this.getTasks();
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return false;

    const remaining = tasks.filter((t) => t.id !== taskId);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(remaining));

    this.recordHistoryEvent({
      taskId,
      taskTitle: target.title,
      eventType: 'TASK_DELETED',
      timestamp: now,
      details: `Task '${target.title}' removed from active list`,
      metadata: {
        previousStatus: target.status,
      },
    });

    this.incrementDataVersion();
    return true;
  }

  // --- Task History Operations ---
  public getHistory(): TaskHistoryEntity[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const list: TaskHistoryEntity[] = raw ? JSON.parse(raw) : [];
      const normalized = list.map((h) => ({
        ...h,
        metadata: h.metadata
          ? {
              ...h.metadata,
              previousPriority: h.metadata.previousPriority
                ? normalizePriority(h.metadata.previousPriority)
                : undefined,
              newPriority: h.metadata.newPriority
                ? normalizePriority(h.metadata.newPriority)
                : undefined,
            }
          : undefined,
      }));
      // Sorted chronologically descending (newest first)
      return normalized.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('getHistory failed:', e);
      return [];
    }
  }

  public getHistoryForTask(taskId: string): TaskHistoryEntity[] {
    return this.getHistory().filter((h) => h.taskId === taskId);
  }

  private recordHistoryEvent(event: Omit<TaskHistoryEntity, 'id'>): TaskHistoryEntity {
    const newEntry: TaskHistoryEntity = {
      id: generateId(),
      ...event,
    };
    const history = this.getHistory();
    history.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return newEntry;
  }

  // --- Category Operations ---
  public getCategories(): CategoryEntity[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('getCategories failed:', e);
      return [];
    }
  }

  public createCategory(name: string, colorHex?: string): CategoryEntity {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty');

    const categories = this.getCategories();
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Category "${trimmed}" already exists`);
    }

    const newCategory: CategoryEntity = {
      id: generateId(),
      name: trimmed,
      colorHex: colorHex || '#2563eb',
      createdAt: Date.now(),
    };

    categories.push(newCategory);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    this.incrementDataVersion();
    return newCategory;
  }

  public renameCategory(id: string, newName: string): CategoryEntity {
    const trimmed = newName.trim();
    if (!trimmed) throw new Error('Category name cannot be empty');

    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Category ${id} not found`);

    categories[index].name = trimmed;
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    this.incrementDataVersion();
    return categories[index];
  }

  /**
   * Safely deletes a category.
   * "Deleting a category must not delete its tasks. Existing tasks should remain valid if their category is removed."
   */
  public deleteCategorySafely(id: string): { affectedTasksCount: number } {
    const categories = this.getCategories();
    const remaining = categories.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(remaining));

    // Update all tasks that referenced this category to null categoryId
    const tasks = this.getTasks();
    let affectedCount = 0;
    const updatedTasks = tasks.map((t) => {
      if (t.categoryId === id) {
        affectedCount++;
        return {
          ...t,
          categoryId: null,
          updatedAt: Date.now(),
        };
      }
      return t;
    });

    if (affectedCount > 0) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updatedTasks));
    }

    this.incrementDataVersion();
    return { affectedTasksCount: affectedCount };
  }

  // --- Settings Operations ---
  public getSettings(): Record<string, string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : { theme: 'calm-blue' };
    } catch {
      return { theme: 'calm-blue' };
    }
  }

  public getTheme(): ThemeId {
    const s = this.getSettings();
    return (s.theme as ThemeId) || 'calm-blue';
  }

  public setTheme(theme: ThemeId): void {
    const s = this.getSettings();
    s.theme = theme;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
  }

  // --- Report Cache Operations ---
  public getReportCache(cacheKey: string): ReportCacheEntity | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REPORT_CACHE);
      if (!raw) return null;
      const caches: Record<string, ReportCacheEntity> = JSON.parse(raw);
      const entry = caches[cacheKey];
      if (!entry) return null;

      // Verify that dataVersion still matches current data version
      if (entry.dataVersion !== this.getDataVersion()) {
        return null; // Stale cache!
      }
      return entry;
    } catch {
      return null;
    }
  }

  public setReportCache(entry: ReportCacheEntity): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REPORT_CACHE);
      const caches: Record<string, ReportCacheEntity> = raw ? JSON.parse(raw) : {};
      caches[entry.cacheKey] = entry;
      localStorage.setItem(STORAGE_KEYS.REPORT_CACHE, JSON.stringify(caches));
    } catch (e) {
      console.warn('Failed to save report cache:', e);
    }
  }

  public clearReportCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.REPORT_CACHE);
    } catch {
      // Ignore
    }
  }

  // --- Complete Backup & Restore ---
  public exportFullBackup(): BackupPayload {
    return {
      version: 1,
      appName: 'Momentum',
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(),
      taskHistory: this.getHistory(),
      categories: this.getCategories(),
      settings: this.getSettings(),
    };
  }

  public importFullBackup(payload: BackupPayload): {
    success: boolean;
    tasksRestored: number;
    historyRestored: number;
    categoriesRestored: number;
  } {
    if (!payload || !Array.isArray(payload.tasks) || !Array.isArray(payload.taskHistory)) {
      throw new Error('Invalid backup file format: missing tasks or task history arrays.');
    }

    // Preserve historical information and relationships correctly
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(payload.tasks));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(payload.taskHistory));

    if (Array.isArray(payload.categories)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(payload.categories));
    }
    if (payload.settings && typeof payload.settings === 'object') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(payload.settings));
    }

    this.clearReportCache();
    this.incrementDataVersion();

    return {
      success: true,
      tasksRestored: payload.tasks.length,
      historyRestored: payload.taskHistory.length,
      categoriesRestored: payload.categories?.length || 0,
    };
  }
}
