package com.momentum.app.domain.reports

import com.momentum.app.data.local.entity.CategoryEntity
import com.momentum.app.data.local.entity.TaskEntity
import com.momentum.app.data.local.entity.TaskHistoryEntity
import com.momentum.app.domain.model.FourTilesResult
import com.momentum.app.domain.model.HistoryEventType
import com.momentum.app.domain.model.MonthlyReportResult
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.PriorityBreakdown
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class HistoricalReportGenerator {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    /**
     * Calculates the 4 KPI Tiles:
     * 1. Daily completion rate
     * 2. Weekly completion rate
     * 3. Monthly completion rate
     * 4. Unfinished tasks breakdown by Present 1, Present 5, Later 1, and Later 5
     */
    fun calculateFourTiles(
        tasks: List<TaskEntity>,
        history: List<TaskHistoryEntity>
    ): FourTilesResult {
        val now = System.currentTimeMillis()
        val todayStr = dateFormat.format(Date(now))

        val cal = Calendar.getInstance()
        cal.timeInMillis = now
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val todayStartMs = cal.timeInMillis

        // 7 days ago
        val weekAgoMs = todayStartMs - (6 * 86400000L)

        // Month start
        cal.set(Calendar.DAY_OF_MONTH, 1)
        val monthStartMs = cal.timeInMillis

        // Daily
        val dailyCompleted = history.count {
            it.eventType == HistoryEventType.TASK_COMPLETED && it.timestamp >= todayStartMs
        }
        val dailyScheduled = tasks.count { it.dueDate == todayStr }
        val dailyTotal = maxOf(dailyCompleted, dailyScheduled)
        val dailyRate = if (dailyTotal > 0) (dailyCompleted.toFloat() / dailyTotal.toFloat()) * 100f else 0f

        // Weekly
        val weeklyCompleted = history.count {
            it.eventType == HistoryEventType.TASK_COMPLETED && it.timestamp >= weekAgoMs
        }
        val weeklyActiveTasks = tasks.count {
            it.createdDate >= weekAgoMs || (it.dueDate >= dateFormat.format(Date(weekAgoMs)) && it.dueDate <= todayStr)
        }
        val weeklyTotal = maxOf(weeklyCompleted, weeklyActiveTasks)
        val weeklyRate = if (weeklyTotal > 0) (weeklyCompleted.toFloat() / weeklyTotal.toFloat()) * 100f else 0f

        // Monthly
        val monthlyCompleted = history.count {
            it.eventType == HistoryEventType.TASK_COMPLETED && it.timestamp >= monthStartMs
        }
        val monthlyActiveTasks = tasks.count {
            it.createdDate >= monthStartMs || it.dueDate.startsWith(todayStr.substring(0, 7))
        }
        val monthlyTotal = maxOf(monthlyCompleted, monthlyActiveTasks)
        val monthlyRate = if (monthlyTotal > 0) (monthlyCompleted.toFloat() / monthlyTotal.toFloat()) * 100f else 0f

        // Unfinished tasks breakdown
        val pendingTasks = tasks.filter { it.status != com.momentum.app.domain.model.TaskStatus.COMPLETED }
        val p1 = pendingTasks.count { it.priority == Priority.PRESENT_1 }
        val p5 = pendingTasks.count { it.priority == Priority.PRESENT_5 }
        val l1 = pendingTasks.count { it.priority == Priority.LATER_1 }
        val l5 = pendingTasks.count { it.priority == Priority.LATER_5 }

        return FourTilesResult(
            dailyCompletionRate = dailyRate,
            dailyCompletedCount = dailyCompleted,
            dailyTotalCount = dailyTotal,
            weeklyCompletionRate = weeklyRate,
            weeklyCompletedCount = weeklyCompleted,
            weeklyTotalCount = weeklyTotal,
            monthlyCompletionRate = monthlyRate,
            monthlyCompletedCount = monthlyCompleted,
            monthlyTotalCount = monthlyTotal,
            unfinishedCount = pendingTasks.size,
            unfinishedByPriority = PriorityBreakdown(
                present1 = p1,
                present5 = p5,
                later1 = l1,
                later5 = l5
            )
        )
    }

    /**
     * Reconstructs what actually happened during the target month using task history and timestamps.
     * Guaranteed historical accuracy: Does not calculate results from the task's current status alone.
     */
    fun reconstructMonthStats(
        year: Int,
        month: Int,
        allTasks: List<TaskEntity>,
        allHistory: List<TaskHistoryEntity>,
        categories: List<CategoryEntity>
    ): MonthlyReportResult {
        val cal = Calendar.getInstance()
        cal.set(year, month - 1, 1, 0, 0, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val monthStartMs = cal.timeInMillis

        cal.set(year, month - 1, cal.getActualMaximum(Calendar.DAY_OF_MONTH), 23, 59, 59)
        cal.set(Calendar.MILLISECOND, 999)
        val monthEndMs = cal.timeInMillis

        val eventsInMonth = allHistory.filter { it.timestamp in monthStartMs..monthEndMs }
        val createdEvents = eventsInMonth.filter { it.eventType == HistoryEventType.TASK_CREATED }
        val completedEvents = eventsInMonth.filter { it.eventType == HistoryEventType.TASK_COMPLETED }
        val postponedEvents = eventsInMonth.filter { it.eventType == HistoryEventType.TASK_POSTPONED }

        // Determine unfinished tasks at monthEnd by reconstructing history state up to monthEnd
        val taskIdsBeforeEnd = allTasks.filter { it.createdDate <= monthEndMs }.map { it.id }.toSet()
        var unfinishedAtMonthEnd = 0
        var p1 = 0
        var p5 = 0
        var l1 = 0
        var l5 = 0
        val categoryCountMap = mutableMapOf<String, Int>()

        val categoryNameMap = categories.associate { it.id to it.name }

        for (taskId in taskIdsBeforeEnd) {
            val task = allTasks.firstOrNull { it.id == taskId } ?: continue
            val eventsUpToEnd = allHistory
                .filter { it.taskId == taskId && it.timestamp <= monthEndMs }
                .sortedBy { it.timestamp }

            var reconstructedStatus = "PENDING"
            var reconstructedPriority = task.priority

            for (evt in eventsUpToEnd) {
                when (evt.eventType) {
                    HistoryEventType.TASK_CREATED, HistoryEventType.TASK_REOPENED -> reconstructedStatus = "PENDING"
                    HistoryEventType.TASK_COMPLETED -> reconstructedStatus = "COMPLETED"
                    HistoryEventType.TASK_POSTPONED -> reconstructedStatus = "POSTPONED"
                    HistoryEventType.TASK_DELETED -> reconstructedStatus = "DELETED"
                }
                if (evt.newPriority != null) {
                    reconstructedPriority = Priority.fromLabel(evt.newPriority)
                }
            }

            if (reconstructedStatus == "PENDING" || reconstructedStatus == "POSTPONED") {
                unfinishedAtMonthEnd++
                when (reconstructedPriority) {
                    Priority.PRESENT_1 -> p1++
                    Priority.PRESENT_5 -> p5++
                    Priority.LATER_1 -> l1++
                    Priority.LATER_5 -> l5++
                }
                val catName = task.categoryId?.let { categoryNameMap[it] } ?: "Uncategorized"
                categoryCountMap[catName] = (categoryCountMap[catName] ?: 0) + 1
            }
        }

        val totalVolume = completedEvents.size + unfinishedAtMonthEnd
        val completionRate = if (totalVolume > 0) (completedEvents.size.toFloat() / totalVolume.toFloat()) * 100f else 0f
        val accomplishments = completedEvents.map { it.taskTitle }.distinct()

        return MonthlyReportResult(
            year = year,
            month = month,
            tasksCreated = createdEvents.size,
            tasksCompleted = completedEvents.size,
            unfinishedTasks = unfinishedAtMonthEnd,
            postponedTasks = postponedEvents.size,
            completionRate = completionRate,
            accomplishments = accomplishments,
            priorityBreakdown = PriorityBreakdown(p1, p5, l1, l5),
            categoryBreakdown = categoryCountMap
        )
    }

    /**
     * Generates a deterministic cache key accounting for month, report type, and data version
     */
    fun buildCacheKey(year: Int, month: Int, reportType: String, dataVersion: Int): String {
        return "cache_${year}_${month}_${reportType}_v${dataVersion}"
    }
}
