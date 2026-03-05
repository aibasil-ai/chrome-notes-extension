// Note 相關型別定義

export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: number;
    updatedAt: number;

    // 網頁關聯資訊（選擇性）
    pageContext?: {
        url: string;
        pageTitle: string;
        capturedAt: number;
    };

    // 編輯模式
    editMode: 'plain' | 'markdown';
}

export interface AppSettings {
    defaultEditMode: 'plain' | 'markdown';
    autoSaveInterval: number;       // 自動儲存間隔（毫秒）
    capturePageByDefault: boolean;  // 預設是否記錄網頁資訊
    theme: 'light' | 'dark' | 'auto';
}

export interface StorageData {
    notes: Note[];
    settings: AppSettings;
    lastSyncAt: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
    defaultEditMode: 'plain',
    autoSaveInterval: 3000,
    capturePageByDefault: false,
    theme: 'auto',
};

// 同步儲存空間使用量
export interface SyncStorageUsage {
    bytesInUse: number;     // 已使用的位元組數
    quotaBytes: number;     // 總配額位元組數
    percentage: number;     // 使用百分比（0-100）
}
