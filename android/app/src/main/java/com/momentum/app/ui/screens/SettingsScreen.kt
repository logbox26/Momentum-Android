package com.momentum.app.ui.screens

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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.momentum.app.data.local.entity.CategoryEntity
import com.momentum.app.data.repository.BackupRestoreRepository
import com.momentum.app.data.repository.MomentumRepository
import com.momentum.app.domain.model.ThemeMode
import com.momentum.app.ui.theme.LocalMomentumColors
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    repository: MomentumRepository,
    backupRepository: BackupRestoreRepository,
    currentTheme: ThemeMode,
    onThemeSelected: (ThemeMode) -> Unit
) {
    val colors = LocalMomentumColors.current
    val scope = rememberCoroutineScope()

    val categories by repository.allCategories.collectAsState(initial = emptyList())

    var newCategoryName by remember { mutableStateOf("") }
    var exportStatusMessage by remember { mutableStateOf<String?>(null) }

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

        // Backup & Export (CSV, JSON, ZIP)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Data Export & Project Download",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )

                    Button(
                        onClick = {
                            scope.launch {
                                val csv = backupRepository.exportToCsv()
                                exportStatusMessage = "CSV generated (${csv.lines().size} lines). Ready for download."
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Export Tasks to CSV")
                    }

                    exportStatusMessage?.let { msg ->
                        Text(msg, fontSize = 11.sp, color = colors.primary)
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
