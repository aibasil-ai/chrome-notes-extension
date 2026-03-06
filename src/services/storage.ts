// Chrome Storage Service — 混合儲存方案
import type { Note, AppSettings, SyncStorageUsage } from '../types/note';
import { DEFAULT_SETTINGS } from '../types/note';

const MAX_SYNC_NOTES = 50;

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

    // 儲存筆記（同時寫入 local + sync）
    async saveNote(note: Note): Promise<void> {
        // 1. 計算單筆大小，超過 7800B 則直接阻擋
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

        // 規則 R1：Sync 96KB 滿載阻擋
        if (bytesInUse >= SYNC_BLOCK_LIMIT_BYTES) {
            if (settings.allowLocalSaveWhenSyncFull) {
                // 僅存 local，標記 unsynced
                await chrome.storage.local.set({ notes });
                await this.refreshUnsyncedNoteIds(notes);
                throw new Error(SYNC_CAPACITY_FULL_LOCAL_ONLY);
            } else {
                throw new Error(SYNC_CAPACITY_FULL_BLOCKED);
            }
        }

        await chrome.storage.local.set({ notes });
        await this.syncToSyncStorage(notes);

        // 如果 sync 後會突破 96KB，syncToSyncStorage 不會寫入該筆。我們檢查是否真的寫進去了。
        const afterSyncedSet = await this.getCurrentSyncedNoteIds();
        const currentNoteSynced = afterSyncedSet.has(note.id);

        if (!currentNoteSynced) {
            if (settings.allowLocalSaveWhenSyncFull) {
                // 保留 local 寫入，標記 unsynced，可提示改為僅本機
                // 必須重新整理 unsynced 狀態，否則 UI 不會顯示該圖示
                await this.refreshUnsyncedNoteIds(notes);
                throw new Error(SYNC_CAPACITY_FULL_LOCAL_ONLY);
            } else {
                // 回滾 local 異動並提示阻擋
                await chrome.storage.local.set({ notes: currentNotes });
                await this.syncToSyncStorage(currentNotes);
                throw new Error(SYNC_CAPACITY_FULL_BLOCKED);
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
    // 策略：依規則 R2 釋出後遞補，以及正常寫入
    private async syncToSyncStorage(notes: Note[]): Promise<void> {
        try {
            // 1. 取得目前已同步的筆記 ID
            const currentSyncedIds = await this.getCurrentSyncedNoteIds();

            // 2. 分離已同步 vs 新/未同步筆記
            const alreadySynced = notes.filter((n) => currentSyncedIds.has(n.id));
            const unsyncedCandidates = notes.filter((n) => !currentSyncedIds.has(n.id));

            // R2 規則排序：createdAt 由舊到新排序；若相同則以 id 字典序排序
            unsyncedCandidates.sort((a, b) => {
                if (a.createdAt !== b.createdAt) {
                    return a.createdAt - b.createdAt;
                }
                return a.id.localeCompare(b.id);
            });

            const syncList: Note[] = [];

            // 3a. 先放已同步的筆記（保留舊資料）
            for (const note of alreadySynced) {
                if (syncList.length >= MAX_SYNC_NOTES) break;

                const noteByteSize = this.getByteLength(JSON.stringify(note));
                if (noteByteSize > NOTE_MAX_BYTES) {
                    console.warn(`筆記 "${note.title}" 超過限度 (${noteByteSize} bytes)，跳過同步`);
                    continue; // 規格上超過 7800 不能存，防範極端狀況
                }

                // 估算加入後的總大小
                const tempSyncList = [...syncList, note];
                const newTotalSize = this.getByteLength(JSON.stringify(tempSyncList));
                // 每一個 chunk 會浪費一些 metadata (key name, etc.)，以每個 note 額外 50 bytes 作為安全緩衝
                const bufferSize = tempSyncList.length * 50 + 200;

                if (newTotalSize + bufferSize > SYNC_BLOCK_LIMIT_BYTES) {
                    console.log(`已同步筆記 "${note.title}" 因更新後加上安全緩衝超出 96KB 限制，移出 sync`);
                    continue;
                }

                syncList.push(note);
            }

            // 3b. R2 遞補規則：依序掃描、依序嘗試寫入候選集
            let addedInThisRound = true;
            let remainingCandidates = [...unsyncedCandidates];

            while (addedInThisRound && remainingCandidates.length > 0 && syncList.length < MAX_SYNC_NOTES) {
                addedInThisRound = false;
                const nextRemainingCandidates: Note[] = [];

                for (const note of remainingCandidates) {
                    if (syncList.length >= MAX_SYNC_NOTES) break;

                    const noteByteSize = this.getByteLength(JSON.stringify(note));
                    if (noteByteSize > NOTE_MAX_BYTES) {
                        continue;
                    }

                    const tempSyncList = [...syncList, note];
                    const newTotalSize = this.getByteLength(JSON.stringify(tempSyncList));
                    const bufferSize = tempSyncList.length * 50 + 200;

                    if (newTotalSize + bufferSize <= SYNC_BLOCK_LIMIT_BYTES) {
                        // 寫入後 Sync 使用量 <= 96KB，立即寫入該筆並自候選集中移除
                        syncList.push(note);
                        addedInThisRound = true;
                    } else {
                        // 若該筆寫入後會使 Sync 使用量 > 96KB，則略過該筆，放入下一次掃描
                        nextRemainingCandidates.push(note);
                    }
                }
                remainingCandidates = nextRemainingCandidates;
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

