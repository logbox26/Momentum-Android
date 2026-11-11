package com.momentum.app.data.local.converter

import androidx.room.TypeConverter
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus

/**
 * Room TypeConverters for seamless, backwards-compatible priority persistence.
 * Maps legacy values ("Present 5", "PRESENT_5", "Later 1", "LATER_1", "Later 5", "LATER_5")
 * directly to the new 6-tier Priority enum without requiring destructive migrations.
 */
class Converters {
    @TypeConverter
    fun fromPriority(priority: Priority?): String {
        return priority?.label ?: Priority.PRESENT_1.label
    }

    @TypeConverter
    fun toPriority(value: String?): Priority {
        return Priority.fromLabel(value)
    }

    @TypeConverter
    fun fromTaskStatus(status: TaskStatus?): String {
        return status?.name ?: TaskStatus.PENDING.name
    }

    @TypeConverter
    fun toTaskStatus(value: String?): TaskStatus {
        if (value == null) return TaskStatus.PENDING
        return try {
            TaskStatus.valueOf(value)
        } catch (_: Exception) {
            TaskStatus.PENDING
        }
    }
}
