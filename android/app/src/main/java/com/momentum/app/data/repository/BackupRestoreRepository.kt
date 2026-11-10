package com.momentum.app.data.repository

import android.content.Context
import androidx.room.withTransaction
import com.momentum.app.data.local.MomentumDatabase
import com.momentum.app.data.local.entity.*
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus
import kotlinx.coroutines.flow.first
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class RestoreSummary(
    val tasksCount: Int,
    val historyCount: Int,
    val categoriesCount: Int,
    val settingsCount: Int
)

class BackupRestoreRepository(private val db: MomentumDatabase) {

    private val taskDao = db.taskDao()
    private val historyDao = db.taskHistoryDao()
    private val categoryDao = db.categoryDao()
    private val settingDao = db.settingDao()

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

    /**
     * Creates a real .csv file on the Android device with filename momentum_tasks_YYYY-MM-DD.csv
     */
    suspend fun createCsvFile(context: Context): File {
        val csvContent = exportToCsv()
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val fileName = "momentum_tasks_$dateStr.csv"
        val exportDir = File(context.cacheDir, "exports").apply { mkdirs() }
        val file = File(exportDir, fileName)
        file.writeText(csvContent)
        return file
    }

    /**
     * Exports full app data to a JSON string preserving tasks, history, categories, and settings
     */
    suspend fun exportToJson(): String {
        val tasks = taskDao.getAllTasks().first()
        val history = historyDao.getAllHistory().first()
        val categories = categoryDao.getAllCategories().first()
        val settings = settingDao.getAllSettings()

        val root = JSONObject()
        root.put("version", 1)
        root.put("appName", "Momentum")
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        root.put("exportedAt", isoFormat.format(Date()))

        // tasks
        val tasksArr = JSONArray()
        for (t in tasks) {
            val obj = JSONObject()
            obj.put("id", t.id)
            obj.put("title", t.title)
            obj.put("notes", t.notes)
            obj.put("createdDate", t.createdDate)
            obj.put("dueDate", t.dueDate)
            obj.put("priority", t.priority.label)
            if (t.categoryId != null) obj.put("categoryId", t.categoryId) else obj.put("categoryId", JSONObject.NULL)
            obj.put("status", t.status.name)
            if (t.completedAt != null) obj.put("completedAt", t.completedAt) else obj.put("completedAt", JSONObject.NULL)
            obj.put("postponedCount", t.postponedCount)
            if (t.postponedUntil != null) obj.put("postponedUntil", t.postponedUntil) else obj.put("postponedUntil", JSONObject.NULL)
            obj.put("updatedAt", t.updatedAt)
            tasksArr.put(obj)
        }
        root.put("tasks", tasksArr)

        // taskHistory
        val historyArr = JSONArray()
        for (h in history) {
            val obj = JSONObject()
            obj.put("id", h.id)
            obj.put("taskId", h.taskId)
            obj.put("taskTitle", h.taskTitle)
            obj.put("eventType", h.eventType)
            obj.put("timestamp", h.timestamp)
            obj.put("details", h.details)
            if (h.previousStatus != null) obj.put("previousStatus", h.previousStatus) else obj.put("previousStatus", JSONObject.NULL)
            if (h.newStatus != null) obj.put("newStatus", h.newStatus) else obj.put("newStatus", JSONObject.NULL)
            if (h.previousDueDate != null) obj.put("previousDueDate", h.previousDueDate) else obj.put("previousDueDate", JSONObject.NULL)
            if (h.newDueDate != null) obj.put("newDueDate", h.newDueDate) else obj.put("newDueDate", JSONObject.NULL)
            if (h.previousPriority != null) obj.put("previousPriority", h.previousPriority) else obj.put("previousPriority", JSONObject.NULL)
            if (h.newPriority != null) obj.put("newPriority", h.newPriority) else obj.put("newPriority", JSONObject.NULL)
            if (h.postponedUntil != null) obj.put("postponedUntil", h.postponedUntil) else obj.put("postponedUntil", JSONObject.NULL)
            if (h.previousCategoryId != null) obj.put("previousCategoryId", h.previousCategoryId) else obj.put("previousCategoryId", JSONObject.NULL)
            if (h.newCategoryId != null) obj.put("newCategoryId", h.newCategoryId) else obj.put("newCategoryId", JSONObject.NULL)
            if (h.categoryName != null) obj.put("categoryName", h.categoryName) else obj.put("categoryName", JSONObject.NULL)
            historyArr.put(obj)
        }
        root.put("taskHistory", historyArr)

        // categories
        val catArr = JSONArray()
        for (c in categories) {
            val obj = JSONObject()
            obj.put("id", c.id)
            obj.put("name", c.name)
            obj.put("colorHex", c.colorHex)
            obj.put("createdAt", c.createdAt)
            catArr.put(obj)
        }
        root.put("categories", catArr)

        // settings
        val settingsObj = JSONObject()
        for (s in settings) {
            settingsObj.put(s.key, s.value)
        }
        root.put("settings", settingsObj)

        return root.toString(2)
    }

