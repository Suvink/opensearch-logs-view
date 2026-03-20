const FILES_KEY = 'osd_saved_files';
const PREFS_KEY = 'osd_discover_prefs';
const QUOTA_WARNING_BYTES = 4 * 1024 * 1024; // 4MB

export function getStorageUsageBytes(): number {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    total += (localStorage.getItem(key) ?? '').length * 2;
  }
  return total;
}

export function isNearQuota(): boolean {
  return getStorageUsageBytes() > QUOTA_WARNING_BYTES;
}

export function lsGet<T>(key: string): T | null {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export function lsSet<T>(key: string, value: T): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return { ok: false, error: 'Storage quota exceeded. Delete some files to free up space.' };
    }
    return { ok: false, error: 'Failed to save to local storage.' };
  }
}

export function lsRemove(key: string): void {
  localStorage.removeItem(key);
}

export interface SavedPrefs {
  selectedFileId: string | null;
  sidebarCollapsed: boolean;
  columnsByFileId: Record<string, string[]>;
}

export function getPrefs(): SavedPrefs {
  return lsGet<SavedPrefs>(PREFS_KEY) ?? {
    selectedFileId: null,
    sidebarCollapsed: false,
    columnsByFileId: {},
  };
}

export function savePrefs(prefs: SavedPrefs): void {
  lsSet(PREFS_KEY, prefs);
}

export { FILES_KEY };
