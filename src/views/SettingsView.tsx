import React, { useState, useRef } from 'react';
import {
  Palette,
  Tag,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FolderArchive,
  GitBranch,
} from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';
import { ThemeId } from '../types';
import { CategoryManagerModal } from '../components/CategoryManagerModal';
import {
  exportAndDownloadTasksCsv,
  exportAndDownloadJsonBackup,
  validateBackupPayload,
} from '../domain/exportImport';
import { generateAndDownloadAppZip } from '../domain/zipExport';

export const SettingsView: React.FC = () => {
  const {
    currentTheme,
    setTheme,
    categories,
    tasks,
    history,
    restoreBackup,
  } = useMomentum();

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pasteJsonOpen, setPasteJsonOpen] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [isZipping, setIsZipping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      setStatusMessage({
        type: 'success',
        text: 'Generating Android app project ZIP with GitHub Actions CI/CD...',
      });
      await generateAndDownloadAppZip();
      setStatusMessage({
        type: 'success',
        text: 'Download started! Extract the ZIP and push to your GitHub repo to trigger GitHub Actions.',
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: `Failed to create ZIP package: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsZipping(false);
    }
  };

  // Exactly the 5 required themes
  const themeOptions: Array<{
    id: ThemeId;
    name: string;
    description: string;
    primaryColor: string;
    surfaceColor: string;
    bgPreview: string;
  }> = [
    {
      id: 'calm-blue',
      name: 'Calm Blue',
      description: 'Soft blue, light neutral, dark blue accents',
      primaryColor: '#1d4ed8',
      surfaceColor: '#ffffff',
      bgPreview: '#f0f6fc',
    },
    {
      id: 'sage-green',
      name: 'Sage Green',
      description: 'Muted sage, cream, dark green accents',
      primaryColor: '#166534',
      surfaceColor: '#fdfbf7',
      bgPreview: '#f4f7f4',
    },
    {
      id: 'warm-focus',
      name: 'Warm Focus',
      description: 'Cream, beige, orange, charcoal',
      primaryColor: '#ea580c',
      surfaceColor: '#fffdfa',
      bgPreview: '#fbf7f0',
    },
    {
      id: 'modern-slate',
      name: 'Modern Slate',
      description: 'Light grey, slate, blue, dark slate',
      primaryColor: '#2563eb',
      surfaceColor: '#ffffff',
      bgPreview: '#f1f5f9',
    },
    {
      id: 'deep-focus',
      name: 'Deep Focus',
      description: 'Dark charcoal, muted blue/green, high contrast',
      primaryColor: '#0d9488',
      surfaceColor: '#181c22',
      bgPreview: '#0e1115',
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validation = validateBackupPayload(parsed);

        if (!validation.valid || !validation.payload) {
          setStatusMessage({
            type: 'error',
            text: validation.error || 'Invalid backup structure.',
          });
          return;
        }

        const res = restoreBackup(validation.payload);
        setStatusMessage({
          type: 'success',
          text: `Backup successfully restored! Recovered ${res.tasksRestored} tasks, ${res.historyRestored} history logs, and ${res.categoriesRestored} categories.`,
        });
      } catch (err: unknown) {
        setStatusMessage({
          type: 'error',
          text: `Failed to parse backup JSON file: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteRestore = () => {
    if (!pastedJson.trim()) return;
    try {
      const parsed = JSON.parse(pastedJson);
      const validation = validateBackupPayload(parsed);

      if (!validation.valid || !validation.payload) {
        setStatusMessage({
          type: 'error',
          text: validation.error || 'Invalid JSON backup format.',
        });
        return;
      }

      const res = restoreBackup(validation.payload);
      setStatusMessage({
        type: 'success',
        text: `Restored ${res.tasksRestored} tasks and ${res.historyRestored} historical events.`,
      });
      setPasteJsonOpen(false);
      setPastedJson('');
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: `JSON Parse Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          Application Settings
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Themes, category governance, and offline backup/export tools.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. Theme Selection: Exactly 5 Themes */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3.5">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-[var(--accent-primary)]" />
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Appearance & Themes
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Select one of the 5 curated color palettes. Persists automatically.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {themeOptions.map((t) => {
            const isSelected = currentTheme === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all min-h-[56px] ${
                  isSelected
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-highlight)] ring-1 ring-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)]'
                }`}
              >
                {/* Swatch */}
                <div
                  className="w-7 h-7 rounded-lg border border-black/10 dark:border-white/10 shrink-0 flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: t.primaryColor }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight">
                    {t.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Category Management */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Tag className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Category Management
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {categories.length} active categories · Safe deletion preserves all tasks
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-highlight)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors min-h-[40px] shrink-0"
        >
          Manage Categories
        </button>
      </section>

      {/* 3. CSV Export */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                CSV Data Export
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Export all tasks with dates, status, priority, category, completion, and postponement history.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              try {
                exportAndDownloadTasksCsv();
                setStatusMessage({
                  type: 'success',
                  text: 'CSV file generated and download started.',
                });
              } catch (e) {
                setStatusMessage({
                  type: 'error',
                  text: 'Failed to generate CSV export.',
                });
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-highlight)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors min-h-[40px] shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {/* 4. JSON Backup and Restore */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center gap-2.5">
          <FileCode className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Complete JSON Backup & Restore
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Comprehensive snapshot of tasks, historical event logs, categories, and settings.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Download Backup */}
          <button
            onClick={() => {
              try {
                exportAndDownloadJsonBackup();
                setStatusMessage({
                  type: 'success',
                  text: 'Full JSON backup downloaded successfully.',
                });
              } catch {
                setStatusMessage({
                  type: 'error',
                  text: 'Failed to create JSON backup.',
                });
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Backup (.json)</span>
          </button>

          {/* Upload Restore */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-highlight)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors min-h-[40px]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore File</span>
          </button>

          {/* Paste JSON Option */}
          <button
            onClick={() => setPasteJsonOpen(!pasteJsonOpen)}
            className="px-3.5 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg min-h-[40px]"
          >
            {pasteJsonOpen ? 'Cancel Paste' : 'Or Paste JSON'}
          </button>
        </div>

        {/* Paste JSON Modal Area */}
        {pasteJsonOpen && (
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-2 mt-2">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Paste Momentum JSON Backup Content:
            </label>
            <textarea
              rows={4}
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='{"version": 1, "appName": "Momentum", "tasks": [...], ...}'
              className="w-full p-2.5 font-mono text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPasteJsonOpen(false)}
                className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Dismiss
              </button>
              <button
                onClick={handlePasteRestore}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-white"
              >
                Apply Restore
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 5. Download App as ZIP for GitHub Actions & Android Studio */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FolderArchive className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Download App Project (ZIP)
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Download the complete native Android project bundle ready for GitHub Actions CI/CD and Android Studio.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
          <GitBranch className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              GitHub Actions Workflow Included (.github/workflows/android.yml)
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Extract the ZIP and push to GitHub. The included workflow automatically tests your code and assembles your Android APK.
            </p>
          </div>
        </div>

        <div className="pt-1">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-all min-h-[44px] shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isZipping ? 'Packaging Project ZIP...' : 'Download Project ZIP (.zip)'}</span>
          </button>
        </div>
      </section>

      {/* 6. Database Architecture & Health */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Local Storage & Architecture
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-elevated)]">
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
              {tasks.length}
            </span>
            <p className="text-[10px] text-[var(--text-muted)]">Tasks</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-elevated)]">
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
              {history.length}
            </span>
            <p className="text-[10px] text-[var(--text-muted)]">History Logs</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--bg-surface-elevated)]">
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
              {categories.length}
            </span>
            <p className="text-[10px] text-[var(--text-muted)]">Categories</p>
          </div>
        </div>
      </section>

      {/* Category Management Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
};