    /**
     * Creates a real .json backup file on the Android device with filename momentum_backup_YYYY-MM-DD.json
     */
    suspend fun createJsonBackupFile(context: Context): File {
        val jsonData = exportToJson()
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val fileName = "momentum_backup_$dateStr.json"
        val exportDir = File(context.cacheDir, "exports").apply { mkdirs() }
        val file = File(exportDir, fileName)
        file.writeText(jsonData)
        return file
    }

    /**
     * Validates the JSON backup payload first. If valid, replaces data safely within a Room transaction.
     * If invalid, leaves existing data completely untouched and returns a failure result.
     */
    suspend fun validateAndRestore(jsonContent: String): Result<RestoreSummary> {
        return try {
            val root = try {
                JSONObject(jsonContent)
            } catch (e: Exception) {
                return Result.failure(IllegalArgumentException("Backup is not valid JSON: ${e.message}"))
            }

            if (!root.has("tasks") || root.isNull("tasks")) {
                return Result.failure(IllegalArgumentException("Backup missing required 'tasks' array."))
            }
            if (!root.has("taskHistory") || root.isNull("taskHistory")) {
                return Result.failure(IllegalArgumentException("Backup missing required 'taskHistory' array."))
            }

            val tasksArray = root.optJSONArray("tasks")
                ?: return Result.failure(IllegalArgumentException("'tasks' is not a JSON array."))
            val historyArray = root.optJSONArray("taskHistory")
                ?: return Result.failure(IllegalArgumentException("'taskHistory' is not a JSON array."))

            val parsedTasks = mutableListOf<TaskEntity>()
            for (i in 0 until tasksArray.length()) {
                val tObj = tasksArray.optJSONObject(i)
                    ?: return Result.failure(IllegalArgumentException("Task at index $i is corrupted."))
                val id = tObj.optString("id")
                val title = tObj.optString("title")
                val priorityStr = tObj.optString("priority")

                if (id.isBlank() || title.isBlank() || priorityStr.isBlank()) {
                    return Result.failure(IllegalArgumentException("Task at index $i missing id, title, or priority."))
                }

                val priority = Priority.entries.find { it.label == priorityStr || it.name == priorityStr }
                    ?: Priority.fromLabel(priorityStr)

                val dueDate = tObj.optString("dueDate").takeIf { it.isNotBlank() }
                    ?: SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                val notes = tObj.optString("notes", "")
                val createdDate = tObj.optLong("createdDate", System.currentTimeMillis())
                val categoryId = if (tObj.isNull("categoryId")) null else tObj.optString("categoryId").takeIf { it.isNotBlank() }
                val statusStr = tObj.optString("status", "PENDING")
                val status = try { TaskStatus.valueOf(statusStr) } catch (_: Exception) { TaskStatus.PENDING }
                val completedAt = if (tObj.isNull("completedAt")) null else tObj.optLong("completedAt").takeIf { it > 0 }
                val postponedCount = tObj.optInt("postponedCount", 0)
                val postponedUntil = if (tObj.isNull("postponedUntil")) null else tObj.optString("postponedUntil").takeIf { it.isNotBlank() }
                val updatedAt = tObj.optLong("updatedAt", System.currentTimeMillis())

                parsedTasks.add(
                    TaskEntity(
                        id = id,
                        title = title,
                        notes = notes,
                        createdDate = createdDate,
                        dueDate = dueDate,
                        priority = priority,
                        categoryId = categoryId,
                        status = status,
                        completedAt = completedAt,
                        postponedCount = postponedCount,
                        postponedUntil = postponedUntil,
                        updatedAt = updatedAt
                    )
                )
            }

            val parsedHistory = mutableListOf<TaskHistoryEntity>()
            for (i in 0 until historyArray.length()) {
                val hObj = historyArray.optJSONObject(i)
                    ?: return Result.failure(IllegalArgumentException("History entry at index $i is corrupted."))
                val id = hObj.optString("id")
                val taskId = hObj.optString("taskId")
                val eventType = hObj.optString("eventType")
                val taskTitle = hObj.optString("taskTitle", "Task")
                val timestamp = hObj.optLong("timestamp", System.currentTimeMillis())
                val details = hObj.optString("details", "")

                if (id.isBlank() || taskId.isBlank() || eventType.isBlank()) {
                    return Result.failure(IllegalArgumentException("History entry at index $i missing id, taskId, or eventType."))
                }

                parsedHistory.add(
                    TaskHistoryEntity(
                        id = id,
                        taskId = taskId,
                        taskTitle = taskTitle,
                        eventType = eventType,
                        timestamp = timestamp,
                        details = details,
                        previousStatus = if (hObj.isNull("previousStatus")) null else hObj.optString("previousStatus").takeIf { it.isNotBlank() },
                        newStatus = if (hObj.isNull("newStatus")) null else hObj.optString("newStatus").takeIf { it.isNotBlank() },
                        previousDueDate = if (hObj.isNull("previousDueDate")) null else hObj.optString("previousDueDate").takeIf { it.isNotBlank() },
                        newDueDate = if (hObj.isNull("newDueDate")) null else hObj.optString("newDueDate").takeIf { it.isNotBlank() },
                        previousPriority = if (hObj.isNull("previousPriority")) null else hObj.optString("previousPriority").takeIf { it.isNotBlank() },
                        newPriority = if (hObj.isNull("newPriority")) null else hObj.optString("newPriority").takeIf { it.isNotBlank() },
                        postponedUntil = if (hObj.isNull("postponedUntil")) null else hObj.optString("postponedUntil").takeIf { it.isNotBlank() },
                        previousCategoryId = if (hObj.isNull("previousCategoryId")) null else hObj.optString("previousCategoryId").takeIf { it.isNotBlank() },
                        newCategoryId = if (hObj.isNull("newCategoryId")) null else hObj.optString("newCategoryId").takeIf { it.isNotBlank() },
                        categoryName = if (hObj.isNull("categoryName")) null else hObj.optString("categoryName").takeIf { it.isNotBlank() }
                    )
                )
            }

            val parsedCategories = mutableListOf<CategoryEntity>()
            val categoriesArray = root.optJSONArray("categories")
            if (categoriesArray != null) {
                for (i in 0 until categoriesArray.length()) {
                    val cObj = categoriesArray.optJSONObject(i) ?: continue
                    val id = cObj.optString("id")
                    val name = cObj.optString("name")
                    val colorHex = cObj.optString("colorHex", "#2563eb")
                    val createdAt = cObj.optLong("createdAt", System.currentTimeMillis())
                    if (id.isNotBlank() && name.isNotBlank()) {
                        parsedCategories.add(CategoryEntity(id = id, name = name, colorHex = colorHex, createdAt = createdAt))
                    }
                }
            }

            val parsedSettings = mutableListOf<SettingEntity>()
            val settingsObj = root.optJSONObject("settings")
            if (settingsObj != null) {
                val keys = settingsObj.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    val v = settingsObj.optString(k, "")
                    if (k.isNotBlank()) {
                        parsedSettings.add(SettingEntity(key = k, value = v))
                    }
                }
            }

            // Safe atomic database replacement inside Room transaction
            db.withTransaction {
                taskDao.deleteAllTasks()
                historyDao.deleteAllHistory()
                categoryDao.deleteAllCategories()
                settingDao.deleteAllSettings()

                if (parsedCategories.isNotEmpty()) {
                    categoryDao.insertCategories(parsedCategories)
                }
                if (parsedTasks.isNotEmpty()) {
                    taskDao.insertTasks(parsedTasks)
                }
                if (parsedHistory.isNotEmpty()) {
                    historyDao.insertHistories(parsedHistory)
                }
                if (parsedSettings.isNotEmpty()) {
                    settingDao.insertSettings(parsedSettings)
                }
            }

            Result.success(
                RestoreSummary(
                    tasksCount = parsedTasks.size,
                    historyCount = parsedHistory.size,
                    categoriesCount = parsedCategories.size,
                    settingsCount = parsedSettings.size
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun escapeCsv(value: String): String {
        return if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            "\"" + value.replace("\"", "\"\"") + "\""
        } else {
            value
        }
    }
}
