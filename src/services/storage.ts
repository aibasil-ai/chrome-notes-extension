// Chrome Storage Service — 混合儲存方案
import type { Note, AppSettings, SyncStorageUsage } from '../types/note';
import { DEFAULT_SETTINGS } from '../types/note';

const SYNC_STORAGE_LIMIT = 96 * 1024; // 96KB 總限制（Chrome 配額為 102,400 bytes，預留約 6KB 給 settings 和 key 開銷）
const MAX_SYNC_NOTES = 50;
// Chrome sync storage 單一 item 上限為 8,192 bytes，保留一些空間給 key 名稱和 JSON 包裝
export const CHUNK_SIZE_LIMIT = 7800;
const CHUNK_KEY_PREFIX = 'notes_chunk_';
export const SYNC_CAPACITY_BLOCK_MESSAGE = '已到達能同步的容量上限，且本次內容增加後無法同步。若要儲存，請先到設定開啟「同步容量滿載時允許僅儲存本機」；否則這次修改不會被保存。';

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
        const currentNotes = await this.getAllNotes();
        const notes = [...currentNotes];
        const existingIndex = notes.findIndex((n) => n.id === note.id);
        const beforeSyncedSet = await this.getCurrentSyncedNoteIds();
        const beforeUnsyncedSet = new Set(await this.getUnsyncedNoteIds());

        if (existingIndex >= 0) {
            notes[existingIndex] = note;
        } else {
            notes.unshift(note);
        }

        const settings = await this.getSettings();
        // 同步壓力判斷：已經有未同步筆記、local 有不在 sync 的筆記、達筆數上限，或 bytes 已接近上限。
        const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
        const hasLocalNotInSyncById = currentNotes.some((n) => !beforeSyncedSet.has(n.id));
        const hasReachedSyncCountLimit = beforeSyncedSet.size >= MAX_SYNC_NOTES;
        const hasSyncPressure =
            beforeUnsyncedSet.size > 0 ||
            hasLocalNotInSyncById ||
            hasReachedSyncCountLimit ||
            bytesInUse >= SYNC_STORAGE_LIMIT;

        const previousNote = existingIndex >= 0 ? currentNotes[existingIndex] : undefined;
        const previousSize = previousNote ? this.getByteLength(JSON.stringify(previousNote)) : 0;
        const nextSize = this.getByteLength(JSON.stringify(note));
        const isGrowingSyncedNote = existingIndex >= 0 && beforeSyncedSet.has(note.id) && nextSize > previousSize;

        if (settings.allowLocalSaveWhenSyncFull) {
            // 開啟本機儲存時，在同步壓力下將新增或變大的同步筆記改為本機儲存，避免誤顯示為已同步。
            const isAlreadyUnsynced = beforeUnsyncedSet.has(note.id);
            const shouldSaveLocalOnly = hasSyncPressure && (existingIndex < 0 || isGrowingSyncedNote || isAlreadyUnsynced);
            if (shouldSaveLocalOnly) {
                await chrome.storage.local.set({ notes });
                await this.refreshUnsyncedNoteIds(notes);
                return;
            }
        } else {
            // 關閉本機儲存時，新增或讓同步筆記變大，且已達同步壓力，直接阻擋。
            if (existingIndex < 0 && hasSyncPressure) {
                throw new Error(SYNC_CAPACITY_BLOCK_MESSAGE);
            }
            if (isGrowingSyncedNote && hasSyncPressure) {
                throw new Error(SYNC_CAPACITY_BLOCK_MESSAGE);
            }
        }

        await chrome.storage.local.set({ notes });
        await this.syncToSyncStorage(notes);

        // 若未開啟本機儲存容錯，且本次儲存造成同步集合退化，則回滾儲存並提示使用者。
        if (!settings.allowLocalSaveWhenSyncFull) {
            const afterSyncedSet = await this.getCurrentSyncedNoteIds();
            const currentNoteSynced = afterSyncedSet.has(note.id);
            let lostPreviouslySyncedNote = false;

            for (const syncedId of beforeSyncedSet) {
                if (!afterSyncedSet.has(syncedId)) {
                    lostPreviouslySyncedNote = true;
                    break;
                }
            }

            if (!currentNoteSynced || lostPreviouslySyncedNote) {
                await chrome.storage.local.set({ notes: currentNotes });
                await this.syncToSyncStorage(currentNotes);
                throw new Error(SYNC_CAPACITY_BLOCK_MESSAGE);
            }
        }
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

    // 取得目前已同步到 sync storage 的筆記 ID 集合
    private async getCurrentSyncedNoteIds(): Promise<Set<string>> {
        const syncedNotes = await this.getSyncedNotesFromSyncStorage();
        const syncedIds = new Set<string>();
        for (const syncedNote of syncedNotes) {
            syncedIds.add(syncedNote.id);
        }
        return syncedIds;
    }

    // 同步到 sync storage（分 chunk 儲存，每個 chunk 不超過 8KB）
    // 策略：優先保留已同步的舊筆記，剩餘空間才放入新筆記
    private async syncToSyncStorage(notes: Note[]): Promise<void> {
        try {
            // 1. 取得目前已同步的筆記 ID
            const currentSyncedIds = await this.getCurrentSyncedNoteIds();

            // 2. 分離已同步 vs 新筆記（保持原始順序）
            const alreadySynced = notes.filter((n) => currentSyncedIds.has(n.id));
            const newNotes = notes.filter((n) => !currentSyncedIds.has(n.id));

            // 3. 先放已同步的筆記（保留舊資料），再嘗試加入新筆記
            const syncList: Note[] = [];

            // 3a. 加入已同步的筆記（優先保留）
            for (const note of alreadySynced) {
                if (syncList.length >= MAX_SYNC_NOTES) break;
                const noteByteSize = this.getByteLength(JSON.stringify(note));
                // 單筆超過 chunk 限制的跳過
                if (noteByteSize + 2 > CHUNK_SIZE_LIMIT) {
                    console.warn(`筆記 "${note.title}" 超過 sync storage 單項限制 (${noteByteSize} bytes)，略過同步`);
                    continue;
                }
                const newTotalSize = this.getByteLength(JSON.stringify([...syncList, note]));
                if (newTotalSize >= SYNC_STORAGE_LIMIT) {
                    console.log(`已同步筆記 "${note.title}" 因更新後超出容量，暫時移出 sync`);
                    continue; // 跳過此筆，但繼續嘗試保留後面的已同步筆記
                }
                syncList.push(note);
            }

            // 3b. 用剩餘空間加入新筆記
            for (const note of newNotes) {
                if (syncList.length >= MAX_SYNC_NOTES) break;
                const noteByteSize = this.getByteLength(JSON.stringify(note));
                // 單筆超過 chunk 限制的跳過
                if (noteByteSize + 2 > CHUNK_SIZE_LIMIT) {
                    console.warn(`筆記 "${note.title}" 超過 sync storage 單項限制 (${noteByteSize} bytes)，略過同步`);
                    continue;
                }
                const newTotalSize = this.getByteLength(JSON.stringify([...syncList, note]));
                if (newTotalSize >= SYNC_STORAGE_LIMIT) {
                    console.log(`Sync storage 空間不足，新筆記 "${note.title}" 僅存於本地`);
                    continue; // 繼續嘗試其他較小的新筆記
                }
                syncList.push(note);
            }

            // 4. 將筆記分 chunk，每個 chunk 不超過 CHUNK_SIZE_LIMIT（以 byte 計算）
            const chunks: string[] = [];
            let currentChunk: Note[] = [];
            let currentChunkByteSize = 2; // 初始為 "[]" 的 byte 長度

            for (const note of syncList) {
                const noteJson = JSON.stringify(note);
                const noteByteSize = this.getByteLength(noteJson);

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

            // 5. 寫入所有 chunks
            const setData: Record<string, string> = {
                notes_chunk_count: String(chunks.length),
            };
            for (let i = 0; i < chunks.length; i++) {
                setData[`${CHUNK_KEY_PREFIX}${i}`] = chunks[i];
            }
            await chrome.storage.sync.set(setData);

            // 6. 清除多餘的舊 chunk keys
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

            // 7. 記錄未同步的筆記 ID（用版本比對，避免同 id 舊版本被誤判為已同步）
            const unsyncedIds = this.calculateUnsyncedNoteIds(notes, syncList);
            await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
        } catch (error) {
            console.warn('Failed to sync to sync storage:', error);
            // 同步失敗時，仍依照目前 sync 內殘留版本更新未同步清單。
            const syncedNotes = await this.getSyncedNotesFromSyncStorage();
            const unsyncedIds = this.calculateUnsyncedNoteIds(notes, syncedNotes);
            await chrome.storage.local.set({ unsyncedNoteIds: unsyncedIds });
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

