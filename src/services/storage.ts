// Chrome Storage Service — 混合儲存方案
import type { Note, AppSettings, SyncStorageUsage } from '../types/note';
import { DEFAULT_SETTINGS } from '../types/note';

// 防呆上限：僅作為安全值，實際容量由 byte 規則主導
const MAX_SYNC_NOTES = 512;

// 容量與阻擋策略常數
export const SYNC_BLOCK_LIMIT_BYTES = 96 * 1024; // 96KB
export const NOTE_MAX_BYTES = 7800; // 單筆大小上限 7800B

// Chrome sync storage 單一 item 上限為 8,192 bytes
export const CHUNK_SIZE_LIMIT = 7800;
const CHUNK_KEY_PREFIX = 'notes_chunk_';

// 統一錯誤訊息
export const NOTE_SIZE_EXCEEDED = '此筆記大小超過 7,800B，無法儲存。請刪減內容後再試。';
export const SYNC_CAPACITY_FULL_BLOCKED = 'Sync 空間已達 96KB 上限，且尚未開啟「僅儲存本機」，本次變更未儲存。';
export const SYNC_CAPACITY_FULL_LOCAL_ONLY = 'Sync 空間已滿，本次已改為僅儲存本機。';

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

    // 儲存筆記 — 編輯者承擔策略（Caller-Pays Eviction）
    // 只評估目標筆記 N 能否寫入 sync，不重排整包 synced 集合。
    async saveNote(note: Note): Promise<void> {
        // 1. 單筆限制檢查
        const noteJson = JSON.stringify(note);
        const noteSize = this.getByteLength(noteJson);
        if (noteSize > NOTE_MAX_BYTES) {
            throw new Error(NOTE_SIZE_EXCEEDED);
        }

        const currentNotes = await this.getAllNotes();
        const notes = [...currentNotes];
        const existingIndex = notes.findIndex((n) => n.id === note.id);

        if (existingIndex >= 0) {
            notes[existingIndex] = note;
        } else {
            notes.unshift(note);
        }

        const settings = await this.getSettings();
        const bytesInUse = await chrome.storage.sync.getBytesInUse(null);

        // 2. Sync 96KB 滿載阻擋
        if (bytesInUse >= SYNC_BLOCK_LIMIT_BYTES) {
            if (settings.allowLocalSaveWhenSyncFull) {
                await chrome.storage.local.set({ notes });
                await this.refreshUnsyncedNoteIds(notes);
                throw new Error(SYNC_CAPACITY_FULL_LOCAL_ONLY);
            } else {
                throw new Error(SYNC_CAPACITY_FULL_BLOCKED);
            }
        }

        // 3. 寫入 local
        await chrome.storage.local.set({ notes });

        // 4. 只嘗試同步目標筆記 N（不重排其他已同步筆記）
        const synced = await this.trySyncSingleNote(note, notes);

        if (!synced) {
            if (settings.allowLocalSaveWhenSyncFull) {
                throw new Error(SYNC_CAPACITY_FULL_LOCAL_ONLY);
            } else {
                // 回滾 local 異動
                await chrome.storage.local.set({ notes: currentNotes });
                throw new Error(SYNC_CAPACITY_FULL_BLOCKED);
            }
        }
    }

    // 刪除筆記 — 刪除後觸發遞補程序
    async deleteNote(noteId: string): Promise<void> {
        const notes = await this.getAllNotes();
        const filteredNotes = notes.filter((n) => n.id !== noteId);
        await chrome.storage.local.set({ notes: filteredNotes });

        // 從 sync 中移除該筆
        const syncedNotes = await this.getSyncedNotesFromSyncStorage();
        const syncedWithout = syncedNotes.filter((n) => n.id !== noteId);
        await this.writeChunksToSync(syncedWithout);

        // 遞補：從 unsynced 候選中補回可放入的筆記
        await this.refillSync(filteredNotes);
    }

    // 取得字串的 UTF-8 byte 大小
    private getByteLength(str: string): number {
        return new TextEncoder().encode(str).length;
    }

    // 從 sync storage 讀取目前同步中的筆記資料（可能是舊版本）
    private async getSyncedNotesFromSyncStorage(): Promise<Note[]> {
        try {
            const syncData = await chrome.storage.sync.get(null) as Record<string, string>;
            const chunkCount = parseInt(syncData['notes_chunk_count'] || '0', 10);
            const syncedNotes: Note[] = [];

            for (let i = 0; i < chunkCount; i++) {
                const chunkStr = syncData[`${CHUNK_KEY_PREFIX}${i}`] as string;
                if (chunkStr) {
                    const chunkNotes: Note[] = JSON.parse(chunkStr);
                    syncedNotes.push(...chunkNotes);
                }
            }

            return syncedNotes;
        } catch {
            return [];
        }
    }

    // 依照 id + updatedAt 判斷未同步（sync 沒有該筆，或 sync 版本較舊）
    private calculateUnsyncedNoteIds(localNotes: Note[], syncedNotes: Note[]): string[] {
        const latestSyncedUpdatedAtById = new Map<string, number>();

        for (const syncedNote of syncedNotes) {
            const prevUpdatedAt = latestSyncedUpdatedAtById.get(syncedNote.id) ?? 0;
            if (syncedNote.updatedAt > prevUpdatedAt) {
                latestSyncedUpdatedAtById.set(syncedNote.id, syncedNote.updatedAt);
            }
        }

        return localNotes
            .filter((localNote) => {
                const syncedUpdatedAt = latestSyncedUpdatedAtById.get(localNote.id);
                return syncedUpdatedAt === undefined || syncedUpdatedAt < localNote.updatedAt;
            })
            .map((localNote) => localNote.id);
    }

    // 依目前 sync 內容重新計算本機的未同步清單
    private async refreshUnsyncedNoteIds(localNotes: Note[]): Promise<void> {
        const syncedNotes = await this.getSyncedNotesFromSyncStorage();
        const unsyncedIds = this.calculateUnsyncedNoteIds(localNotes, syncedNotes);
        await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
    }

    // 嘗試將單筆筆記同步到 sync storage（不重排其他已同步筆記）
    // 回傳 true 表示成功同步，false 表示無法放入
    private async trySyncSingleNote(note: Note, allLocalNotes: Note[]): Promise<boolean> {
        try {
            const syncedNotes = await this.getSyncedNotesFromSyncStorage();
            const existsInSync = syncedNotes.some((n) => n.id === note.id);

            // 建構新的 sync 清單：替換或新增目標筆記
            let newSyncList: Note[];
            if (existsInSync) {
                newSyncList = syncedNotes.map((n) => (n.id === note.id ? note : n));
            } else {
                if (syncedNotes.length >= MAX_SYNC_NOTES) {
                    // 防呆：已達安全上限，不再新增
                    const unsyncedIds = this.calculateUnsyncedNoteIds(allLocalNotes, syncedNotes);
                    await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
                    return false;
                }
                newSyncList = [...syncedNotes, note];
            }

            // 估算寫入後的總大小
            const totalSize = this.getByteLength(JSON.stringify(newSyncList));
            const bufferSize = newSyncList.length * 50 + 200;

            if (totalSize + bufferSize > SYNC_BLOCK_LIMIT_BYTES) {
                // N 寫入後會超限
                if (existsInSync) {
                    // N 本身更新後無法再放入 sync → 從 sync 移除 N
                    const withoutNote = syncedNotes.filter((n) => n.id !== note.id);
                    await this.writeChunksToSync(withoutNote);
                    console.log(`筆記 "${note.title}" 更新後超出 sync 容量限制，移出 sync`);
                }
                const finalSynced = existsInSync
                    ? syncedNotes.filter((n) => n.id !== note.id)
                    : syncedNotes;
                const unsyncedIds = this.calculateUnsyncedNoteIds(allLocalNotes, finalSynced);
                await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
                return false;
            }

            // N 可以寫入 sync
            await this.writeChunksToSync(newSyncList);
            const unsyncedIds = this.calculateUnsyncedNoteIds(allLocalNotes, newSyncList);
            await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
            return true;
        } catch (error) {
            console.warn('Failed to sync single note:', error);
            const syncedNotes = await this.getSyncedNotesFromSyncStorage();
            const unsyncedIds = this.calculateUnsyncedNoteIds(allLocalNotes, syncedNotes);
            await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
            return false;
        }
    }

    // 遞補同步：從 unsynced 候選中補回可放入 sync 的筆記
    // 觸發時機：刪除筆記後、擴充功能啟動時、手動重試同步
    async refillSync(allLocalNotes: Note[]): Promise<void> {
        try {
            const syncedNotes = await this.getSyncedNotesFromSyncStorage();
            const syncedIds = new Set(syncedNotes.map((n) => n.id));

            // 候選：不在 sync 中且單筆 ≤ 7800B
            const candidates = allLocalNotes
                .filter((n) => !syncedIds.has(n.id))
                .filter((n) => this.getByteLength(JSON.stringify(n)) <= NOTE_MAX_BYTES);

            // 排序：createdAt 由舊到新；若相同則以 id 字典序排序
            candidates.sort((a, b) => {
                if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
                return a.id.localeCompare(b.id);
            });

            const syncList = [...syncedNotes];
            for (const note of candidates) {
                if (syncList.length >= MAX_SYNC_NOTES) break;

                const tempList = [...syncList, note];
                const totalSize = this.getByteLength(JSON.stringify(tempList));
                const bufferSize = tempList.length * 50 + 200;

                if (totalSize + bufferSize <= SYNC_BLOCK_LIMIT_BYTES) {
                    syncList.push(note);
                } else {
                    // 此筆放不下，繼續嘗試更小的候選
                    continue;
                }
            }

            // 只有在有新增筆記時才重寫 sync
            if (syncList.length > syncedNotes.length) {
                await this.writeChunksToSync(syncList);
            }

            const unsyncedIds = this.calculateUnsyncedNoteIds(allLocalNotes, syncList);
            await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
        } catch (error) {
            console.warn('Failed to refill sync storage:', error);
            const syncedNotes = await this.getSyncedNotesFromSyncStorage();
            const unsyncedIds = this.calculateUnsyncedNoteIds(allLocalNotes, syncedNotes);
            await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
        }
    }

    // 將 sync 清單寫入 chunk storage 並清除多餘的舊 chunk
    private async writeChunksToSync(syncList: Note[]): Promise<void> {
        const chunks: string[] = [];
        let currentChunk: Note[] = [];
        let currentChunkByteSize = 2; // "[]" 的 byte 長度

        for (const note of syncList) {
            const noteJson = JSON.stringify(note);
            const noteByteSize = this.getByteLength(noteJson);
            const additionalByteSize = noteByteSize + (currentChunk.length > 0 ? 1 : 0);

            if (currentChunkByteSize + additionalByteSize > CHUNK_SIZE_LIMIT && currentChunk.length > 0) {
                chunks.push(JSON.stringify(currentChunk));
                currentChunk = [note];
                currentChunkByteSize = 2 + noteByteSize;
            } else {
                currentChunk.push(note);
                currentChunkByteSize += additionalByteSize;
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(JSON.stringify(currentChunk));
        }

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
        if ('recentNotes' in allSyncData) {
            keysToRemove.push('recentNotes');
        }
        if (keysToRemove.length > 0) {
            await chrome.storage.sync.remove(keysToRemove);
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
            const quotaBytes = SYNC_BLOCK_LIMIT_BYTES; // 改為使用自定義的 96KB（98304 bytes），而不直接使用 native 102400
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

