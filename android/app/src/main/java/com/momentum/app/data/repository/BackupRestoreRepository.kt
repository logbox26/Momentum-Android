package com.momentum.app.data.repository

import com.momentum.app.data.local.MomentumDatabase
import com.momentum.app.data.local.entity.*
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus
import kotlinx.coroutines.flow.first
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BackupRestoreRepository(private val db: MomentumDatabase) {

    private val taskDao = db.taskDao()
    private val historyDao = db.taskHistoryDao()
    private val categoryDao = db.categoryDao()

    /**
     * Generates standard CSV export string containing all required fields:
     * Task, Dates, Status, Priority, Category, Completion information, Postponement information
     */
    suspend fun exportToCsv(): String {
        val tasks = taskDao.getAllTasks().first()
        val categories = categoryDao.getAllCategories().first().associate { it.id to it.name }
        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

        val sb = StringBuilder()
        sb.append("ID,Title,Notes,CreatedDate,DueDate,Priority,Category,Status,CompletedAt,PostponedCount,PostponedUntil\n")

        for (t in tasks) {
            val title = escapeCsv(t.title)
            val notes = escapeCsv(t.notes)
            val created = dateFormat.format(Date(t.createdDate))
            val dueDate = escapeCsv(t.dueDate)
            val priority = escapeCsv(t.priority.label)
            val category = escapeCsv(t.categoryId?.let { categories[it] } ?: "Uncategorized")
            val status = t.status.name
            val completed = if (t.completedAt != null) dateFormat.format(Date(t.completedAt)) else ""
            val postponedUntil = escapeCsv(t.postponedUntil ?: "")

            sb.append("${t.id},$title,$notes,$created,$dueDate,$priority,$category,$status,$completed,${t.postponedCount},$postponedUntil\n")
        }
        return sb.toString()
    }

    private fun escapeCsv(value: String): String {
        return if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            "\"" + value.replace("\"", "\"\"") + "\""
        } else {
            value
        }
    }
}
