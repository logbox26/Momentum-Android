import {
  MonthlyStats,
  MonthComparison,
  Priority,
  ReportCacheEntity,
  TaskEntity,
  TaskHistoryEntity,
  CategoryEntity,
  ReportsFourTiles,
} from '../types';
import { MomentumRepository } from '../db/storage';

export interface ReportGenerationResult {
  stats: MonthlyStats;
  isFromCache: boolean;
  cacheKey: string;
}

export interface ComparisonReportResult {
  comparison: MonthComparison;
  isFromCache: boolean;
  cacheKey: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthDisplayName(yearMonthStr: string): string {
  const [year, month] = yearMonthStr.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return yearMonthStr;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Reconstructs accurate historical monthly statistics using task history and timestamps.
 * Does NOT rely merely on the task's current status.
 */
export function reconstructMonthStats(
  targetYearMonth: string,
  tasks: TaskEntity[],
  history: TaskHistoryEntity[],
  categories: CategoryEntity[]
): MonthlyStats {
  const [year, month] = targetYearMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  // Fast category lookup map
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  // Fast task lookup map
  const taskMap = new Map<string, TaskEntity>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  // 1. Events occurring strictly inside the target month
  const monthEvents = history.filter(
    (h) => h.timestamp >= monthStart && h.timestamp <= monthEnd
  );

  // 2. Tasks created during this month
  const createdEvents = monthEvents.filter((h) => h.eventType === 'TASK_CREATED');
  const tasksCreatedCount = createdEvents.length;

  // 3. Tasks completed during this month
  const completedEvents = monthEvents.filter((h) => h.eventType === 'TASK_COMPLETED');
  const tasksCompletedCount = completedEvents.length;

  // 4. Tasks postponed during this month
  const postponedEvents = monthEvents.filter((h) => h.eventType === 'TASK_POSTPONED');
  const postponedTasksCount = postponedEvents.length;

  // 5. Reconstruct accomplishments in this month
  const accomplishments: MonthlyStats['accomplishments'] = [];
  const completedTaskIdsSeen = new Set<string>();

  for (const compEvent of completedEvents) {
    if (completedTaskIdsSeen.has(compEvent.taskId)) continue;
    completedTaskIdsSeen.add(compEvent.taskId);

    const task = taskMap.get(compEvent.taskId);
    const categoryName =
      task && task.categoryId
        ? categoryMap.get(task.categoryId) || 'Uncategorized'
        : 'Uncategorized';

    accomplishments.push({
      id: compEvent.taskId,
      title: compEvent.taskTitle || (task ? task.title : 'Untitled Task'),
      completedAt: compEvent.timestamp,
      notes: task?.notes || '',
      priority: (task?.priority || compEvent.metadata?.newPriority || 'Present 1') as Priority,
      categoryName,
    });
  }

  // 6. Reconstruct unfinished tasks as of monthEnd:
  // We collect all task IDs that existed on or before monthEnd
  const relevantTaskIds = new Set<string>();
  tasks.forEach((t) => {
    if (t.createdDate <= monthEnd) {
      relevantTaskIds.add(t.id);
    }
  });
  // Also check history for tasks created before monthEnd (even if later deleted)
  history.forEach((h) => {
    if (h.timestamp <= monthEnd) {
      relevantTaskIds.add(h.taskId);
    }
  });

  let unfinishedCount = 0;
  const activeTaskPriorityCounts: Record<Priority, number> = {
    'Present 1': 0,
    'Present 5': 0,
    'Later 1': 0,
    'Later 5': 0,
  };

  // Replay historical events for each task up to monthEnd
  relevantTaskIds.forEach((taskId) => {
    const taskHistoryUpToMonthEnd = history
      .filter((h) => h.taskId === taskId && h.timestamp <= monthEnd)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (taskHistoryUpToMonthEnd.length === 0) return;

    let reconstructedStatus: 'PENDING' | 'COMPLETED' | 'POSTPONED' | 'DELETED' = 'PENDING';
    let reconstructedPriority: Priority = 'Present 1';

    for (const evt of taskHistoryUpToMonthEnd) {
      if (evt.eventType === 'TASK_CREATED') {
        reconstructedStatus = 'PENDING';
        if (evt.metadata?.newPriority) {
          reconstructedPriority = evt.metadata.newPriority as Priority;
        }
      } else if (evt.eventType === 'TASK_COMPLETED') {
        reconstructedStatus = 'COMPLETED';
      } else if (evt.eventType === 'TASK_REOPENED') {
        reconstructedStatus = 'PENDING';
      } else if (evt.eventType === 'TASK_POSTPONED') {
        reconstructedStatus = 'POSTPONED';
      } else if (evt.eventType === 'TASK_DELETED') {
        reconstructedStatus = 'DELETED';
      } else if (evt.eventType === 'PRIORITY_CHANGED' && evt.metadata?.newPriority) {
        reconstructedPriority = evt.metadata.newPriority as Priority;
      }
    }

    // If as of monthEnd it was pending or postponed, it counts as unfinished for that month
    if (reconstructedStatus === 'PENDING' || reconstructedStatus === 'POSTPONED') {
      unfinishedCount++;
      activeTaskPriorityCounts[reconstructedPriority]++;
    }
  });

  // 7. Calculate completion rate:
  // Completed in month / (Completed in month + Unfinished as of month end)
  const totalVolume = tasksCompletedCount + unfinishedCount;
  const completionRate =
    totalVolume > 0 ? Math.round((tasksCompletedCount / totalVolume) * 1000) / 10 : 0;

  // 8. Priority breakdown
  const priorityBreakdown: MonthlyStats['priorityBreakdown'] = {
    'Present 1': { created: 0, completed: 0, active: activeTaskPriorityCounts['Present 1'] },
    'Present 5': { created: 0, completed: 0, active: activeTaskPriorityCounts['Present 5'] },
    'Later 1': { created: 0, completed: 0, active: activeTaskPriorityCounts['Later 1'] },
    'Later 5': { created: 0, completed: 0, active: activeTaskPriorityCounts['Later 5'] },
  };

  createdEvents.forEach((evt) => {
    const task = taskMap.get(evt.taskId);
    const p = (task?.priority || evt.metadata?.newPriority || 'Present 1') as Priority;
    if (priorityBreakdown[p]) {
      priorityBreakdown[p].created++;
    }
  });

  accomplishments.forEach((acc) => {
    if (priorityBreakdown[acc.priority]) {
      priorityBreakdown[acc.priority].completed++;
    }
  });

  // 9. Category breakdown
  const categoryBreakdown: MonthlyStats['categoryBreakdown'] = {};
  categories.forEach((cat) => {
    categoryBreakdown[cat.id] = { name: cat.name, completed: 0, created: 0 };
  });
  categoryBreakdown['uncategorized'] = { name: 'Uncategorized', completed: 0, created: 0 };

  createdEvents.forEach((evt) => {
    const task = taskMap.get(evt.taskId);
    const catId = task?.categoryId || 'uncategorized';
    if (!categoryBreakdown[catId]) {
      categoryBreakdown[catId] = {
        name: categoryMap.get(catId) || 'Uncategorized',
        completed: 0,
        created: 0,
      };
    }
    categoryBreakdown[catId].created++;
  });

  accomplishments.forEach((acc) => {
    const task = taskMap.get(acc.id);
    const catId = task?.categoryId || 'uncategorized';
    if (!categoryBreakdown[catId]) {
      categoryBreakdown[catId] = { name: acc.categoryName, completed: 0, created: 0 };
    }
    categoryBreakdown[catId].completed++;
  });

  return {
    month: targetYearMonth,
    monthName: getMonthDisplayName(targetYearMonth),
    tasksCreated: tasksCreatedCount,
    tasksCompleted: tasksCompletedCount,
    unfinishedTasks: unfinishedCount,
    postponedTasks: postponedTasksCount,
    completionRate,
    accomplishments,
    priorityBreakdown,
    categoryBreakdown,
    timelineEvents: monthEvents,
  };
}

/**
 * Report Manager with multi-tier caching
 * Cache keys account for: Month, Report Type, and Data Version
 * Invalidates automatically when underlying data changes.
 */
export function getMonthlyReport(
  month: string,
  reportType: 'quick' | 'detailed'
): ReportGenerationResult {
  const repo = MomentumRepository.getInstance();
  const dataVersion = repo.getDataVersion();
  const cacheKey = `${month}_${reportType}_v${dataVersion}`;

  // Check cache first
  const cached = repo.getReportCache(cacheKey);
  if (cached) {
    try {
      const stats: MonthlyStats = JSON.parse(cached.payloadJson);
      return { stats, isFromCache: true, cacheKey };
    } catch {
      // JSON parse error, recompute
    }
  }

  // Reconstruct stats accurately
  const tasks = repo.getTasks();
  const history = repo.getHistory();
  const categories = repo.getCategories();
  const stats = reconstructMonthStats(month, tasks, history, categories);

  // Save to cache
  const cacheEntry: ReportCacheEntity = {
    cacheKey,
    month,
    reportType,
    dataVersion,
    timestamp: Date.now(),
    payloadJson: JSON.stringify(stats),
  };
  repo.setReportCache(cacheEntry);

  return { stats, isFromCache: false, cacheKey };
}

/**
 * Generates Comparison Report between two selected months
 */
export function getComparisonReport(
  monthA: string,
  monthB: string
): ComparisonReportResult {
  const repo = MomentumRepository.getInstance();
  const dataVersion = repo.getDataVersion();
  const cacheKey = `comp_${monthA}_vs_${monthB}_v${dataVersion}`;

  const cached = repo.getReportCache(cacheKey);
  if (cached) {
    try {
      const comparison: MonthComparison = JSON.parse(cached.payloadJson);
      return { comparison, isFromCache: true, cacheKey };
    } catch {
      // Recompute
    }
  }

  const tasks = repo.getTasks();
  const history = repo.getHistory();
  const categories = repo.getCategories();

  const statsA = reconstructMonthStats(monthA, tasks, history, categories);
  const statsB = reconstructMonthStats(monthB, tasks, history, categories);

  const comparison: MonthComparison = {
    monthA: statsA,
    monthB: statsB,
    deltaCreated: statsA.tasksCreated - statsB.tasksCreated,
    deltaCompleted: statsA.tasksCompleted - statsB.tasksCompleted,
    deltaPostponed: statsA.postponedTasks - statsB.postponedTasks,
    deltaUnfinished: statsA.unfinishedTasks - statsB.unfinishedTasks,
    deltaCompletionRate:
      Math.round((statsA.completionRate - statsB.completionRate) * 10) / 10,
  };

  const cacheEntry: ReportCacheEntity = {
    cacheKey,
    month: `${monthA}_${monthB}`,
    reportType: 'comparison',
    dataVersion,
    timestamp: Date.now(),
    payloadJson: JSON.stringify(comparison),
  };
  repo.setReportCache(cacheEntry);

  return { comparison, isFromCache: false, cacheKey };
}

/**
 * Calculates the 4 prominent report tiles:
 * 1. Daily completion rate
 * 2. Weekly completion rate
 * 3. Monthly completion rate
 * 4. Number of unfinished tasks (broken down by Present 1, Present 5, Later 1, Later 5)
 */
export function calculateFourTiles(
  tasks: TaskEntity[],
  history: TaskHistoryEntity[],
  todayStr: string,
  targetMonth: string
): ReportsFourTiles {
  const now = Date.now();

  // 1. Daily Completion Rate
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const completedTodayTasks = tasks.filter(
    (t) => t.status === 'COMPLETED' && t.completedAt && t.completedAt >= todayStartMs
  );
  const pendingDueTodayTasks = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.dueDate === todayStr
  );
  const dailyCompleted = completedTodayTasks.length;
  const dailyTotal = dailyCompleted + pendingDueTodayTasks.length;
  const dailyRate =
    dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 1000) / 10 : dailyCompleted > 0 ? 100 : 0;

