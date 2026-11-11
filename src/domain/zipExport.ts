import JSZip from 'jszip';

export async function generateAndDownloadAppZip(): Promise<void> {
  // 1. First attempt: Stream directly from the live /android directory via server route
  try {
    const res = await fetch('/api/export-android-project');
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `momentum-android-app-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch {
    // Fall back to complete bundled JSZip if network is unavailable
  }

  const zip = new JSZip();

  // Root build files
  zip.file(
    'build.gradle.kts',
    `// Top-level build file
plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("com.google.devtools.ksp") version "2.0.21-1.0.28" apply false
}
`
  );

  zip.file(
    'settings.gradle.kts',
    `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Momentum"
include(":app")
`
  );

  zip.file(
    'gradle.properties',
    `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`
  );

  zip.file(
    'gradle/wrapper/gradle-wrapper.properties',
    `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
  );

  // GitHub Actions CI Workflow
  zip.file(
    '.github/workflows/android.yml',
    `name: Android Build & Test CI

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    name: Build & Assemble Debug APK
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: gradle

    - name: Setup Gradle
      uses: gradle/actions/setup-gradle@v3

    - name: Grant execute permission for gradlew
      run: chmod +x gradlew || true

    - name: Build with Gradle
      run: ./gradlew assembleDebug --stacktrace

    - name: Upload Debug APK Artifact
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: momentum-debug-apk
        path: app/build/outputs/apk/debug/*.apk
        if-no-files-found: warn
`
  );

  // App module build.gradle.kts
  zip.file(
    'app/build.gradle.kts',
    `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.momentum.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.momentum.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    // Room Database
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
}
`
  );

  zip.file(
    'app/proguard-rules.pro',
    `-keepattributes *Annotation*
-keepclassmembers class * {
    @androidx.room.* *;
}
`
  );

  zip.file(
    'app/src/main/res/values/strings.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Momentum</string>
</resources>
`
  );

  zip.file(
    'app/src/main/res/values/themes.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.Momentum" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
    </style>
</resources>
`
  );

  zip.file(
    'app/src/main/res/xml/file_paths.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<paths>
    <cache-path name="exports_cache" path="exports/" />
    <files-path name="exports_files" path="exports/" />
</paths>
`
  );

  zip.file(
    'app/src/main/AndroidManifest.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.momentum.app">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".MomentumApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Momentum"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Momentum">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/Theme.Momentum">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="com.momentum.app.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
`
  );

  // Kotlin Sources
  const srcBase = 'app/src/main/java/com/momentum/app';

  zip.file(
    `${srcBase}/MomentumApplication.kt`,
    `package com.momentum.app

import android.app.Application
import com.momentum.app.data.local.MomentumDatabase
import com.momentum.app.data.repository.MomentumRepository
import com.momentum.app.data.repository.BackupRestoreRepository
import com.momentum.app.data.remote.GeminiApiClient
import kotlinx.coroutines.runBlocking

class MomentumApplication : Application() {
    val database: MomentumDatabase by lazy { MomentumDatabase.getDatabase(this) }
    val repository: MomentumRepository by lazy { MomentumRepository(database) }
    val backupRestoreRepository: BackupRestoreRepository by lazy { BackupRestoreRepository(database) }
    val geminiApiClient: GeminiApiClient by lazy {
        GeminiApiClient {
            runBlocking { repository.getGeminiApiKey() }
        }
    }
}
`
  );

  zip.file(
    `${srcBase}/domain/model/Priority.kt`,
    `package com.momentum.app.domain.model

enum class Priority(val label: String) {
    PRESENT_1("Present 1"),
    PRESENT_2("Present 2"),
    PRESENT_15("Present 15"),
    FUTURE_1("Future 1"),
    FUTURE_2("Future 2"),
    TRASHABLE("Trashable");

    companion object {
        fun fromLabel(label: String?): Priority {
            if (label == null) return PRESENT_1
            val trimmed = label.trim()
            entries.find { it.label.equals(trimmed, ignoreCase = true) || it.name.equals(trimmed, ignoreCase = true) }?.let { return it }
            return when {
                trimmed.equals("Present 1", ignoreCase = true) || trimmed.equals("PRESENT_1", ignoreCase = true) -> PRESENT_1
                trimmed.equals("Present 5", ignoreCase = true) || trimmed.equals("PRESENT_5", ignoreCase = true) -> PRESENT_2
                trimmed.equals("Later 1", ignoreCase = true) || trimmed.equals("LATER_1", ignoreCase = true) -> FUTURE_1
                trimmed.equals("Later 5", ignoreCase = true) || trimmed.equals("LATER_5", ignoreCase = true) -> FUTURE_2
                else -> PRESENT_1
            }
        }
    }
}

enum class TaskStatus {
    PENDING,
    COMPLETED,
    POSTPONED
}
`
  );

  zip.file(
    `${srcBase}/domain/model/Models.kt`,
    `package com.momentum.app.domain.model

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
`
  );

  zip.file(
    `${srcBase}/data/local/entity/Entities.kt`,
    `package com.momentum.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus

@Entity(
    tableName = "tasks",
    indices = [Index(value = ["dueDate"]), Index(value = ["status"])]
)
data class TaskEntity(
    @PrimaryKey val id: String,
    val title: String,
    val notes: String = "",
    val createdDate: Long,
    val dueDate: String,
    val priority: Priority,
    val categoryId: String? = null,
    val status: TaskStatus = TaskStatus.PENDING,
    val completedAt: Long? = null,
    val postponedCount: Int = 0,
    val postponedUntil: String? = null,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "task_history",
    indices = [Index(value = ["taskId"]), Index(value = ["timestamp"])]
)
data class TaskHistoryEntity(
    @PrimaryKey val id: String,
    val taskId: String,
    val taskTitle: String,
    val eventType: String,
    val timestamp: Long,
    val details: String,
    val previousStatus: String? = null,
    val newStatus: String? = null,
    val previousDueDate: String? = null,
    val newDueDate: String? = null,
    val previousPriority: String? = null,
    val newPriority: String? = null,
    val postponedUntil: String? = null
)

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val colorHex: String = "#2563eb",
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "settings")
data class SettingEntity(
    @PrimaryKey val key: String,
    val value: String
)

@Entity(tableName = "report_cache")
data class ReportCacheEntity(
    @PrimaryKey val cacheKey: String,
    val month: String,
    val reportType: String,
    val dataVersion: Int,
    val timestamp: Long,
    val payloadJson: String
)
`
  );

  zip.file(
    `${srcBase}/data/local/dao/MomentumDao.kt`,
    `package com.momentum.app.data.local.dao

import androidx.room.*
import com.momentum.app.data.local.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks ORDER BY dueDate ASC, createdDate DESC")
    fun getAllTasks(): Flow<List<TaskEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: TaskEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTasks(tasks: List<TaskEntity>)

    @Update
    suspend fun updateTask(task: TaskEntity)

    @Query("DELETE FROM tasks WHERE id = :taskId")
    suspend fun deleteTask(taskId: String)

    @Query("DELETE FROM tasks")
    suspend fun deleteAllTasks()

    @Query("UPDATE tasks SET categoryId = null WHERE categoryId = :categoryId")
    suspend fun nullifyCategoryForTasks(categoryId: String): Int
}

@Dao
interface TaskHistoryDao {
    @Query("SELECT * FROM task_history ORDER BY timestamp DESC")
    fun getAllHistory(): Flow<List<TaskHistoryEntity>>

    @Query("SELECT * FROM task_history WHERE timestamp BETWEEN :startMs AND :endMs ORDER BY timestamp ASC")
    suspend fun getHistoryInWindow(startMs: Long, endMs: Long): List<TaskHistoryEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistory(entry: TaskHistoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHistories(entries: List<TaskHistoryEntity>)

    @Query("DELETE FROM task_history")
    suspend fun deleteAllHistory()
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY name ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<CategoryEntity>)

    @Query("DELETE FROM categories WHERE id = :id")
    suspend fun deleteCategory(id: String)

    @Query("DELETE FROM categories")
    suspend fun deleteAllCategories()
}

@Dao
interface SettingDao {
    @Query("SELECT value FROM settings WHERE \`key\` = :key")
    suspend fun getSetting(key: String): String?

    @Query("SELECT * FROM settings")
    suspend fun getAllSettings(): List<SettingEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setSetting(setting: SettingEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSettings(settings: List<SettingEntity>)

    @Query("DELETE FROM settings")
    suspend fun deleteAllSettings()
}

@Dao
interface ReportCacheDao {
    @Query("SELECT * FROM report_cache WHERE cacheKey = :key")
    suspend fun getCache(key: String): ReportCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCache(cache: ReportCacheEntity)
}
`
  );

  zip.file(
    `${srcBase}/data/local/converter/Converters.kt`,
    `package com.momentum.app.data.local.converter

import androidx.room.TypeConverter
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus

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
`
  );

  zip.file(
    `${srcBase}/data/local/MomentumDatabase.kt`,
    `package com.momentum.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.momentum.app.data.local.dao.*
import com.momentum.app.data.local.entity.*
import com.momentum.app.data.local.converter.Converters

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
@TypeConverters(Converters::class)
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
`
  );

  zip.file(
    `${srcBase}/data/remote/GeminiApiClient.kt`,
    `package com.momentum.app.data.remote

import com.momentum.app.domain.model.FourTilesResult
import com.momentum.app.domain.model.MonthlyReportResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class GeminiMessage(val role: String, val content: String)

class GeminiApiClient(
    private var apiKeyProvider: () -> String? = { null }
) {
    companion object {
        private const val MODEL_NAME = "gemini-3.8-flash"
        private const val API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
    }

    suspend fun generateReportAdvice(
        historyMessages: List<GeminiMessage>,
        fourTiles: FourTilesResult,
        monthStats: MonthlyReportResult?
    ): Result<String> = withContext(Dispatchers.IO) {
        val apiKey = apiKeyProvider()?.trim()
        if (apiKey.isNullOrEmpty()) {
            return@withContext Result.failure(
                IllegalStateException("GEMINI_API_KEY is not configured. Please supply a valid Gemini API key in Settings.")
            )
        }

        try {
            val url = URL("$API_BASE_URL/$MODEL_NAME:generateContent?key=$apiKey")
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 25000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }

            val requestBody = JSONObject().apply {
                val contentsArray = JSONArray()
                for (msg in historyMessages) {
                    val role = if (msg.role == "assistant" || msg.role == "model") "model" else "user"
                    contentsArray.put(JSONObject().apply {
                        put("role", role)
                        put("parts", JSONArray().apply {
                            put(JSONObject().apply { put("text", msg.content) })
                        })
                    })
                }
                put("contents", contentsArray)
            }

            OutputStreamWriter(connection.outputStream, "UTF-8").use { it.write(requestBody.toString()) }

            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val responseText = BufferedReader(InputStreamReader(connection.inputStream, "UTF-8")).use { it.readText() }
                val json = JSONObject(responseText)
                val reply = json.optJSONArray("candidates")?.optJSONObject(0)?.optJSONObject("content")?.optJSONArray("parts")?.optJSONObject(0)?.optString("text")
                Result.success(reply ?: "Analysis completed.")
            } else {
                Result.failure(RuntimeException("Gemini API Error: HTTP \${connection.responseCode}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
`
  );

  // Instructions README in ZIP
  zip.file(
    'README.md',
    `# Momentum - Native Android App Project

Native Android Kotlin + Jetpack Compose + Room database project for Momentum.

## GitHub Actions CI/CD
This project includes \`.github/workflows/android.yml\`.
Push to GitHub to automatically build and output the debug APK artifact via GitHub Actions.

## Android Studio
1. Open Android Studio.
2. Select **Open** and choose this directory.
3. Sync Gradle and run on device/emulator (API 26+).
`
  );

  // Generate ZIP blob and trigger download
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `momentum-android-app-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
