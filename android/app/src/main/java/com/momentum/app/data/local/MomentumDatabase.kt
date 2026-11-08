package com.momentum.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.momentum.app.data.local.dao.*
import com.momentum.app.data.local.entity.*

/**
 * Room Database for Momentum
 * Offline-first persistent storage with stable IDs and history logs.
 */
@Database(
    entities = [
        TaskEntity::class,
        TaskHistoryEntity::class,
        CategoryEntity::class,
        SettingEntity::class,
        ReportCacheEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class MomentumDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun taskHistoryDao(): TaskHistoryDao
    abstract fun categoryDao(): CategoryDao
    abstract fun settingDao(): SettingDao
    abstract fun reportCacheDao(): ReportCacheDao

    companion object {
        @Volatile
        private var INSTANCE: MomentumDatabase? = null

        fun getDatabase(context: Context): MomentumDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    MomentumDatabase::class.java,
                    "momentum_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
