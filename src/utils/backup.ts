import { db, updateAppSettings } from '../db/db';
import { Entry, AppSettings } from '../types';

export interface BackupData {
  version: number;
  exportedAt: string;
  settings: AppSettings | null;
  entries: Entry[];
}

export async function exportBackup(): Promise<void> {
  const entries = await db.entries.toArray();
  const settingsList = await db.settings.toArray();
  const settings = settingsList[0] || null;

  const backupData: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    entries,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const nowStr = new Date().toISOString().slice(0, 10);
  const fileName = `my-mobile-shop-backup-${nowStr}.json`;

  const blob = new Blob([jsonStr], { type: 'application/json' });

  // If navigator.share supports files, attempt it
  const file = new File([blob], fileName, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'My Mobile Shop Backup',
        files: [file],
      });
      await updateAppSettings({ lastBackupAt: new Date().toISOString() });
      return;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
    }
  }

  // Fallback / standard browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  await updateAppSettings({ lastBackupAt: new Date().toISOString() });
}

export async function importBackup(file: File): Promise<{ count: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<BackupData>;

  if (!data || !Array.isArray(data.entries)) {
    throw new Error('Invalid backup file format');
  }

  // Bulk add entries without duplicating id conflicts
  const entriesToImport = data.entries.map(e => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = e;
    return rest as Entry;
  });

  if (entriesToImport.length > 0) {
    await db.entries.bulkAdd(entriesToImport);
  }

  if (data.settings?.shopName) {
    await updateAppSettings({
      shopName: data.settings.shopName,
      language: data.settings.language || 'ml',
    });
  }

  return { count: entriesToImport.length };
}

export function isBackupNeeded(lastBackupAt: string | null): boolean {
  if (!lastBackupAt) return true;
  const lastTime = new Date(lastBackupAt).getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - lastTime > thirtyDaysMs;
}
