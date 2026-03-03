// Chrome Storage Service — 混合儲存方案
import type { Note, AppSettings, SyncStorageUsage } from '../types/note';
import { DEFAULT_SETTINGS } from '../types/note';

const SYNC_STORAGE_LIMIT = 80 * 1024; // 80KB
const MAX_SYNC_NOTES = 50;

export class StorageService {
    // 取得所有筆記（從 local storage）
    async getAllNotes(): Promise<Note[]> {
        try {
            const result = await chrome.storage.local.get('notes') as { notes?: Note[] };
            return result.notes || [];
        } catch (error) {
            console.error('Failed to get notes:', error);
            throw error;
        }
    }

    // 儲存筆記（同時寫入 local + sync）
    async saveNote(note: Note): Promise<void> {
        const notes = await this.getAllNotes();
        const existingIndex = notes.findIndex((n) => n.id === note.id);

        if (existingIndex >= 0) {
            notes[existingIndex] = note;
        } else {
            notes.unshift(note);
        }

        await chrome.storage.local.set({ notes });
        await this.syncToSyncStorage(notes);
    }

    // 刪除筆記
    async deleteNote(noteId: string): Promise<void> {
        const notes = await this.getAllNotes();
        const filteredNotes = notes.filter((n) => n.id !== noteId);
        await chrome.storage.local.set({ notes: filteredNotes });
        await this.syncToSyncStorage(filteredNotes);
    }

    // 同步到 sync storage（最近 50 筆或 < 80KB）
    private async syncToSyncStorage(notes: Note[]): Promise<void> {
        try {
            const recentNotes = notes.slice(0, MAX_SYNC_NOTES);
            const dataSize = JSON.stringify(recentNotes).length;

            if (dataSize < SYNC_STORAGE_LIMIT) {
                await chrome.storage.sync.set({ recentNotes });
            }
        } catch (error) {
            console.warn('Failed to sync to sync storage:', error);
        }
    }

    // 取得設定
    async getSettings(): Promise<AppSettings> {
        try {
            const result = await chrome.storage.sync.get('settings') as { settings?: AppSettings };
            return result.settings || DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Failed to get settings:', error);
            return DEFAULT_SETTINGS;
        }
    }

    // 儲存設定
    async saveSettings(settings: AppSettings): Promise<void> {
        await chrome.storage.sync.set({ settings });
    }

    // 取得同步儲存空間使用量
    async getSyncStorageUsage(): Promise<SyncStorageUsage> {
        try {
            const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
            const quotaBytes = chrome.storage.sync.QUOTA_BYTES; // 102,400 bytes
            const percentage = quotaBytes > 0
                ? Math.round((bytesInUse / quotaBytes) * 100)
                : 0;

            return { bytesInUse, quotaBytes, percentage };
        } catch (error) {
            console.error('Failed to get sync storage usage:', error);
            return { bytesInUse: 0, quotaBytes: 102400, percentage: 0 };
        }
    }
}

export const storageService = new StorageService();