  // 2. Weekly Completion Rate (past 7 days window)
  const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000;
  const weeklyCompletedEvents = history.filter(
    (h) => h.eventType === 'TASK_COMPLETED' && h.timestamp >= sevenDaysAgoMs
  );
  const weeklyCompleted = weeklyCompletedEvents.length;

  // Active tasks due within this window or today
  const activeWeeklyTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const weeklyTotal = Math.max(weeklyCompleted + activeWeeklyTasks.length, 1);
  const weeklyRate =
    weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 1000) / 10 : 0;

  // 3. Monthly Completion Rate (reconstructed for targetMonth)
  const repo = MomentumRepository.getInstance();
  const categories = repo.getCategories();
  const monthStats = reconstructMonthStats(targetMonth, tasks, history, categories);
  const monthlyCompleted = monthStats.tasksCompleted;
  const monthlyTotal = monthStats.tasksCompleted + monthStats.unfinishedTasks;
  const monthlyRate = monthStats.completionRate;

  // 4. Number of unfinished tasks (active pending or postponed)
  const unfinishedTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const p1 = unfinishedTasks.filter((t) => t.priority === 'Present 1').length;
  const p5 = unfinishedTasks.filter((t) => t.priority === 'Present 5').length;
  const l1 = unfinishedTasks.filter((t) => t.priority === 'Later 1').length;
  const l5 = unfinishedTasks.filter((t) => t.priority === 'Later 5').length;

  return {
    daily: {
      rate: dailyRate,
      completed: dailyCompleted,
      total: dailyTotal,
    },
    weekly: {
      rate: weeklyRate,
      completed: weeklyCompleted,
      total: weeklyTotal,
    },
    monthly: {
      rate: monthlyRate,
      completed: monthlyCompleted,
      total: monthlyTotal,
    },
    unfinished: {
      total: unfinishedTasks.length,
      present1: p1,
      present5: p5,
      later1: l1,
      later5: l5,
    },
  };
}

