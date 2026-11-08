package com.momentum.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.momentum.app.domain.model.ThemeMode
import com.momentum.app.ui.screens.HomeScreen
import com.momentum.app.ui.screens.ReportsScreen
import com.momentum.app.ui.screens.SettingsScreen
import com.momentum.app.ui.theme.LocalMomentumColors
import com.momentum.app.ui.theme.MomentumTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as MomentumApplication
        val repository = app.repository
        val backupRepository = app.backupRestoreRepository

        setContent {
            val scope = rememberCoroutineScope()
            var currentTheme by remember { mutableStateOf(ThemeMode.CALM_BLUE) }
            var currentScreen by remember { mutableStateOf("home") } // "home", "reports", "settings"

            LaunchedEffect(Unit) {
                currentTheme = repository.getSelectedTheme()
            }

            MomentumTheme(themeMode = currentTheme) {
                val colors = LocalMomentumColors.current

                Scaffold(
                    topBar = {
                        @OptIn(ExperimentalMaterial3Api::class)
                        TopAppBar(
                            title = {
                                Text(
                                    text = when (currentScreen) {
                                        "reports" -> "Reports & Analytics"
                                        "settings" -> "Settings"
                                        else -> "Momentum"
                                    },
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary
                                )
                            },
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = colors.background
                            )
                        )
                    },
                    bottomBar = {
                        NavigationBar(
                            containerColor = colors.surface,
                            tonalElevation = 8.dp
                        ) {
                            NavigationBarItem(
                                selected = currentScreen == "home",
                                onClick = { currentScreen = "home" },
                                icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                                label = { Text("Home", fontSize = 11.sp) }
                            )
                            NavigationBarItem(
                                selected = currentScreen == "reports",
                                onClick = { currentScreen = "reports" },
                                icon = { Icon(Icons.Default.BarChart, contentDescription = "Reports") },
                                label = { Text("Reports", fontSize = 11.sp) }
                            )
                            NavigationBarItem(
                                selected = currentScreen == "settings",
                                onClick = { currentScreen = "settings" },
                                icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                                label = { Text("Settings", fontSize = 11.sp) }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        when (currentScreen) {
                            "home" -> HomeScreen(repository = repository)
                            "reports" -> ReportsScreen(
                                repository = repository,
                                geminiApiClient = app.geminiApiClient
                            )
                            "settings" -> SettingsScreen(
                                repository = repository,
                                backupRepository = backupRepository,
                                currentTheme = currentTheme,
                                onThemeSelected = { newTheme ->
                                    currentTheme = newTheme
                                    scope.launch { repository.setSelectedTheme(newTheme) }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
