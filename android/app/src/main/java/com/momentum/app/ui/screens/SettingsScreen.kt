package com.momentum.app.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.momentum.app.data.local.entity.CategoryEntity
import com.momentum.app.data.repository.BackupRestoreRepository
import com.momentum.app.data.repository.MomentumRepository
import com.momentum.app.domain.model.ThemeMode
import com.momentum.app.ui.theme.LocalMomentumColors
import kotlinx.coroutines.launch
import java.io.File

private fun shareFile(context: Context, file: File, mimeType: String, title: String) {
    val uri: Uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file
    )
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, file.name)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    val chooser = Intent.createChooser(intent, title).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(chooser)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    repository: MomentumRepository,
    backupRepository: BackupRestoreRepository,
    currentTheme: ThemeMode,
    onThemeSelected: (ThemeMode) -> Unit
) {
    val colors = LocalMomentumColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val categories by repository.allCategories.collectAsState(initial = emptyList())

    var newCategoryName by remember { mutableStateOf("") }
    var exportStatusMessage by remember { mutableStateOf<String?>(null) }
    var isStatusError by remember { mutableStateOf(false) }

    val restorePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                try {
                    val jsonContent = context.contentResolver.openInputStream(uri)?.use { stream ->
                        stream.bufferedReader().readText()
                    } ?: throw IllegalArgumentException("Could not open selected file.")

                    val result = backupRepository.validateAndRestore(jsonContent)
                    if (result.isSuccess) {
                        val summary = result.getOrThrow()
                        isStatusError = false
                        exportStatusMessage = "Restored ${summary.tasksCount} tasks, ${summary.categoriesCount} categories, and ${summary.historyCount} history logs."
                        val restoredTheme = repository.getSelectedTheme()
                        onThemeSelected(restoredTheme)
                    } else {
                        isStatusError = true
                        exportStatusMessage = "Restore failed: ${result.exceptionOrNull()?.message ?: "Invalid backup file"}"
                    }
                } catch (e: Exception) {
                    isStatusError = true
                    exportStatusMessage = "Restore error: ${e.localizedMessage ?: e.message}"
                }
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Settings & Configuration",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary
            )
            Text(
                text = "Manage themes, categories with safe deletion, and data backups.",
                fontSize = 12.sp,
                color = colors.textSecondary
            )
        }

        // Theme Selector (Exactly 5 persistent themes)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "App Theme",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    ThemeMode.entries.forEach { theme ->
                        val isSelected = currentTheme == theme
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) colors.primary.copy(alpha = 0.1f) else Color.Transparent)
                                .clickable {
                                    onThemeSelected(theme)
                                    scope.launch { repository.setSelectedTheme(theme) }
                                }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(theme.title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                                Text(theme.description, fontSize = 10.sp, color = colors.textMuted)
                            }
                            if (isSelected) {
                                Icon(Icons.Default.Check, contentDescription = "Active", tint = colors.primary, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }

        // Category Management with Safe Deletion
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Category Management",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Safe Deletion Guarantee: Deleting a category keeps all associated tasks intact.",
                        fontSize = 11.sp,
                        color = colors.textMuted
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = newCategoryName,
                            onValueChange = { newCategoryName = it },
                            placeholder = { Text("New category name...", fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        Button(
                            onClick = {
                                if (newCategoryName.isNotBlank()) {
                                    scope.launch {
                                        repository.createCategory(newCategoryName.trim())
                                        newCategoryName = ""
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add")
                        }
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        categories.forEach { cat ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(colors.surfaceElevated)
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(cat.name, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                IconButton(
                                    onClick = {
                                        scope.launch { repository.deleteCategorySafely(cat.id) }
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = "Safe Delete",
                                        tint = Color(0xFFEF4444),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Backup & Export (CSV, JSON Backup, JSON Restore)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Data Export & Backup",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Export tasks to CSV, or save and restore complete JSON backups using Android file sharing and picker.",
                        fontSize = 11.sp,
                        color = colors.textMuted
                    )

                    Button(
                        onClick = {
                            scope.launch {
                                try {
                                    val file = backupRepository.createCsvFile(context)
                                    shareFile(context, file, "text/csv", "Export Tasks to CSV")
                                    isStatusError = false
                                    exportStatusMessage = "CSV exported: ${file.name}"
                                } catch (e: Exception) {
                                    isStatusError = true
                                    exportStatusMessage = "CSV export failed: ${e.localizedMessage ?: e.message}"
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Export Tasks to CSV")
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                scope.launch {
                                    try {
                                        val file = backupRepository.createJsonBackupFile(context)
                                        shareFile(context, file, "application/json", "Backup Data")
                                        isStatusError = false
                                        exportStatusMessage = "Backup created: ${file.name}"
                                    } catch (e: Exception) {
                                        isStatusError = true
                                        exportStatusMessage = "Backup failed: ${e.localizedMessage ?: e.message}"
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Backup Data", fontSize = 12.sp)
                        }

                        OutlinedButton(
                            onClick = {
                                restorePickerLauncher.launch(arrayOf("application/json", "text/*", "*/*"))
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Restore Data", fontSize = 12.sp)
                        }
                    }

                    exportStatusMessage?.let { msg ->
                        Text(
                            text = msg,
                            fontSize = 11.sp,
                            color = if (isStatusError) Color(0xFFEF4444) else colors.primary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }

        // Gemini AI Configuration
        item {
            var geminiKeyInput by remember { mutableStateOf("") }
            var keySavedMsg by remember { mutableStateOf<String?>(null) }

            LaunchedEffect(Unit) {
                geminiKeyInput = repository.getGeminiApiKey() ?: ""
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Gemini 3.8 Flash Configuration",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Configure your Gemini API key to power the Productivity Advisor in Reports.",
                        fontSize = 11.sp,
                        color = colors.textMuted
                    )

                    OutlinedTextField(
                        value = geminiKeyInput,
                        onValueChange = { geminiKeyInput = it },
                        label = { Text("Gemini API Key", fontSize = 12.sp) },
                        placeholder = { Text("AIzaSy...", fontSize = 11.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Button(
                        onClick = {
                            scope.launch {
                                repository.setGeminiApiKey(geminiKeyInput.trim())
                                keySavedMsg = "Gemini API Key saved successfully!"
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Save Gemini API Key")
                    }

                    keySavedMsg?.let { msg ->
                        Text(msg, fontSize = 11.sp, color = Color(0xFF16A34A), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(40.dp))
        }
    }
}
