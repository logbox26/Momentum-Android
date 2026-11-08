package com.momentum.app

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
