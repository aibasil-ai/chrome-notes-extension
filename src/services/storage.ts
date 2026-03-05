// Chrome Storage Service — 混合儲存方案
import type { Note, AppSettings, SyncStorageUsage } from '../types/note';
import { DEFAULT_SETTINGS } from '../types/note';

const SYNC_STORAGE_LIMIT = 96 * 1024; // 96KB 總限制（Chrome 配額為 102,400 bytes，預留約 6KB 給 settings 和 key 開銷）
const MAX_SYNC_NOTES = 50;
// Chrome sync storage 單一 item 上限為 8,192 bytes，保留一些空間給 key 名稱和 JSON 包裝
export const CHUNK_SIZE_LIMIT = 7800;
const CHUNK_KEY_PREFIX = 'notes_chunk_';

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

    // 取得字串的 UTF-8 byte 大小
    private getByteLength(str: string): number {
        return new TextEncoder().encode(str).length;
    }

    // 同步到 sync storage（分 chunk 儲存，每個 chunk 不超過 8KB）
    private async syncToSyncStorage(notes: Note[]): Promise<void> {
        try {
            const allNoteIds = notes.map((n) => n.id);
            let recentNotes = notes.slice(0, MAX_SYNC_NOTES);
            let totalSize = this.getByteLength(JSON.stringify(recentNotes));

            // 超過總容量限制則逐步減少筆記數量
            if (totalSize >= SYNC_STORAGE_LIMIT) {
                while (recentNotes.length > 0 && this.getByteLength(JSON.stringify(recentNotes)) >= SYNC_STORAGE_LIMIT) {
                    recentNotes = recentNotes.slice(0, -1);
                }
            }

            // 將筆記分 chunk，每個 chunk 不超過 CHUNK_SIZE_LIMIT（以 byte 計算）
            const chunks: string[] = [];
            let currentChunk: Note[] = [];
            let currentChunkByteSize = 2; // 初始為 "[]" 的 byte 長度

            for (const note of recentNotes) {
                const noteJson = JSON.stringify(note);
                const noteByteSize = this.getByteLength(noteJson);

                // 單筆 note 超過 chunk 限制，跳過不同步（太大無法存入 sync storage）
                if (noteByteSize + 2 > CHUNK_SIZE_LIMIT) {
                    console.warn(`筆記 "${note.title}" 超過 sync storage 單項限制 (${noteByteSize} bytes)，略過同步`);
                    continue;
                }

                const additionalByteSize = noteByteSize + (currentChunk.length > 0 ? 1 : 0); // +1 為逗號

                if (currentChunkByteSize + additionalByteSize > CHUNK_SIZE_LIMIT && currentChunk.length > 0) {
                    // 目前 chunk 已滿，儲存並開始新 chunk
                    chunks.push(JSON.stringify(currentChunk));
                    currentChunk = [note];
                    currentChunkByteSize = 2 + noteByteSize;
                } else {
                    currentChunk.push(note);
                    currentChunkByteSize += additionalByteSize;
                }
            }

            // 最後一個 chunk
            if (currentChunk.length > 0) {
                chunks.push(JSON.stringify(currentChunk));
            }

            // 寫入所有 chunks
            const setData: Record<string, string> = {
                notes_chunk_count: String(chunks.length),
            };
            for (let i = 0; i < chunks.length; i++) {
                setData[`${CHUNK_KEY_PREFIX}${i}`] = chunks[i];
            }
            await chrome.storage.sync.set(setData);

            // 清除多餘的舊 chunk keys
            const allSyncData = await chrome.storage.sync.get(null);
            const keysToRemove: string[] = [];
            for (const key of Object.keys(allSyncData)) {
                if (key.startsWith(CHUNK_KEY_PREFIX)) {
                    const index = parseInt(key.replace(CHUNK_KEY_PREFIX, ''), 10);
                    if (!isNaN(index) && index >= chunks.length) {
                        keysToRemove.push(key);
                    }
                }
            }
            // 也移除舊格式的 recentNotes key
            if ('recentNotes' in allSyncData) {
                keysToRemove.push('recentNotes');
            }
            if (keysToRemove.length > 0) {
                await chrome.storage.sync.remove(keysToRemove);
            }
            // 記錄未同步的筆記 ID（因總量裁剪 + 因單筆過大）
            // 重新標記：在 chunk 分割中被 skip 的也要算
            const actualSyncedIds = new Set<string>();
            for (const chunkStr of chunks) {
                const chunkNotes: Note[] = JSON.parse(chunkStr);
                for (const n of chunkNotes) {
                    actualSyncedIds.add(n.id);
                }
            }
            const unsyncedIds = allNoteIds.filter((id) => !actualSyncedIds.has(id));
            await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
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

    // 取得未同步的筆記 ID 清單
    async getUnsyncedNoteIds(): Promise<string[]> {
        try {
            const result = await chrome.storage.local.get('unsyncedNoteIds') as { unsyncedNoteIds?: string[] };
            return result.unsyncedNoteIds || [];
        } catch {
            return [];
        }
    }
}

export const storageService = new StorageService();

