package com.momentum.app.data.local.dao

import androidx.room.*
import com.momentum.app.data.local.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks ORDER BY dueDate ASC, createdDate DESC")
    fun getAllTasks(): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE id = :id")
    suspend fun getTaskById(id: String): TaskEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: TaskEntity)

    @Update
    suspend fun updateTask(task: TaskEntity)

    @Query("DELETE FROM tasks WHERE id = :taskId")
    suspend fun deleteTask(taskId: String)

    @Query("UPDATE tasks SET categoryId = null WHERE categoryId = :categoryId")
    suspend fun nullifyCategoryForTasks(categoryId: String): Int
}

@Dao
interface TaskHistoryDao {
    @Query("SELECT * FROM task_history ORDER BY timestamp DESC")
    fun getAllHistory(): Flow<List<TaskHistoryEntity>>

    @Query("SELECT * FROM task_history WHERE taskId = :taskId ORDER BY timestamp DESC")
    fun getHistoryForTask(taskId: String): Flow<List<TaskHistoryEntity>>

    @Query("SELECT * FROM task_history WHERE timestamp BETWEEN :startMs AND :endMs ORDER BY timestamp ASC")
    suspend fun getHistoryInWindow(startMs: Long, endMs: Long): List<TaskHistoryEntity>

    @Query("SELECT * FROM task_history WHERE timestamp <= :endMs ORDER BY timestamp ASC")
    suspend fun getHistoryUpTo(endMs: Long): List<TaskHistoryEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistory(entry: TaskHistoryEntity)
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY name ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories WHERE id = :id")
    suspend fun getCategoryById(id: String): CategoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: CategoryEntity)

    @Query("UPDATE categories SET name = :newName WHERE id = :id")
    suspend fun renameCategory(id: String, newName: String)

    @Query("DELETE FROM categories WHERE id = :id")
    suspend fun deleteCategory(id: String)
}

@Dao
interface SettingDao {
    @Query("SELECT value FROM settings WHERE `key` = :key")
    suspend fun getSetting(key: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setSetting(setting: SettingEntity)
}

@Dao
interface ReportCacheDao {
    @Query("SELECT * FROM report_cache WHERE cacheKey = :key")
    suspend fun getCache(key: String): ReportCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCache(cache: ReportCacheEntity)

    @Query("DELETE FROM report_cache WHERE dataVersion != :currentVersion")
    suspend fun invalidateOldCaches(currentVersion: Int)
}
