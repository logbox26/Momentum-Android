package com.momentum.app.domain.model

/**
 * Momentum Priority System
 * Contains EXACTLY six options:
 * 1. Present 1 = high importance, active now
 * 2. Present 2 = medium importance, active now
 * 3. Present 15 = low importance, active now
 * 4. Future 1 = high importance, intentionally not now
 * 5. Future 2 = medium importance, intentionally not now
 * 6. Trashable = low enough importance to let go
 */
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
            // Direct matches
            entries.find { it.label.equals(trimmed, ignoreCase = true) || it.name.equals(trimmed, ignoreCase = true) }?.let { return it }
            // Backwards compatibility mappings:
            // Present 1 -> Present 1
            // Present 5 -> Present 2
            // Later 1 -> Future 1
            // Later 5 -> Future 2
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
