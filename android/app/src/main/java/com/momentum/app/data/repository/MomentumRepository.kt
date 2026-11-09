package com.momentum.app.data.repository

import androidx.room.withTransaction
import com.momentum.app.data.local.MomentumDatabase
import com.momentum.app.data.local.entity.*
import com.momentum.app.domain.model.HistoryEventType
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus
import com.momentum.app.domain.model.ThemeMode
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class MomentumRepository(private val db: MomentumDatabase) {

    private val taskDao = db.taskDao()
    private val historyDao = db.taskHistoryDao()
    private val categoryDao = db.categoryDao()
    private val settingDao = db.settingDao()
    private val cacheDao = db.reportCacheDao()

    val allTasks: Flow<List<TaskEntity>> = taskDao.getAllTasks()
    val allHistory: Flow<List<TaskHistoryEntity>> = historyDao.getAllHistory()
    val allCategories: Flow<List<CategoryEntity>> = categoryDao.getAllCategories()

    // Task Operations with History Logging (Atomic Room Transactions)
    suspend fun createTask(
        title: String,
        notes: String,
        dueDate: String,
        priority: Priority,
        categoryId: String?
    ): TaskEntity = db.withTransaction {
        val now = System.currentTimeMillis()
        val task = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = title.trim(),
            notes = notes.trim(),
            createdDate = now,
            dueDate = dueDate,
            priority = priority,
            categoryId = categoryId,
            status = TaskStatus.PENDING,
            updatedAt = now
        )
        taskDao.insertTask(task)

        val catName = categoryId?.let { categoryDao.getCategoryById(it)?.name }

        historyDao.insertHistory(
            TaskHistoryEntity(
                id = UUID.randomUUID().toString(),
                taskId = task.id,
                taskTitle = task.title,
                eventType = HistoryEventType.TASK_CREATED,
                timestamp = now,
                details = "Task created with priority ${priority.label} and due date $dueDate",
                newStatus = TaskStatus.PENDING.name,
                newDueDate = dueDate,
                newPriority = priority.label,
                newCategoryId = categoryId,
                categoryName = catName
            )
        )
        task
    }

    suspend fun updateTask(
        task: TaskEntity,
        newTitle: String,
        newNotes: String,
        newDueDate: String,
        newPriority: Priority,
        newCategoryId: String?
    ) = db.withTransaction {
        val now = System.currentTimeMillis()
        val dueDateChanged = task.dueDate != newDueDate
        val priorityChanged = task.priority != newPriority
        val categoryChanged = task.categoryId != newCategoryId

        val updated = task.copy(
            title = newTitle.trim(),
            notes = newNotes.trim(),
            dueDate = newDueDate,
            priority = newPriority,
            categoryId = newCategoryId,
            updatedAt = now
        )
        taskDao.updateTask(updated)

        if (dueDateChanged) {
            historyDao.insertHistory(
                TaskHistoryEntity(
                    id = UUID.randomUUID().toString(),
                    taskId = task.id,
                    taskTitle = updated.title,
                    eventType = HistoryEventType.DUE_DATE_CHANGED,
                    timestamp = now,
                    details = "Due date rescheduled from ${task.dueDate} to $newDueDate",
                    previousDueDate = task.dueDate,
                    newDueDate = newDueDate
                )
            )
        }
        if (priorityChanged) {
            historyDao.insertHistory(
                TaskHistoryEntity(
                    id = UUID.randomUUID().toString(),
                    taskId = task.id,
                    taskTitle = updated.title,
                    eventType = HistoryEventType.PRIORITY_CHANGED,
                    timestamp = now,
                    details = "Priority modified from ${task.priority.label} to ${newPriority.label}",
                    previousPriority = task.priority.label,
                    newPriority = newPriority.label
                )
            )
        }
        if (categoryChanged) {
            val newCatName = newCategoryId?.let { categoryDao.getCategoryById(it)?.name }
            historyDao.insertHistory(
                TaskHistoryEntity(
                    id = UUID.randomUUID().toString(),
                    taskId = task.id,
                    taskTitle = updated.title,
                    eventType = HistoryEventType.CATEGORY_CHANGED,
                    timestamp = now,
                    details = "Category assignment updated",
                    previousCategoryId = task.categoryId,
                    newCategoryId = newCategoryId,
                    categoryName = newCatName
                )
            )
        }
    }

    suspend fun completeTask(task: TaskEntity) = db.withTransaction {
        val now = System.currentTimeMillis()
        val updated = task.copy(
            status = TaskStatus.COMPLETED,
            completedAt = now,
            updatedAt = now
        )
        taskDao.updateTask(updated)

        historyDao.insertHistory(
            TaskHistoryEntity(
                id = UUID.randomUUID().toString(),
                taskId = task.id,
                taskTitle = task.title,
                eventType = HistoryEventType.TASK_COMPLETED,
                timestamp = now,
                details = "Task successfully completed",
                previousStatus = task.status.name,
                newStatus = TaskStatus.COMPLETED.name
            )
        )
    }

    suspend fun reopenTask(task: TaskEntity) = db.withTransaction {
        val now = System.currentTimeMillis()
        val updated = task.copy(
            status = TaskStatus.PENDING,
            completedAt = null,
            updatedAt = now
        )
        taskDao.updateTask(updated)

        historyDao.insertHistory(
            TaskHistoryEntity(
                id = UUID.randomUUID().toString(),
                taskId = task.id,
                taskTitle = task.title,
                eventType = HistoryEventType.TASK_REOPENED,
                timestamp = now,
                details = "Task reopened to pending backlog",
                previousStatus = task.status.name,
                newStatus = TaskStatus.PENDING.name
            )
        )
    }

    suspend fun postponeTask(task: TaskEntity, postponeUntilDate: String) = db.withTransaction {
        val now = System.currentTimeMillis()
        val updated = task.copy(
            dueDate = postponeUntilDate,
            postponedCount = task.postponedCount + 1,
            postponedUntil = postponeUntilDate,
            status = TaskStatus.PENDING,
            updatedAt = now
        )
        taskDao.updateTask(updated)

        historyDao.insertHistory(
            TaskHistoryEntity(
                id = UUID.randomUUID().toString(),
                taskId = task.id,
                taskTitle = task.title,
                eventType = HistoryEventType.TASK_POSTPONED,
                timestamp = now,
                details = "Postponed from ${task.dueDate} to $postponeUntilDate (Count: ${updated.postponedCount})",
                previousDueDate = task.dueDate,
                newDueDate = postponeUntilDate,
                postponedUntil = postponeUntilDate
            )
        )
    }

    suspend fun deleteTask(task: TaskEntity) = db.withTransaction {
        val now = System.currentTimeMillis()
        taskDao.deleteTask(task.id)

        historyDao.insertHistory(
            TaskHistoryEntity(
                id = UUID.randomUUID().toString(),
                taskId = task.id,
                taskTitle = task.title,
                eventType = HistoryEventType.TASK_DELETED,
                timestamp = now,
                details = "Task deleted from momentum register",
                previousStatus = task.status.name,
                newStatus = "DELETED"
            )
        )
    }

    // Category Management with Safe Deletion Guarantee
    suspend fun createCategory(name: String, colorHex: String = "#2563eb"): CategoryEntity {
        val cat = CategoryEntity(
            id = UUID.randomUUID().toString(),
            name = name.trim(),
            colorHex = colorHex
        )
        categoryDao.insertCategory(cat)
        return cat
    }

    suspend fun renameCategory(id: String, newName: String) {
        categoryDao.renameCategory(id, newName.trim())
    }

    suspend fun deleteCategorySafely(id: String) = db.withTransaction {
        // Safe deletion guarantee: nullify categoryId on all associated tasks first
        taskDao.nullifyCategoryForTasks(id)
        // Then delete the category entity
        categoryDao.deleteCategory(id)
    }

    // Theme Persistence
    suspend fun getSelectedTheme(): ThemeMode {
        val saved = settingDao.getSetting("app_theme")
        return if (saved != null) ThemeMode.fromString(saved) else ThemeMode.CALM_BLUE
    }

    suspend fun setSelectedTheme(theme: ThemeMode) {
        settingDao.setSetting(SettingEntity("app_theme", theme.name))
    }

    // Report Caching
    suspend fun getCachedReport(cacheKey: String): ReportCacheEntity? {
        return cacheDao.getCache(cacheKey)
    }

    suspend fun saveCachedReport(cache: ReportCacheEntity) {
        cacheDao.insertCache(cache)
    }

    // Gemini API Configuration
    suspend fun getGeminiApiKey(): String? {
        return settingDao.getSetting("gemini_api_key")
    }

    suspend fun setGeminiApiKey(apiKey: String) {
        settingDao.setSetting(SettingEntity("gemini_api_key", apiKey.trim()))
    }
}
