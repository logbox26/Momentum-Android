# Momentum

Momentum is an offline-first productivity application built for fast, lightweight everyday task execution, uncompromising historical accuracy, and flexible workflow governance, featuring Gemini 3.8 Flash productivity intelligence in the reports section.

---

## 1. App Purpose
Momentum is designed for professionals and individuals who need reliable task tracking with zero cloud latency or mandatory network dependencies. It records an immutable lifecycle event stream (creation, completion, reopen, postponement, edits) to accurately reconstruct what occurred in any given calendar month, and integrates an intelligent Gemini 3.8 Flash advisor for deep workload analysis.

---

## 2. Main Features
- **Strict 4-Tier Priority System**:
  - `Present 1` (Top Focus · High Impact)
  - `Present 5` (Current Sprint · Standard)
  - `Later 1` (Deferred · Strategic Value)
  - `Later 5` (Backlog · Someday)
- **Prominent "Tasks Did Today" Dashboard**: Elevated card treatment with large, readable typography and quick-reopen action.
- **Refined Reports with 4 Prominent KPI Tiles**:
  - **Daily Completion Rate**: Today's completion ratio and count.
  - **Weekly Completion Rate**: 7-day rolling completion volume and velocity.
  - **Monthly Completion Rate**: Reconstructed monthly ratio accounting for month-end state.
  - **Unfinished Tasks**: Active pending workload broken down directly into **Present 1**, **Present 5**, **Later 1**, and **Later 5**.
- **Gemini 3.8 Flash Productivity Advisor**:
  - Embedded conversational AI assistant powered by `gemini-3.8-flash`.
  - Analyzes live completion trends, priority bottlenecks, and postponement patterns with actionable recommendations.
  - Accessible via secure server-side proxy endpoint (`/api/gemini/reports-chat`).
- **Independent Category Governance**: Create, rename, and safely delete categories. Deleting a category never deletes its tasks.
- **Project Export for GitHub Actions & Android Studio**:
  - Dedicated **Download App Project (ZIP)** button in Settings.
  - Generates a complete native Android project bundle containing `.github/workflows/android.yml` for automated CI/CD builds on GitHub.
- **CSV & JSON Backup/Restore**:
  - Full CSV export of tasks, priorities, categories, and postponement history.
  - Complete JSON backup and restore with structure and relationship validation.
- **5 Selectable Persistent Themes**:
  - Calm Blue (Soft blue, light neutral, dark blue accents)
  - Sage Green (Muted sage, cream, dark green accents)
  - Warm Focus (Cream, beige, orange, charcoal)
  - Modern Slate (Light grey, slate, blue, dark slate)
  - Deep Focus (Dark charcoal, muted blue/green, high contrast)
- **Minimum 10sp Font Sizing**: Adheres strictly to Android accessibility standards with minimum user-facing text size of 10sp.

---

## 3. Architecture
- **Presentation Layer**:
  - Native Kotlin + Jetpack Compose UI (Material 3).
  - Responsive web runtime (Vite + React 19 + Tailwind CSS) with Pixel-style device frame simulator and expanded responsive canvas.
- **Backend & AI Proxy Layer (`server.ts`)**:
  - Express server handling secure `@google/genai` calls with `gemini-3.8-flash`.
  - Telemetry headers configured (`User-Agent: aistudio-build`).
- **Domain Layer**:
  - `HistoricalReportGenerator`: Reconstructs historical month status by replaying timestamped event streams up to the end of that month.
  - `calculateFourTiles`: Computes real-time daily, weekly, monthly, and unfinished priority breakdowns.
  - `zipExport`: Packages native Android code and GitHub Actions CI/CD configuration into downloadable `.zip` bundles using JSZip.
- **Data Layer (Room Database)**:
  - `TaskEntity`, `TaskHistoryEntity`, `CategoryEntity`, `SettingEntity`, `ReportCacheEntity`.

---

## 4. Build & Export Instructions

### GitHub Actions CI/CD
1. In Momentum **Settings**, click **Download Project ZIP (.zip)**.
2. Unzip the archive into a repository folder.
3. Commit and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Momentum with GitHub Actions"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
4. The workflow in `.github/workflows/android.yml` automatically triggers on push to build, assemble, and artifact the debug APK.

### Full-Stack Web App Execution
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start server (Express + Vite proxy):
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
