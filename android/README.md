# Momentum - Native Android Application

Offline-first personal productivity and momentum tracker built with Kotlin, Jetpack Compose, and Room.

## Features
- **Strict 4 Priorities**: Present 1, Present 5, Later 1, Later 5.
- **5 Selectable Themes**: Calm Blue, Sage Green, Warm Focus, Modern Slate, Deep Focus.
- **Offline-First Room Database**: Safe category deletion, full task lifecycle audit trail.
- **Historical Monthly Reconstruction**: Reports reconstruct past state from immutable event logs, not current status.
- **4 Real-Time KPI Tiles**: Daily Completion, Weekly Completion, Monthly Completion, Unfinished Breakdown.
- **Gemini 3.8 Flash Productivity Advisor**: AI-driven analysis of productivity trends and backlog risks.
- **CSV & JSON Export**: Complete portability of tasks, history, and settings.
- **Minimum 10sp Text Size**: Enforced across typography.

## Build with GitHub Actions
This project includes `.github/workflows/android.yml`. Push to GitHub to automatically build the debug APK via CI.

## Build with Android Studio
1. Open Android Studio (Ladybug or newer).
2. Select **Open** and select this directory (`android`).
3. Allow Gradle to sync, then run on an Android Device or Emulator (API 26+).
