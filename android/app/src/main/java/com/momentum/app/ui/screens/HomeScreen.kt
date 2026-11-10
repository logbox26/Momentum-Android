package com.momentum.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.momentum.app.data.local.entity.CategoryEntity
import com.momentum.app.data.local.entity.TaskEntity
import com.momentum.app.data.repository.MomentumRepository
import com.momentum.app.domain.model.HistoryEventType
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus
import com.momentum.app.ui.components.TaskItemCard
import com.momentum.app.ui.components.TasksDidTodayCard
import com.momentum.app.ui.theme.LocalMomentumColors
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    repository: MomentumRepository
) {
    val colors = LocalMomentumColors.current
    val scope = rememberCoroutineScope()

    val tasks by repository.allTasks.collectAsState(initial = emptyList())
    val categories by repository.allCategories.collectAsState(initial = emptyList())
    val history by repository.allHistory.collectAsState(initial = emptyList())

    val dateFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US) }
    val todayStr = remember { dateFormat.format(Date()) }

    var selectedPriorityFilter by remember { mutableStateOf<Priority?>(null) }
    var selectedCategoryFilter by remember { mutableStateOf<String?>(null) }

    var showCreateDialog by remember { mutableStateOf(false) }
    var editingTask by remember { mutableStateOf<TaskEntity?>(null) }
    var taskForHistory by remember { mutableStateOf<TaskEntity?>(null) }

    // Count of unique tasks completed today
    val todayCompletedCount = remember(history, tasks) {
        val todayStart = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(todayStr)?.time ?: 0L
        history
            .filter { it.eventType == HistoryEventType.TASK_COMPLETED && it.timestamp >= todayStart }
            .map { it.taskId }
            .distinct()
            .count { taskId ->
                val task = tasks.firstOrNull { it.id == taskId }
                if (task != null) {
                    task.status == TaskStatus.COMPLETED
                } else {
                    val taskEvents = history.filter { it.taskId == taskId }
                    taskEvents.maxByOrNull { it.timestamp }?.eventType == HistoryEventType.TASK_COMPLETED
                }
            }
    }

    // Filter tasks
    val filteredTasks = tasks.filter { task ->
        (selectedPriorityFilter == null || task.priority == selectedPriorityFilter) &&
        (selectedCategoryFilter == null || task.categoryId == selectedCategoryFilter)
    }

    val todayTasks = filteredTasks.filter { it.dueDate == todayStr && it.status != TaskStatus.COMPLETED }
    val upcomingTasks = filteredTasks.filter { it.dueDate != todayStr && it.status != TaskStatus.COMPLETED }
    val completedTasks = filteredTasks.filter { it.status == TaskStatus.COMPLETED }

    val categoryMap = remember(categories) { categories.associateBy { it.id } }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = colors.primary,
                contentColor = androidx.compose.ui.graphics.Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Task")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(colors.background)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                // Prominent Tasks Did Today Card (shows strictly the number, no list)
                TasksDidTodayCard(completedCount = todayCompletedCount)
            }

            // Filters Row
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Filters",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textMuted
                    )
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item {
                            FilterChip(
                                selected = selectedPriorityFilter == null,
                                onClick = { selectedPriorityFilter = null },
                                label = { Text("All Priorities", fontSize = 11.sp) }
                            )
                        }
                        items(Priority.entries) { p ->
                            FilterChip(
                                selected = selectedPriorityFilter == p,
                                onClick = { selectedPriorityFilter = if (selectedPriorityFilter == p) null else p },
                                label = { Text(p.label, fontSize = 11.sp) }
                            )
                        }
                    }
                }
            }

            // Today's Scheduled Tasks
            item {
                Text(
                    text = "Scheduled For Today (${todayTasks.size})",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
            }
            if (todayTasks.isEmpty()) {
                item {
                    Text(
                        text = "No pending tasks scheduled for today.",
                        fontSize = 12.sp,
                        color = colors.textMuted
                    )
                }
            } else {
                items(todayTasks, key = { it.id }) { task ->
                    TaskItemCard(
                        task = task,
                        category = categoryMap[task.categoryId],
                        onCompleteToggle = { scope.launch { repository.completeTask(task) } },
                        onEdit = { editingTask = task },
                        onPostpone = {
                            val nextDay = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(
                                Date(System.currentTimeMillis() + 86400000L)
                            )
                            scope.launch { repository.postponeTask(task, nextDay) }
                        },
                        onDelete = { scope.launch { repository.deleteTask(task) } },
                        onViewHistory = { taskForHistory = task }
                    )
                }
            }

            // Upcoming & Backlog Tasks
            item {
                Text(
                    text = "Upcoming & Backlog (${upcomingTasks.size})",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
            }
            if (upcomingTasks.isEmpty()) {
                item {
                    Text(
                        text = "No upcoming tasks in backlog.",
                        fontSize = 12.sp,
                        color = colors.textMuted
                    )
                }
            } else {
                items(upcomingTasks, key = { it.id }) { task ->
                    TaskItemCard(
                        task = task,
                        category = categoryMap[task.categoryId],
                        onCompleteToggle = { scope.launch { repository.completeTask(task) } },
                        onEdit = { editingTask = task },
                        onPostpone = {
                            val nextDay = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(
                                Date(System.currentTimeMillis() + 86400000L)
                            )
                            scope.launch { repository.postponeTask(task, nextDay) }
                        },
                        onDelete = { scope.launch { repository.deleteTask(task) } },
                        onViewHistory = { taskForHistory = task }
                    )
                }
            }

            // Completed Tasks Accordion / Section
            if (completedTasks.isNotEmpty()) {
                item {
                    Text(
                        text = "Completed Tasks (${completedTasks.size})",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textMuted
                    )
                }
                items(completedTasks, key = { it.id }) { task ->
                    TaskItemCard(
                        task = task,
                        category = categoryMap[task.categoryId],
                        onCompleteToggle = { scope.launch { repository.reopenTask(task) } },
                        onEdit = { editingTask = task },
                        onPostpone = {},
                        onDelete = { scope.launch { repository.deleteTask(task) } },
                        onViewHistory = { taskForHistory = task }
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }

    // Create / Edit Dialog
    if (showCreateDialog || editingTask != null) {
        val isEditing = editingTask != null
        var title by remember(editingTask, showCreateDialog) { mutableStateOf(editingTask?.title ?: "") }
        var notes by remember(editingTask, showCreateDialog) { mutableStateOf(editingTask?.notes ?: "") }
        var dueDate by remember(editingTask, showCreateDialog) { mutableStateOf(editingTask?.dueDate ?: todayStr) }
        var priority by remember(editingTask, showCreateDialog) { mutableStateOf(editingTask?.priority ?: Priority.PRESENT_1) }
        var categoryId by remember(editingTask, showCreateDialog) { mutableStateOf(editingTask?.categoryId) }

        AlertDialog(
            onDismissRequest = {
                showCreateDialog = false
                editingTask = null
            },
            title = {
                Text(
                    text = if (isEditing) "Edit Task" else "Create New Task",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Task Title", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text("Notes", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = dueDate,
                        onValueChange = { dueDate = it },
                        label = { Text("Due Date (YYYY-MM-DD)", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text("Priority (Strictly 4 Tiers):", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Priority.entries.forEach { p ->
                            FilterChip(
                                selected = priority == p,
                                onClick = { priority = p },
                                label = { Text(p.label, fontSize = 10.sp) }
                            )
                        }
                    }

                    Text("Category:", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        item {
                            FilterChip(
                                selected = categoryId == null,
                                onClick = { categoryId = null },
                                label = { Text("No Category", fontSize = 10.sp) }
                            )
                        }
                        items(categories) { cat ->
                            FilterChip(
                                selected = categoryId == cat.id,
                                onClick = { categoryId = cat.id },
                                label = { Text(cat.name, fontSize = 10.sp) }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (title.isNotBlank()) {
                            scope.launch {
                                if (isEditing && editingTask != null) {
                                    repository.updateTask(
                                        editingTask!!,
                                        title,
                                        notes,
                                        dueDate,
                                        priority,
                                        categoryId
                                    )
                                } else {
                                    repository.createTask(
                                        title,
                                        notes,
                                        dueDate,
                                        priority,
                                        categoryId
                                    )
                                }
                                showCreateDialog = false
                                editingTask = null
                            }
                        }
                    }
                ) {
                    Text(if (isEditing) "Save" else "Create")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showCreateDialog = false
                    editingTask = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Task History Dialog
    taskForHistory?.let { task ->
        val taskHistory = history.filter { it.taskId == task.id }
        AlertDialog(
            onDismissRequest = { taskForHistory = null },
            title = {
                Text(
                    text = "History: ${task.title}",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(taskHistory) { evt ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = colors.surfaceElevated),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(
                                    text = evt.eventType.replace("_", " "),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.primary
                                )
                                Text(
                                    text = evt.details,
                                    fontSize = 11.sp,
                                    color = colors.textPrimary
                                )
                                Text(
                                    text = Date(evt.timestamp).toString(),
                                    fontSize = 10.sp,
                                    color = colors.textMuted
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { taskForHistory = null }) {
                    Text("Close")
                }
            }
        )
    }
}
