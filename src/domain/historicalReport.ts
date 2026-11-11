import {
  MonthlyStats,
  MonthComparison,
  Priority,
  ReportCacheEntity,
  TaskEntity,
  TaskHistoryEntity,
  CategoryEntity,
  ReportsFourTiles,
  normalizePriority,
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

  // Historical category lookup map: combines current categories with past names in history
  const historicalCategoryMap = new Map<string, string>();
  categories.forEach((c) => historicalCategoryMap.set(c.id, c.name));
  history.forEach((h) => {
    if (h.metadata?.newCategoryId && h.metadata.categoryName) {
      historicalCategoryMap.set(h.metadata.newCategoryId, h.metadata.categoryName);
    }
  });

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

  // 3. Tasks postponed during this month
  const postponedEvents = monthEvents.filter((h) => h.eventType === 'TASK_POSTPONED');
  const postponedTasksCount = postponedEvents.length;

  // 4. Candidate tasks: all tasks that had history on or before monthEnd, or created on/before monthEnd
  // Ensures tasks deleted after monthEnd are still accounted for
  const candidateTaskIds = new Set<string>();
  tasks.forEach((t) => {
    if (t.createdDate <= monthEnd) {
      candidateTaskIds.add(t.id);
    }
  });
  history.forEach((h) => {
    if (h.timestamp <= monthEnd) {
      candidateTaskIds.add(h.taskId);
    }
  });

  let unfinishedCount = 0;
  let tasksCompletedCount = 0;
  const activeTaskPriorityCounts: Record<Priority, number> = {
    'Present 1': 0,
    'Present 2': 0,
    'Present 15': 0,
    'Future 1': 0,
    'Future 2': 0,
    'Trashable': 0,
  };

  const categoryBreakdown: MonthlyStats['categoryBreakdown'] = {};
  categories.forEach((cat) => {
    categoryBreakdown[cat.id] = { name: cat.name, completed: 0, created: 0 };
  });
  categoryBreakdown['uncategorized'] = { name: 'Uncategorized', completed: 0, created: 0 };

  const accomplishments: MonthlyStats['accomplishments'] = [];

  const getEventOrder = (type: string): number => {
    switch (type) {
      case 'TASK_CREATED': return 0;
      case 'DUE_DATE_CHANGED': return 1;
      case 'PRIORITY_CHANGED': return 2;
      case 'CATEGORY_CHANGED': return 3;
      case 'TASK_POSTPONED': return 4;
      case 'TASK_COMPLETED': return 5;
      case 'TASK_REOPENED': return 6;
      case 'TASK_DELETED': return 7;
      default: return 8;
    }
  };

  candidateTaskIds.forEach((taskId) => {
    const taskRow = taskMap.get(taskId);
    const taskHistoryUpToMonthEnd = history
      .filter((h) => h.taskId === taskId && h.timestamp <= monthEnd)
      .sort((a, b) => a.timestamp - b.timestamp || getEventOrder(a.eventType) - getEventOrder(b.eventType));

    if (taskHistoryUpToMonthEnd.length === 0 && !taskRow) return;

    let reconstructedStatus: 'PENDING' | 'COMPLETED' | 'POSTPONED' | 'DELETED' = 'PENDING';
    let reconstructedPriority: Priority = normalizePriority(taskRow?.priority);
    let reconstructedCategoryId: string | null = taskRow?.categoryId || null;
    let reconstructedCategoryName = reconstructedCategoryId
      ? historicalCategoryMap.get(reconstructedCategoryId) || 'Uncategorized'
      : 'Uncategorized';
    let latestTitle = taskRow?.title || '';
    let notes = taskRow?.notes || '';
    let completedInTargetMonth = false;
    let completedTimestamp = 0;

    for (const evt of taskHistoryUpToMonthEnd) {
      if (evt.taskTitle) latestTitle = evt.taskTitle;
      switch (evt.eventType) {
        case 'TASK_CREATED':
          reconstructedStatus = 'PENDING';
          if (evt.metadata?.newPriority) {
            reconstructedPriority = normalizePriority(evt.metadata.newPriority);
          }
          if (evt.metadata?.newCategoryId !== undefined) {
            reconstructedCategoryId = evt.metadata.newCategoryId;
            reconstructedCategoryName =
              evt.metadata.categoryName ||
              (evt.metadata.newCategoryId
                ? historicalCategoryMap.get(evt.metadata.newCategoryId) || 'Uncategorized'
                : 'Uncategorized');
          }
          break;
        case 'TASK_COMPLETED':
          reconstructedStatus = 'COMPLETED';
          if (evt.timestamp >= monthStart && evt.timestamp <= monthEnd) {
            completedInTargetMonth = true;
            completedTimestamp = evt.timestamp;
          }
          break;
        case 'TASK_REOPENED':
          reconstructedStatus = 'PENDING';
          if (evt.timestamp >= monthStart && evt.timestamp <= monthEnd) {
            completedInTargetMonth = false;
          }
          break;
        case 'TASK_POSTPONED':
          reconstructedStatus = 'POSTPONED';
          break;
        case 'TASK_DELETED':
          reconstructedStatus = 'DELETED';
          completedInTargetMonth = false;
          break;
        case 'PRIORITY_CHANGED':
          if (evt.metadata?.newPriority) {
            reconstructedPriority = normalizePriority(evt.metadata.newPriority);
          }
          break;
        case 'CATEGORY_CHANGED':
          if (evt.metadata?.newCategoryId !== undefined) {
            reconstructedCategoryId = evt.metadata.newCategoryId;
            reconstructedCategoryName =
              evt.metadata.categoryName ||
              (evt.metadata.newCategoryId
                ? historicalCategoryMap.get(evt.metadata.newCategoryId) || 'Uncategorized'
                : 'Uncategorized');
          }
          break;
      }
    }

    if (reconstructedStatus === 'DELETED') {
      return;
    }

    if (completedInTargetMonth && reconstructedStatus === 'COMPLETED') {
      tasksCompletedCount++;
      const catKey = reconstructedCategoryId || 'uncategorized';
      if (!categoryBreakdown[catKey]) {
        categoryBreakdown[catKey] = { name: reconstructedCategoryName, completed: 0, created: 0 };
      }
      categoryBreakdown[catKey].completed++;

      accomplishments.push({
        id: taskId,
        title: latestTitle || 'Untitled Task',
        completedAt: completedTimestamp,
        notes,
        priority: reconstructedPriority,
        categoryName: reconstructedCategoryName,
      });
    } else if (reconstructedStatus === 'PENDING' || reconstructedStatus === 'POSTPONED') {
      // Do not count Trashable as unfinished
      if (reconstructedPriority !== 'Trashable') {
        unfinishedCount++;
        activeTaskPriorityCounts[reconstructedPriority]++;
      }
    }
  });

  // Track created tasks in category breakdown
  createdEvents.forEach((evt) => {
    let catId = evt.metadata?.newCategoryId || 'uncategorized';
    let catName = evt.metadata?.categoryName || historicalCategoryMap.get(catId) || 'Uncategorized';
    if (!categoryBreakdown[catId]) {
      categoryBreakdown[catId] = {
        name: catName,
        completed: 0,
        created: 0,
      };
    }
    categoryBreakdown[catId].created++;
  });

  // Calculate completion rate:
  // "Future tasks should not be treated as failed simply because they were not completed."
  const activePresentUnfinished =
    activeTaskPriorityCounts['Present 1'] +
    activeTaskPriorityCounts['Present 2'] +
    activeTaskPriorityCounts['Present 15'];
  const actionableVolume = tasksCompletedCount + activePresentUnfinished;
  const completionRate =
    actionableVolume > 0 ? Math.round((tasksCompletedCount / actionableVolume) * 1000) / 10 : 0;

  // Priority breakdown
  const priorityBreakdown: MonthlyStats['priorityBreakdown'] = {
    'Present 1': { created: 0, completed: 0, active: activeTaskPriorityCounts['Present 1'] },
    'Present 2': { created: 0, completed: 0, active: activeTaskPriorityCounts['Present 2'] },
    'Present 15': { created: 0, completed: 0, active: activeTaskPriorityCounts['Present 15'] },
    'Future 1': { created: 0, completed: 0, active: activeTaskPriorityCounts['Future 1'] },
    'Future 2': { created: 0, completed: 0, active: activeTaskPriorityCounts['Future 2'] },
    'Trashable': { created: 0, completed: 0, active: 0 },
  };

  createdEvents.forEach((evt) => {
    const p = normalizePriority(evt.metadata?.newPriority);
    if (priorityBreakdown[p]) {
      priorityBreakdown[p].created++;
    }
  });

  accomplishments.forEach((acc) => {
    const p = normalizePriority(acc.priority);
    if (priorityBreakdown[p]) {
      priorityBreakdown[p].completed++;
    }
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
 * 4. Number of unfinished tasks (broken down by Present 1, Present 2, Present 15, Future 1, Future 2)
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

  // 1. Daily Completion Rate (unique task IDs completed today)
  const dailyCompletedTaskIds = new Set<string>();
  history
    .filter((h) => h.eventType === 'TASK_COMPLETED' && h.timestamp >= todayStartMs)
    .forEach((h) => {
      const task = tasks.find((t) => t.id === h.taskId);
      if (task) {
        if (task.status === 'COMPLETED') {
          dailyCompletedTaskIds.add(h.taskId);
        }
      } else {
        const taskEvents = history.filter((ev) => ev.taskId === h.taskId);
        const lastEvt = taskEvents.sort((a, b) => a.timestamp - b.timestamp)[taskEvents.length - 1];
        if (lastEvt?.eventType === 'TASK_COMPLETED') {
          dailyCompletedTaskIds.add(h.taskId);
        }
      }
    });
  tasks.forEach((t) => {
    if (t.status === 'COMPLETED' && t.completedAt && t.completedAt >= todayStartMs) {
      dailyCompletedTaskIds.add(t.id);
    }
  });
  const pendingDueTodayTasks = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.dueDate === todayStr
  );
  const dailyCompleted = dailyCompletedTaskIds.size;
  const dailyTotal = dailyCompleted + pendingDueTodayTasks.length;
  const dailyRate =
    dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 1000) / 10 : dailyCompleted > 0 ? 100 : 0;

  // 2. Weekly Completion Rate (past 7 days window - unique task IDs)
  const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000;
  const weeklyCompletedTaskIds = new Set<string>();
  history
    .filter((h) => h.eventType === 'TASK_COMPLETED' && h.timestamp >= sevenDaysAgoMs)
    .forEach((h) => {
      const task = tasks.find((t) => t.id === h.taskId);
      if (task) {
        if (task.status === 'COMPLETED') {
          weeklyCompletedTaskIds.add(h.taskId);
        }
      } else {
        const taskEvents = history.filter((ev) => ev.taskId === h.taskId);
        const lastEvt = taskEvents.sort((a, b) => a.timestamp - b.timestamp)[taskEvents.length - 1];
        if (lastEvt?.eventType === 'TASK_COMPLETED') {
          weeklyCompletedTaskIds.add(h.taskId);
        }
      }
    });
  tasks.forEach((t) => {
    if (t.status === 'COMPLETED' && t.completedAt && t.completedAt >= sevenDaysAgoMs) {
      weeklyCompletedTaskIds.add(t.id);
    }
  });
  const weeklyCompleted = weeklyCompletedTaskIds.size;

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

  // 4. Number of unfinished tasks (active pending or postponed from reconstructed monthStats)

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
      total: monthStats.unfinishedTasks,
      present1: monthStats.priorityBreakdown['Present 1'].active,
      present2: monthStats.priorityBreakdown['Present 2'].active,
      present15: monthStats.priorityBreakdown['Present 15'].active,
      future1: monthStats.priorityBreakdown['Future 1'].active,
      future2: monthStats.priorityBreakdown['Future 2'].active,
    },
  };
}

