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
        history: List<TaskHistoryEntity>,
        categories: List<CategoryEntity> = emptyList()
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

        // Monthly (reconstructed for current month using historical replay)
        val currentYear = cal.get(Calendar.YEAR)
        val currentMonth = cal.get(Calendar.MONTH) + 1
        val currentMonthStats = reconstructMonthStats(currentYear, currentMonth, tasks, history, categories)

        return FourTilesResult(
            dailyCompletionRate = dailyRate,
            dailyCompletedCount = dailyCompleted,
            dailyTotalCount = dailyTotal,
            weeklyCompletionRate = weeklyRate,
            weeklyCompletedCount = weeklyCompleted,
            weeklyTotalCount = weeklyTotal,
            monthlyCompletionRate = currentMonthStats.completionRate,
            monthlyCompletedCount = currentMonthStats.tasksCompleted,
            monthlyTotalCount = currentMonthStats.tasksCompleted + currentMonthStats.unfinishedTasks,
            unfinishedCount = currentMonthStats.unfinishedTasks,
            unfinishedByPriority = currentMonthStats.priorityBreakdown
        )
    }

    /**
     * Reconstructs what actually happened during the target month using task history and timestamps.
     * Guaranteed historical accuracy:
     * - Uses task history rather than relying on current task row values
     * - Correctly handles completion in a later month (tasks pending in Jan and completed in Feb are pending in Jan)
     * - Correctly handles reopen and complete again
     * - Correctly handles postponement across months
     * - Correctly handles priority changes
     * - Correctly handles category changes and category deletion
     * - Correctly handles deletion of tasks after the historical month
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

        // Historical category name lookup map: combines current categories with past names logged in history
        val historicalCategoryNames = mutableMapOf<String, String>()
        categories.forEach { historicalCategoryNames[it.id] = it.name }
        allHistory.forEach { h ->
            if (h.newCategoryId != null && !h.categoryName.isNullOrBlank()) {
                historicalCategoryNames[h.newCategoryId] = h.categoryName
            }
        }

        // Fast lookup for current task snapshots
        val currentTaskMap = allTasks.associateBy { it.id }

        // Events strictly occurring in this month
        val eventsInMonth = allHistory.filter { it.timestamp in monthStartMs..monthEndMs }
        val createdEvents = eventsInMonth.filter { it.eventType == HistoryEventType.TASK_CREATED }
        val postponedEvents = eventsInMonth.filter { it.eventType == HistoryEventType.TASK_POSTPONED }

        // Candidate tasks: all tasks that had any historical event on or before monthEndMs,
        // plus any current tasks created on or before monthEndMs.
        // This ensures tasks deleted AFTER monthEndMs are NOT lost.
        val candidateTaskIds = (
            allHistory.filter { it.timestamp <= monthEndMs }.map { it.taskId } +
            allTasks.filter { it.createdDate <= monthEndMs }.map { it.id }
        ).toSet()

        var unfinishedAtMonthEnd = 0
        var p1 = 0
        var p5 = 0
        var l1 = 0
        var l5 = 0
        val categoryCountMap = mutableMapOf<String, Int>()

        val accomplishmentsList = mutableListOf<String>()
        var completedCountInMonth = 0

        for (taskId in candidateTaskIds) {
            val taskRow = currentTaskMap[taskId]
            val eventsUpToMonthEnd = allHistory
                .filter { it.taskId == taskId && it.timestamp <= monthEndMs }
                .sortedWith(compareBy({ it.timestamp }, { getEventOrder(it.eventType) }))

            if (eventsUpToMonthEnd.isEmpty() && taskRow == null) {
                continue
            }

            var reconstructedStatus = "PENDING"
            var reconstructedPriority: Priority = taskRow?.priority ?: Priority.PRESENT_1
            var reconstructedCategoryId: String? = taskRow?.categoryId
            var reconstructedCategoryName: String = reconstructedCategoryId?.let { historicalCategoryNames[it] } ?: "Uncategorized"
            var latestTitle: String = taskRow?.title ?: ""

            var completedInTargetMonth = false

            for (evt in eventsUpToMonthEnd) {
                if (evt.taskTitle.isNotBlank()) {
                    latestTitle = evt.taskTitle
                }
                when (evt.eventType) {
                    HistoryEventType.TASK_CREATED -> {
                        reconstructedStatus = "PENDING"
                        if (evt.newPriority != null) {
                            reconstructedPriority = Priority.fromLabel(evt.newPriority)
                        }
                        if (evt.newCategoryId != null) {
                            reconstructedCategoryId = evt.newCategoryId
                            reconstructedCategoryName = evt.categoryName
                                ?: historicalCategoryNames[evt.newCategoryId]
                                ?: "Uncategorized"
                        }
                    }
                    HistoryEventType.TASK_COMPLETED -> {
                        reconstructedStatus = "COMPLETED"
                        if (evt.timestamp in monthStartMs..monthEndMs) {
                            completedInTargetMonth = true
                        }
                    }
                    HistoryEventType.TASK_REOPENED -> {
                        reconstructedStatus = "PENDING"
                        // If reopened in or after this month, it is no longer completed at that point
                        if (evt.timestamp in monthStartMs..monthEndMs) {
                            completedInTargetMonth = false
                        }
                    }
                    HistoryEventType.TASK_POSTPONED -> {
                        reconstructedStatus = "POSTPONED"
                    }
                    HistoryEventType.TASK_DELETED -> {
                        reconstructedStatus = "DELETED"
                        completedInTargetMonth = false
                    }
                    HistoryEventType.PRIORITY_CHANGED -> {
                        if (evt.newPriority != null) {
                            reconstructedPriority = Priority.fromLabel(evt.newPriority)
                        }
                    }
                    HistoryEventType.CATEGORY_CHANGED -> {
                        reconstructedCategoryId = evt.newCategoryId
                        reconstructedCategoryName = evt.categoryName
                            ?: evt.newCategoryId?.let { historicalCategoryNames[it] }
                            ?: "Uncategorized"
                    }
                }
            }

            // Tasks deleted on or before monthEndMs do not count
            if (reconstructedStatus == "DELETED") {
                continue
            }

            // Check if task completed in the target month and remained completed as of monthEndMs
            if (completedInTargetMonth && reconstructedStatus == "COMPLETED") {
                completedCountInMonth++
                val accomplishmentTitle = if (latestTitle.isNotBlank()) latestTitle else (taskRow?.title ?: "Task $taskId")
                if (!accomplishmentsList.contains(accomplishmentTitle)) {
                    accomplishmentsList.add(accomplishmentTitle)
                }
            } else if (reconstructedStatus == "PENDING" || reconstructedStatus == "POSTPONED") {
                // If pending or postponed as of monthEndMs, this task was UNFINISHED for the target month
                unfinishedAtMonthEnd++
                when (reconstructedPriority) {
                    Priority.PRESENT_1 -> p1++
                    Priority.PRESENT_5 -> p5++
                    Priority.LATER_1 -> l1++
                    Priority.LATER_5 -> l5++
                }
                val catName = if (reconstructedCategoryName.isNotBlank()) reconstructedCategoryName else "Uncategorized"
                categoryCountMap[catName] = (categoryCountMap[catName] ?: 0) + 1
            }
        }

        val totalVolume = completedCountInMonth + unfinishedAtMonthEnd
        val completionRate = if (totalVolume > 0) (completedCountInMonth.toFloat() / totalVolume.toFloat()) * 100f else 0f

        return MonthlyReportResult(
            year = year,
            month = month,
            tasksCreated = createdEvents.size,
            tasksCompleted = completedCountInMonth,
            unfinishedTasks = unfinishedAtMonthEnd,
            postponedTasks = postponedEvents.size,
            completionRate = completionRate,
            accomplishments = accomplishmentsList,
            priorityBreakdown = PriorityBreakdown(p1, p5, l1, l5),
            categoryBreakdown = categoryCountMap
        )
    }

    private fun getEventOrder(eventType: String): Int {
        return when (eventType) {
            HistoryEventType.TASK_CREATED -> 0
            HistoryEventType.DUE_DATE_CHANGED -> 1
            HistoryEventType.PRIORITY_CHANGED -> 2
            HistoryEventType.CATEGORY_CHANGED -> 3
            HistoryEventType.TASK_POSTPONED -> 4
            HistoryEventType.TASK_COMPLETED -> 5
            HistoryEventType.TASK_REOPENED -> 6
            HistoryEventType.TASK_DELETED -> 7
            else -> 8
        }
    }

    /**
     * Generates a deterministic cache key accounting for month, report type, and data version
     */
    fun buildCacheKey(year: Int, month: Int, reportType: String, dataVersion: Int): String {
        return "cache_${year}_${month}_${reportType}_v${dataVersion}"
    }
}
