package com.momentum.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.momentum.app.data.local.entity.TaskHistoryEntity
import com.momentum.app.data.repository.MomentumRepository
import com.momentum.app.data.remote.GeminiApiClient
import com.momentum.app.data.remote.GeminiMessage
import com.momentum.app.domain.reports.HistoricalReportGenerator
import com.momentum.app.ui.components.FourTilesSection
import com.momentum.app.ui.theme.LocalMomentumColors
import kotlinx.coroutines.launch
import java.util.Calendar

data class ChatMessage(val role: String, val text: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    repository: MomentumRepository,
    geminiApiClient: GeminiApiClient
) {
    val colors = LocalMomentumColors.current
    val scope = rememberCoroutineScope()

    val tasks by repository.allTasks.collectAsState(initial = emptyList())
    val categories by repository.allCategories.collectAsState(initial = emptyList())
    val history by repository.allHistory.collectAsState(initial = emptyList())

    val reportGen = remember { HistoricalReportGenerator() }

    // Calendar selection for historical reconstruction
    val cal = remember { Calendar.getInstance() }
    var selectedYear by remember { mutableIntStateOf(cal.get(Calendar.YEAR)) }
    var selectedMonth by remember { mutableIntStateOf(cal.get(Calendar.MONTH) + 1) }

    var selectedSubTab by remember { mutableStateOf("QUICK") } // QUICK, DETAILED, COMPARISON, LOG

    // 4 KPI Tiles
    val fourTiles = remember(tasks, history, categories) {
        reportGen.calculateFourTiles(tasks, history, categories)
    }

    // Historical Monthly Reconstructed Result
    val monthReport = remember(selectedYear, selectedMonth, tasks, history, categories) {
        reportGen.reconstructMonthStats(selectedYear, selectedMonth, tasks, history, categories)
    }

    // Gemini Chat State
    var chatMessages by remember {
        mutableStateOf(
            listOf(
                ChatMessage(
                    role = "model",
                    text = "Hello! I am your Momentum Productivity Advisor powered by Gemini 3.8 Flash. Ask me anything about your completion trends, bottlenecks, or priority pacing."
                )
            )
        )
    }
    var inputText by remember { mutableStateOf("") }
    var isGenerating by remember { mutableStateOf(false) }

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
                text = "Performance & Reporting",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary
            )
            Text(
                text = "Audited productivity metrics and historical monthly reconstruction.",
                fontSize = 12.sp,
                color = colors.textSecondary
            )
        }

        // 4 KPI Tiles (Daily, Weekly, Monthly, Unfinished by Priority)
        item {
            FourTilesSection(tiles = fourTiles)
        }

        // Gemini Chat Section
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp)),
                colors = CardDefaults.cardColors(containerColor = colors.surface),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(colors.border)
                )
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Gemini 3.8 Flash Productivity Advisor",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary
                        )
                        IconButton(
                            onClick = {
                                chatMessages = listOf(
                                    ChatMessage(
                                        role = "model",
                                        text = "Conversation reset. How can I help analyze your momentum today?"
                                    )
                                )
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Clear Chat",
                                tint = Color(0xFFEF4444),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 240.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        chatMessages.forEach { msg ->
                            val isUser = msg.role == "user"
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .wrapContentWidth(if (isUser) Alignment.End else Alignment.Start)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isUser) colors.primary else colors.surfaceElevated)
                                    .padding(horizontal = 12.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    text = msg.text,
                                    fontSize = 13.sp,
                                    lineHeight = 18.sp,
                                    color = if (isUser) Color.White else colors.textPrimary
                                )
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = inputText,
                            onValueChange = { inputText = it },
                            placeholder = { Text("Ask Gemini about your reports...", fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        IconButton(
                            enabled = !isGenerating,
                            onClick = {
                                if (inputText.isNotBlank() && !isGenerating) {
                                    val q = inputText.trim()
                                    val userMsg = ChatMessage(role = "user", text = q)
                                    val updatedMessages = chatMessages + userMsg
                                    chatMessages = updatedMessages
                                    inputText = ""
                                    isGenerating = true

                                    scope.launch {
                                        val geminiList = updatedMessages.map {
                                            GeminiMessage(role = it.role, content = it.text)
                                        }
                                        val result = geminiApiClient.generateReportAdvice(
                                            historyMessages = geminiList,
                                            fourTiles = fourTiles,
                                            monthStats = monthReport
                                        )
                                        isGenerating = false
                                        result.fold(
                                            onSuccess = { reply ->
                                                chatMessages = chatMessages + ChatMessage(role = "model", text = reply)
                                            },
                                            onFailure = { err ->
                                                val errMsg = err.message ?: "Gemini API connection error."
                                                chatMessages = chatMessages + ChatMessage(
                                                    role = "model",
                                                    text = "⚠️ Gemini Error: $errMsg\n\nEnsure your GEMINI_API_KEY is configured in Settings. Meanwhile, all local metrics above remain 100% active and accurate."
                                                )
                                            }
                                        )
                                    }
                                }
                            },
                            modifier = Modifier.size(44.dp)
                        ) {
                            if (isGenerating) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = colors.primary
                                )
                            } else {
                                Icon(Icons.Default.Send, contentDescription = "Send", tint = colors.primary)
                            }
                        }
                    }
                }
            }
        }

        // Month Selector
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            if (selectedMonth == 1) {
                                selectedMonth = 12
                                selectedYear--
                            } else {
                                selectedMonth--
                            }
                        }
                    ) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Month")
                    }
                    Text(
                        text = "Historical Month: $selectedYear - ${String.format("%02d", selectedMonth)}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    IconButton(
                        onClick = {
                            if (selectedMonth == 12) {
                                selectedMonth = 1
                                selectedYear++
                            } else {
                                selectedMonth++
                            }
                        }
                    ) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Next Month")
                    }
                }
            }
        }

        // Subtabs: Quick Report, Detailed Report, Comparison Report, Detailed Event Log
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf(
                    "QUICK" to "Quick",
                    "DETAILED" to "Detailed",
                    "COMPARISON" to "Comparison",
                    "LOG" to "Event Log"
                ).forEach { (key, label) ->
                    FilterChip(
                        selected = selectedSubTab == key,
                        onClick = { selectedSubTab = key },
                        label = { Text(label, fontSize = 11.sp) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Report Content
        when (selectedSubTab) {
            "QUICK" -> {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = colors.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Monthly Summary (Reconstructed)", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Text("Tasks Created in Month: ${monthReport.tasksCreated}", fontSize = 12.sp)
                            Text("Tasks Completed in Month: ${monthReport.tasksCompleted}", fontSize = 12.sp)
                            Text("Unfinished at Month End: ${monthReport.unfinishedTasks}", fontSize = 12.sp)
                            Text("Postponed in Month: ${monthReport.postponedTasks}", fontSize = 12.sp)
                            Text(
                                "Reconstructed Completion Rate: ${monthReport.completionRate.toInt()}%",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.primary
                            )
                        }
                    }
                }
            }
            "DETAILED" -> {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = colors.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Priority Breakdown (At Month End)", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Text("Present 1: ${monthReport.priorityBreakdown.present1}", fontSize = 12.sp)
                            Text("Present 2: ${monthReport.priorityBreakdown.present2}", fontSize = 12.sp)
                            Text("Present 15: ${monthReport.priorityBreakdown.present15}", fontSize = 12.sp)
                            Text("Future 1: ${monthReport.priorityBreakdown.future1}", fontSize = 12.sp)
                            Text("Future 2: ${monthReport.priorityBreakdown.future2}", fontSize = 12.sp)

                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Accomplishments", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            if (monthReport.accomplishments.isEmpty()) {
                                Text("No tasks completed in this month.", fontSize = 12.sp, color = colors.textMuted)
                            } else {
                                monthReport.accomplishments.take(10).forEach { item ->
                                    Text("• $item", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
            "COMPARISON" -> {
                item {
                    val prevMonth = if (selectedMonth == 1) 12 else selectedMonth - 1
                    val prevYear = if (selectedMonth == 1) selectedYear - 1 else selectedYear
                    val prevReport = remember(prevYear, prevMonth, tasks, history, categories) {
                        reportGen.reconstructMonthStats(prevYear, prevMonth, tasks, history, categories)
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = colors.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Month-over-Month Comparison", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Text("Selected Month Completion Rate: ${monthReport.completionRate.toInt()}% (${monthReport.tasksCompleted} tasks)", fontSize = 12.sp)
                            Text("Prior Month Completion Rate: ${prevReport.completionRate.toInt()}% (${prevReport.tasksCompleted} tasks)", fontSize = 12.sp)
                            val diff = monthReport.completionRate - prevReport.completionRate
                            Text(
                                text = "Pace Shift: ${if (diff >= 0) "+${diff.toInt()}%" else "${diff.toInt()}%"}",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (diff >= 0) Color(0xFF16A34A) else Color(0xFFDC2626)
                            )
                        }
                    }
                }
            }
            "LOG" -> {
                item {
                    Text("Detailed Event Audit Trail", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                items(history.take(30), key = { it.id }) { evt ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = colors.surface)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(evt.eventType.replace("_", " "), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                Text(java.util.Date(evt.timestamp).toString().substring(0, 19), fontSize = 10.sp, color = colors.textMuted)
                            }
                            Text(evt.taskTitle, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            Text(evt.details, fontSize = 11.sp, color = colors.textSecondary)
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(40.dp))
        }
    }
}
