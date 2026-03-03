# Chrome 筆記擴充功能設計文件

**日期：** 2026-03-03
**狀態：** 已核准

## 專案概述

開發一個 Chrome 擴充功能，讓使用者能在瀏覽網頁時方便地做筆記。支援多種介面模式、跨裝置同步、標籤管理和搜尋功能。

## 使用場景

- 研究和學習：閱讀技術文章時記錄程式碼片段和技術細節
- 工作和專案管理：瀏覽工作相關網頁時快速記錄待辦事項
- 一般網頁閱讀：看新聞、部落格時隨手記錄有趣內容

## 核心需求

1. **多介面支援**：側邊欄、彈出工具列、獨立視窗
2. **跨裝置同步**：使用 Chrome Sync API + 匯出匯入備援
3. **基本欄位**：標題、內容（支援純文字/Markdown 切換）
4. **搜尋功能**：關鍵字搜尋 + 標籤篩選（第一版簡單實作）
5. **匯出匯入**：JSON 格式
6. **標籤管理**：為筆記加上標籤以便分類
7. **漸進式 UI**：主要功能永遠顯示，次要功能點擊後才顯示
8. **網頁關聯**：選擇性記錄當前網頁的 URL、標題和時間

## 技術架構

### 技術棧

- **框架**：React 18 + TypeScript
- **建置工具**：Vite
- **狀態管理**：Zustand
- **Markdown 編輯器**：react-markdown + react-simplemde-editor
- **UI 樣式**：Tailwind CSS
- **Chrome API**：Manifest V3

### 專案結構

```
chrome-notes-extension/
├── src/
│   ├── components/          # React 元件
│   │   ├── NoteEditor/     # 筆記編輯器元件
│   │   ├── NoteList/       # 筆記列表元件
│   │   ├── SearchBar/      # 搜尋列元件
│   │   ├── TagManager/     # 標籤管理元件
│   │   └── shared/         # 共用元件
│   ├── pages/              # 不同頁面
│   │   ├── Popup.tsx       # 彈出工具列頁面
│   │   ├── Sidebar.tsx     # 側邊欄頁面
│   │   ├── Window.tsx      # 獨立視窗頁面
│   │   └── Settings.tsx    # 設定頁面
│   ├── hooks/              # 自訂 React Hooks
│   │   ├── useNotes.ts     # 筆記資料管理
│   │   ├── useStorage.ts   # Chrome Storage 操作
│   │   └── useSearch.ts    # 搜尋功能
│   ├── services/           # 業務邏輯
│   │   ├── storage.ts      # Storage API 封裝
│   │   ├── sync.ts         # 同步邏輯
│   │   └── export.ts       # 匯出匯入功能
│   ├── types/              # TypeScript 型別定義
│   │   └── note.ts         # Note 相關型別
│   ├── utils/              # 工具函式
│   └── background/         # Background Service Worker
├── public/
│   ├── manifest.json       # Extension manifest
│   └── icons/              # 圖示檔案
└── package.json
```

## 資料模型

### Note 型別

```typescript
export interface Note {
  id: string;                    // UUID
  title: string;
  content: string;               // Markdown 格式
  tags: string[];
  createdAt: number;             // Unix timestamp
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
```

### AppSettings 型別

```typescript
export interface AppSettings {
  defaultEditMode: 'plain' | 'markdown';
  autoSaveInterval: number;      // 自動儲存間隔（毫秒）
  capturePageByDefault: boolean; // 預設是否記錄網頁資訊
  theme: 'light' | 'dark' | 'auto';
}
```

### StorageData 型別

```typescript
export interface StorageData {
  notes: Note[];
  settings: AppSettings;
  lastSyncAt: number;
}
```

## 儲存策略

### 混合儲存方案

1. **Chrome Sync Storage（優先）**
   - 儲存最近的筆記（最新 50 筆或總大小 < 80KB）
   - 儲存設定
   - 自動跨裝置同步

2. **Chrome Local Storage（備援）**
   - 儲存所有筆記（無大小限制）
   - 當 sync storage 超過限制時，新筆記移到 local storage
   - 作為主要資料來源

3. **同步邏輯**
   - **寫入時**：新筆記同時寫入 local + sync；如果 sync 超過限制，新筆記只寫入 local
   - **讀取時**：優先從 local 讀取（完整資料）
   - **跨裝置同步**：監聽 `chrome.storage.onChanged`，當 sync storage 變更時合併到 local storage
   - **衝突解決**：使用 `updatedAt` 時間戳，最新的優先

4. **匯出匯入**
   - **匯出**：將 local storage 的所有資料轉成 JSON
   - **匯入**：讀取 JSON，合併到現有資料（避免覆蓋）

## UI/UX 設計

### 三種介面模式

