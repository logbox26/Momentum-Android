package com.momentum.app.domain.model

enum class ThemeMode(val title: String, val description: String) {
    CALM_BLUE("Calm Blue", "Soft blue, light neutral, dark blue accents"),
    SAGE_GREEN("Sage Green", "Muted sage, cream, dark green accents"),
    WARM_FOCUS("Warm Focus", "Cream, beige, orange, charcoal"),
    MODERN_SLATE("Modern Slate", "Light grey, slate, blue, dark slate"),
    DEEP_FOCUS("Deep Focus", "Dark charcoal, muted blue/green, high contrast");

    companion object {
        fun fromString(name: String): ThemeMode {
            return entries.find { it.name.equals(name, ignoreCase = true) || it.title.equals(name, ignoreCase = true) }
                ?: CALM_BLUE
        }
    }
}

object HistoryEventType {
    const val TASK_CREATED = "TASK_CREATED"
    const val TASK_COMPLETED = "TASK_COMPLETED"
    const val TASK_REOPENED = "TASK_REOPENED"
    const val TASK_POSTPONED = "TASK_POSTPONED"
    const val DUE_DATE_CHANGED = "DUE_DATE_CHANGED"
    const val PRIORITY_CHANGED = "PRIORITY_CHANGED"
    const val CATEGORY_CHANGED = "CATEGORY_CHANGED"
    const val TASK_DELETED = "TASK_DELETED"
}

data class PriorityBreakdown(
    val present1: Int = 0,
    val present2: Int = 0,
    val present15: Int = 0,
    val future1: Int = 0,
    val future2: Int = 0
)

data class FourTilesResult(
    val dailyCompletionRate: Float,
    val dailyCompletedCount: Int,
    val dailyTotalCount: Int,
    val weeklyCompletionRate: Float,
    val weeklyCompletedCount: Int,
    val weeklyTotalCount: Int,
    val monthlyCompletionRate: Float,
    val monthlyCompletedCount: Int,
    val monthlyTotalCount: Int,
    val unfinishedCount: Int,
    val unfinishedByPriority: PriorityBreakdown
)

data class MonthlyReportResult(
    val year: Int,
    val month: Int,
    val tasksCreated: Int,
    val tasksCompleted: Int,
    val unfinishedTasks: Int,
    val postponedTasks: Int,
    val completionRate: Float,
    val accomplishments: List<String>,
    val priorityBreakdown: PriorityBreakdown,
    val categoryBreakdown: Map<String, Int>
)
