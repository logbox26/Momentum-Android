import { TaskEntity, CategoryEntity, BackupPayload } from '../types';
import { MomentumRepository } from '../db/storage';

/**
 * Escapes a cell value for standard CSV format.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates CSV content from tasks
 */
export function generateTasksCsv(tasks: TaskEntity[], categories: CategoryEntity[]): string {
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  const headers = [
    'Task ID',
    'Task Title',
    'Status',
    'Priority',
    'Category',
    'Created Date',
    'Due Date',
    'Completed Date',
    'Postponed Count',
    'Postponed Until',
    'Notes',
  ];

  const rows = tasks.map((t) => {
    const categoryName = t.categoryId ? categoryMap.get(t.categoryId) || 'Uncategorized' : 'None';
    const createdStr = new Date(t.createdDate).toISOString();
    const completedStr = t.completedAt ? new Date(t.completedAt).toISOString() : '';
    const postponedUntilStr = t.postponedUntil || '';

    return [
      escapeCsvValue(t.id),
      escapeCsvValue(t.title),
      escapeCsvValue(t.status),
      escapeCsvValue(t.priority),
      escapeCsvValue(categoryName),
      escapeCsvValue(createdStr),
      escapeCsvValue(t.dueDate),
      escapeCsvValue(completedStr),
      escapeCsvValue(t.postponedCount),
      escapeCsvValue(postponedUntilStr),
      escapeCsvValue(t.notes),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers a file download in the browser
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates a JSON backup payload before restoration
 */
export function validateBackupPayload(parsed: unknown): {
  valid: boolean;
  error?: string;
  payload?: BackupPayload;
} {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'File content is not a valid JSON object.' };
  }

  const p = parsed as Partial<BackupPayload>;

  if (!Array.isArray(p.tasks)) {
    return { valid: false, error: 'Backup is missing the "tasks" array.' };
  }

  if (!Array.isArray(p.taskHistory)) {
    return { valid: false, error: 'Backup is missing the "taskHistory" array.' };
  }

  // Verify structure of tasks
  for (const t of p.tasks) {
    if (!t.id || !t.title || !t.priority) {
      return {
        valid: false,
        error: `Corrupted task item found in backup: ${JSON.stringify(t)}`,
      };
    }
  }

  return {
    valid: true,
    payload: p as BackupPayload,
  };
}

/**
 * Exports JSON backup and triggers download
 */
export function exportAndDownloadJsonBackup(): void {
  const repo = MomentumRepository.getInstance();
  const backup = repo.exportFullBackup();
  const jsonStr = JSON.stringify(backup, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(jsonStr, `momentum-backup-${timestamp}.json`, 'application/json');
}

/**
 * Exports CSV of all tasks and triggers download
 */
export function exportAndDownloadTasksCsv(): void {
  const repo = MomentumRepository.getInstance();
  const tasks = repo.getTasks();
  const categories = repo.getCategories();
  const csvStr = generateTasksCsv(tasks, categories);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(csvStr, `momentum-tasks-${timestamp}.csv`, 'text/csv;charset=utf-8;');
}