#### 1. 彈出工具列（Popup）- 320x600px
- 快速筆記模式
- 顯示：搜尋列 + 最近筆記列表（5-10 筆）+ 新增按鈕
- 點擊筆記展開編輯器
- 漸進式 UI：預設只顯示標題和標籤，點擊「更多」才顯示匯出/匯入等功能

#### 2. 側邊欄（Side Panel）- 400px 寬
- 完整功能模式
- 左側：筆記列表（可捲動）
- 右側：編輯器區域
- 頂部：搜尋列 + 標籤篩選
- 底部：設定按鈕

#### 3. 獨立視窗（Separate Window）- 可調整大小
- 與側邊欄相同佈局，但空間更大
- 支援拖曳調整分割比例
- 可以全螢幕編輯單一筆記

### 核心元件

#### NoteEditor 元件
- 標題輸入框
- Markdown/純文字切換按鈕
- 標籤輸入（支援自動完成）
- 網頁資訊擷取開關（預設根據設定）
- 儲存/取消按鈕
- 自動儲存（每 3 秒）

#### NoteList 元件
- 虛擬捲動（處理大量筆記）
- 每個項目顯示：標題、標籤、時間、網頁圖示（如有）
- 支援拖曳排序（未來功能）

#### SearchBar 元件
- 即時搜尋（debounce 300ms）
- 標籤多選篩選
- 清除按鈕

### 漸進式 UI 策略

**主要功能（永遠顯示）**：
- 搜尋列
- 新增筆記按鈕
- 筆記列表
- 編輯器

**次要功能（點擊後顯示）**：
- 匯出/匯入：設定選單中
- 標籤管理：點擊標籤圖示展開
- 進階搜尋：點擊搜尋列的篩選圖示
- 同步狀態：點擊右上角圖示查看

## 錯誤處理

### Storage 錯誤處理
- **Sync storage 超過限制**：顯示通知，自動降級到 local storage，提供清理或匯出選項
- **讀取失敗**：重試機制（最多 3 次），顯示錯誤訊息並提供重新載入按鈕
- **匯入 JSON 失敗**：驗證格式，顯示具體錯誤訊息，不覆蓋現有資料

### 同步衝突處理
- 使用 `updatedAt` 時間戳判斷，最新版本優先
- 未來可考慮：顯示衝突通知，讓使用者選擇保留哪個版本

### 自動儲存失敗
- 使用 localStorage 作為臨時草稿儲存
- 重新開啟時提示「發現未儲存的草稿」
- 提供「恢復」或「捨棄」選項

## 測試策略

### 第一階段（MVP）
- 手動測試主要功能
- 使用 Chrome DevTools 測試 Storage API
- 在不同模式（popup/sidebar/window）下測試 UI

### 第二階段（穩定版）
- 單元測試：Storage service、搜尋邏輯、資料處理函式
- 元件測試：使用 React Testing Library 測試主要元件
- E2E 測試：使用 Playwright 測試完整流程

### 測試重點
- Storage 讀寫正確性
- 同步邏輯（模擬多裝置情境）
- 搜尋功能準確性
- 匯出匯入資料完整性
- UI 在三種模式下的正常運作

## 開發階段規劃

### Phase 1: 基礎架構（MVP）
- 專案初始化（Vite + React + TypeScript）
- Manifest V3 設定
- 基本 Storage service
- 簡單的筆記 CRUD 功能
- Popup 介面

### Phase 2: 核心功能
- Markdown 編輯器整合
- 標籤功能
- 搜尋功能
- 側邊欄和獨立視窗模式

### Phase 3: 同步與匯出
- Chrome Sync 整合
- 匯出匯入功能
- 網頁資訊擷取

### Phase 4: 優化與測試
- 錯誤處理完善
- 效能優化
- 測試覆蓋
- UI/UX 調整

## 未來擴充可能性

- 筆記分類/資料夾功能
- 富文本編輯器選項
- 筆記分享功能
- 雲端備份整合（Google Drive、Dropbox）
- 進階搜尋（日期範圍、多關鍵字組合）
- 筆記版本歷史
- 快捷鍵支援
- 主題客製化

## 技術決策理由

### 為什麼選擇 React + TypeScript？
- 長期維護性：清晰的程式碼結構和型別安全
- 生態系統：豐富的 React 元件和工具
- 團隊協作：易於理解和擴充
- 開發體驗：良好的開發工具支援

### 為什麼選擇 Zustand？
- 輕量級：比 Redux 簡單很多
- 無樣板代碼：不需要 actions、reducers 等複雜結構
- TypeScript 支援良好
- 適合中小型應用

### 為什麼選擇 Vite？
- 快速的開發伺服器啟動
- 熱模組替換（HMR）效能優異
- 簡單的設定
- 良好的 TypeScript 支援

### 為什麼選擇混合儲存策略？
- 平衡自動同步和容量限制
- 提供備援機制
- 使用者無需手動管理同步
- 支援大量筆記的使用情境
