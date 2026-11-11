package com.momentum.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus

/**
 * Momentum Task Entity
 * Priority is strictly one of: Present 1, Present 2, Present 15, Future 1, Future 2, Trashable.
 * Deleting a category sets categoryId to null without deleting the task.
 */
@Entity(
    tableName = "tasks",
    indices = [Index(value = ["dueDate"]), Index(value = ["status"])]
)
data class TaskEntity(
    @PrimaryKey val id: String, // Stable UUID
    val title: String,
    val notes: String = "",
    val createdDate: Long, // Epoch timestamp millis
    val dueDate: String, // Format: YYYY-MM-DD
    val priority: Priority, // Exactly one of the 6 priorities
    val categoryId: String? = null, // Nullable; task remains valid if category is removed
    val status: TaskStatus = TaskStatus.PENDING,
    val completedAt: Long? = null,
    val postponedCount: Int = 0,
    val postponedUntil: String? = null,
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * Task History Entity
 * Core data feature, not just a UI log. Used to reconstruct past monthly reports.
 */
@Entity(
    tableName = "task_history",
    indices = [Index(value = ["taskId"]), Index(value = ["timestamp"])]
)
data class TaskHistoryEntity(
    @PrimaryKey val id: String, // Stable UUID
    val taskId: String,
    val taskTitle: String, // Title snapshot at event time
    val eventType: String, // TASK_CREATED, TASK_COMPLETED, TASK_REOPENED, TASK_POSTPONED, etc.
    val timestamp: Long, // Exact epoch timestamp millis
    val details: String,
    val previousStatus: String? = null,
    val newStatus: String? = null,
    val previousDueDate: String? = null,
    val newDueDate: String? = null,
    val previousPriority: String? = null,
    val newPriority: String? = null,
    val postponedUntil: String? = null,
    val previousCategoryId: String? = null,
    val newCategoryId: String? = null,
    val categoryName: String? = null
)

/**
 * Category Entity
 * Independent of priority. Safe deletion retains all task records.
 */
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val colorHex: String = "#2563eb",
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Settings Entity
 * Persists theme (Calm Blue, Sage Green, Warm Focus, Modern Slate, Deep Focus)
 */
@Entity(tableName = "settings")
data class SettingEntity(
    @PrimaryKey val key: String,
    val value: String
)

/**
 * Report Cache Entity
 * Cache keys account for month, report type, and data version
 */
@Entity(tableName = "report_cache")
data class ReportCacheEntity(
    @PrimaryKey val cacheKey: String,
    val month: String,
    val reportType: String,
    val dataVersion: Int,
    val timestamp: Long,
    val payloadJson: String
)
