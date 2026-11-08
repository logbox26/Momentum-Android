package com.momentum.app.domain.model

/**
 * Momentum Priority System
 * Contains EXACTLY four options:
 * 1. Present 1
 * 2. Present 5
 * 3. Later 1
 * 4. Later 5
 * No other priority levels are permitted.
 */
enum class Priority(val label: String) {
    PRESENT_1("Present 1"),
    PRESENT_5("Present 5"),
    LATER_1("Later 1"),
    LATER_5("Later 5");

    companion object {
        fun fromLabel(label: String): Priority {
            return entries.find { it.label == label } ?: PRESENT_1
        }
    }
}

enum class TaskStatus {
    PENDING,
    COMPLETED,
    POSTPONED
}
