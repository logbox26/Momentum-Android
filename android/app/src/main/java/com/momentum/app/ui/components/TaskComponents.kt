package com.momentum.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import com.momentum.app.data.local.entity.TaskEntity
import com.momentum.app.domain.model.FourTilesResult
import com.momentum.app.domain.model.Priority
import com.momentum.app.domain.model.TaskStatus
import com.momentum.app.ui.theme.LocalMomentumColors

/**
 * Prominent "Tasks Did Today" Card
 * - Visually prominent using slightly larger text than surrounding secondary info
 * - Distinct card and background treatment
 * - Good contrast and clear visual hierarchy
 * - Shows strictly the completed count (no list underneath)
 */
@Composable
fun TasksDidTodayCard(
    completedCount: Int,
    modifier: Modifier = Modifier
) {
    val colors = LocalMomentumColors.current

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(
            containerColor = colors.primary.copy(alpha = 0.12f)
        ),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(colors.primary.copy(alpha = 0.4f))
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalFireDepartment,
                        contentDescription = "Today Momentum",
                        tint = colors.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = "Tasks Did Today",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (completedCount == 0) "No tasks completed yet today. Let's build momentum!"
                           else "$completedCount task${if (completedCount == 1) "" else "s"} finished with verified audit trail",
                    fontSize = 12.sp,
                    color = colors.textSecondary
                )
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(colors.primary)
                    .padding(horizontal = 18.dp, vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "$completedCount",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
            }
        }
    }
}

/**
 * Task Item Card
 */
@Composable
fun TaskItemCard(
    task: TaskEntity,
    category: CategoryEntity?,
    onCompleteToggle: () -> Unit,
    onEdit: () -> Unit,
    onPostpone: () -> Unit,
    onDelete: () -> Unit,
    onViewHistory: () -> Unit
) {
    val colors = LocalMomentumColors.current
    val isCompleted = task.status == TaskStatus.COMPLETED

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onEdit() },
        colors = CardDefaults.cardColors(
            containerColor = colors.surface
        ),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(colors.border)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            Checkbox(
                checked = isCompleted,
                onCheckedChange = { onCompleteToggle() },
                colors = CheckboxDefaults.colors(
                    checkedColor = colors.primary,
                    uncheckedColor = colors.border
                )
            )

            Spacer(modifier = Modifier.width(8.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = task.title,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isCompleted) colors.textMuted else colors.textPrimary
                    )

                    // Priority Badge (Exactly 1 of 4)
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                when (task.priority) {
                                    Priority.PRESENT_1 -> Color(0xFFDC2626).copy(alpha = 0.15f)
                                    Priority.PRESENT_5 -> Color(0xFFF97316).copy(alpha = 0.15f)
                                    Priority.LATER_1 -> Color(0xFF2563EB).copy(alpha = 0.15f)
                                    Priority.LATER_5 -> Color(0xFF64748B).copy(alpha = 0.15f)
                                }
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = task.priority.label,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = when (task.priority) {
                                Priority.PRESENT_1 -> Color(0xFFDC2626)
                                Priority.PRESENT_5 -> Color(0xFFEA580C)
                                Priority.LATER_1 -> Color(0xFF2563EB)
                                Priority.LATER_5 -> Color(0xFF64748B)
                            }
                        )
                    }
                }

                if (task.notes.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = task.notes,
                        fontSize = 12.sp,
                        color = colors.textSecondary,
                        maxLines = 2
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Due: ${task.dueDate}",
                            fontSize = 11.sp,
                            color = colors.textMuted
                        )
                        category?.let { cat ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(colors.surfaceElevated)
                                    .padding(horizontal = 6.dp, vertical = 1.dp)
                            ) {
                                Text(
                                    text = cat.name,
                                    fontSize = 10.sp,
                                    color = colors.textSecondary
                                )
                            }
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        IconButton(onClick = onPostpone, modifier = Modifier.size(28.dp)) {
                            Icon(
                                imageVector = Icons.Default.Schedule,
                                contentDescription = "Postpone",
                                tint = colors.textMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        IconButton(onClick = onViewHistory, modifier = Modifier.size(28.dp)) {
                            Icon(
                                imageVector = Icons.Default.History,
                                contentDescription = "History",
                                tint = colors.textMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Delete",
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

/**
 * 4 Reports KPI Tiles
 */
@Composable
fun FourTilesSection(tiles: FourTilesResult) {
    val colors = LocalMomentumColors.current

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Daily Tile
            KpiTile(
                title = "Daily Completion",
                percentage = tiles.dailyCompletionRate,
                subtitle = "${tiles.dailyCompletedCount} of ${tiles.dailyTotalCount} completed today",
                modifier = Modifier.weight(1f)
            )
            // Weekly Tile
            KpiTile(
                title = "Weekly Completion",
                percentage = tiles.weeklyCompletionRate,
                subtitle = "${tiles.weeklyCompletedCount} of ${tiles.weeklyTotalCount} in 7 days",
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Monthly Tile
            KpiTile(
                title = "Monthly Completion",
                percentage = tiles.monthlyCompletionRate,
                subtitle = "${tiles.monthlyCompletedCount} of ${tiles.monthlyTotalCount} this month",
                modifier = Modifier.weight(1f)
            )

            // Unfinished Tasks Tile with 4 Priorities
            Card(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp)),
                colors = CardDefaults.cardColors(containerColor = colors.surface),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(colors.border)
                )
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "Unfinished Tasks",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textMuted
                    )
                    Text(
                        text = "${tiles.unfinishedCount}",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = colors.textPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "P1: ${tiles.unfinishedByPriority.present1}  |  P5: ${tiles.unfinishedByPriority.present5}",
                        fontSize = 10.sp,
                        color = Color(0xFFDC2626),
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "L1: ${tiles.unfinishedByPriority.later1}  |  L5: ${tiles.unfinishedByPriority.later5}",
                        fontSize = 10.sp,
                        color = Color(0xFF2563EB),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun KpiTile(
    title: String,
    percentage: Float,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    val colors = LocalMomentumColors.current

    Card(
        modifier = modifier.clip(RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(colors.border)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textMuted
            )
            Text(
                text = "${percentage.toInt()}%",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                color = colors.primary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtitle,
                fontSize = 10.sp,
                color = colors.textSecondary
            )
        }
    }
}
