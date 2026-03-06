# 儲存規則文件（Sync/Local 容量與阻擋策略）

**日期：** 2026-03-06  
**狀態：** 草案（待確認後實作）

## 1. 目標與範圍

本文件定義筆記在 `chrome.storage.sync` 與 `chrome.storage.local` 的儲存限制、阻擋條件、提示時機與同步遞補規則，確保：

1. 不會突破 Sync 可用容量上限（96KB）。
2. 不會儲存超過單筆大小上限（7800B）的筆記。
3. 在「手動儲存」與「自動儲存」都採用一致的阻擋與提示行為。
4. Sync 空間釋出後，能依規則自動遞補未同步筆記。

## 2. 名詞與常數

- `SYNC_BLOCK_LIMIT_BYTES = 96 * 1024 = 98304`
- `NOTE_MAX_BYTES = 7800`
- `allowLocalSaveWhenSyncFull`：使用者設定，代表「Sync 滿載時允許僅儲存本機」。
- `unsyncedNoteIds`：存在 local 但未成功寫入 sync 的筆記 ID。

> 單筆大小計算方式：`TextEncoder().encode(JSON.stringify(note)).length`。

## 3. 正式規則

### 規則 R1：Sync 96KB 滿載阻擋

1. 當 Sync 使用量 `>= 96KB` 時，不允許新增或修改筆記寫入（包含手動儲存與自動儲存）。
2. 例外：若 `allowLocalSaveWhenSyncFull = true`，允許改為「僅儲存本機」，不寫入 Sync。
3. 若 `allowLocalSaveWhenSyncFull = false`，必須阻擋此次儲存，且資料不可落地。

### 規則 R2：Sync 空間釋出後遞補

1. 遞補觸發點如下：
   - 當使用者刪除筆記並釋出 Sync 空間時，於刪除後立即觸發遞補程序。
   - 擴充功能啟動時，僅在 Sync 使用量 `< 96KB` 時觸發一次遞補程序。
2. 從 `unsyncedNoteIds` 建立候選集，並先以 `createdAt` 由舊到新排序；若相同則以 `id` 字典序排序。
3. 每一輪遞補採「依序掃描、依序嘗試寫入」：
   - 依排序後順序逐筆掃描所有「尚未遞補」候選。
   - 對於每一筆候選，若寫入後 Sync 使用量 `<= 96KB`，立即寫入該筆並自候選集中移除。
   - 若該筆寫入後會使 Sync 使用量 `> 96KB`，則略過該筆，不寫入。
4. 本輪掃描完成後，若至少有一筆成功寫入，重複下一輪掃描。
5. 若某一輪掃描後無任何筆記可成功寫入，停止遞補。

> 註：遞補策略為固定排序後逐筆嘗試寫入，容量超限的筆記於當輪直接跳過。

### 規則 R3：單筆 7800B 上限（Sync 與 Local 一致）

1. 不論 Sync 或 Local，單筆筆記大小 `> 7800B` 一律禁止儲存。
2. 適用情境：
   - 新增筆記按「儲存」
   - 修改筆記按「儲存」
   - 編輯過程中的自動儲存
3. 觸發後必須提示使用者，且不得保存新增或異動內容。

### 規則 R4：阻擋提示時機一致化

1. 當 Sync `>= 96KB` 且未開啟僅本機儲存時：
   - 新增/修改按下儲存：需提示並阻擋。
   - 自動儲存觸發：需提示並阻擋。
2. 被阻擋時，不得出現「實際未保存但畫面看似已保存」的狀況。

## 4. 儲存決策流程

每次儲存（手動或自動）都走以下順序：

1. 計算單筆大小。
2. 若 `noteSize > 7800`：直接阻擋並提示（結束）。
3. 讀取 Sync 使用量與設定值。
4. 若 `syncUsage >= 96KB`：
   - `allowLocalSaveWhenSyncFull = true`：僅存 local，標記 unsynced。
   - `allowLocalSaveWhenSyncFull = false`：阻擋並提示（結束）。
5. 若 `syncUsage < 96KB`：
   - 先寫 local，再嘗試 sync 打包。
   - 若打包後會突破規則：
     - `allowLocalSaveWhenSyncFull = true`：保留 local 寫入、標記 unsynced，並提示「已改為僅儲存本機」。
     - `allowLocalSaveWhenSyncFull = false`：回滾此次 local 異動並提示阻擋。
6. 儲存成功後更新 `unsyncedNoteIds`。

## 5. 提示訊息規格

建議統一錯誤代碼與文案：

- `NOTE_SIZE_EXCEEDED`
  - 文案：`此筆記大小超過 7,800B，無法儲存。請刪減內容後再試。`
- `SYNC_CAPACITY_FULL_BLOCKED`
  - 文案：`Sync 空間已達 96KB 上限，且尚未開啟「僅儲存本機」，本次變更未儲存。`
- `SYNC_CAPACITY_FULL_LOCAL_ONLY`（可選資訊訊息）
  - 文案：`Sync 空間已滿，本次已改為僅儲存本機。`

## 6. 驗收情境（Acceptance Criteria）

1. 單筆 7801B 新增按儲存：顯示超限訊息，不新增筆記。
2. 單筆 7801B 編輯自動儲存：顯示超限訊息，不覆蓋原內容。
3. Sync 已滿 + 未開啟僅本機 + 新增儲存：顯示容量訊息，不新增。
4. Sync 已滿 + 未開啟僅本機 + 編輯自動儲存：顯示容量訊息，不更新。
5. Sync 已滿 + 開啟僅本機：可儲存到 local，該筆列入 unsynced。
6. 刪除一筆已同步資料後觸發遞補：未同步清單中可放入者依規則補進 sync。
7. 擴充功能啟動且 Sync 使用量 `< 96KB` 時觸發遞補：未同步清單中可放入者依規則補進 sync。
8. 遞補後 Sync 使用量不超過 96KB。
9. `syncUsage < 96KB` 但本次打包後會超限 + `allowLocalSaveWhenSyncFull = true`：保留 local 寫入、列入 unsynced，並提示「已改為僅儲存本機」。
10. `syncUsage < 96KB` 但本次打包後會超限 + `allowLocalSaveWhenSyncFull = false`：回滾此次 local 異動、顯示阻擋訊息，且不得保存異動內容。

## 7. 落地實作計畫（含檔案、預期結果、驗證）

### 步驟 1：抽離與統一容量規則常數/錯誤

- 預計修改檔案：
  - `src/services/storage.ts`
- 預期結果：
  - 96KB 與 7800B 常數只定義一次。
  - 以錯誤代碼（或可辨識 Error message）統一拋錯。
- 驗證指令：
  - `npm run lint`

### 步驟 2：在儲存入口先做單筆 7800B 阻擋

- 預計修改檔案：
  - `src/services/storage.ts`
- 預期結果：
  - 新增/修改/自動儲存共用 `saveNote()` 路徑時，先檢查單筆大小。
  - 超限時「不寫 local、不寫 sync」。
- 驗證指令：
  - `npm run lint`
  - `npm run build`

### 步驟 3：強化 Sync 滿載阻擋（96KB）

- 預計修改檔案：
  - `src/services/storage.ts`
- 預期結果：
  - `syncUsage >= 96KB` 且 `allowLocalSaveWhenSyncFull=false` 時，一律阻擋並拋錯。
  - `allowLocalSaveWhenSyncFull=true` 時，僅存 local 並更新 unsynced。
- 驗證指令：
  - `npm run lint`
  - `npm run build`

### 步驟 4：重構遞補演算法（空間釋出後補回 sync）

- 預計修改檔案：
  - `src/services/storage.ts`
- 預期結果：
  - 遞補候選以 `createdAt` 為主序。
  - 依序掃描候選並依序嘗試寫入；若該筆寫入後會超過 96KB，則跳過該筆。
  - 遞補結果不超出 96KB。
- 驗證指令：
  - `npm run lint`
  - `npm run build`

### 步驟 5：確保三個頁面手動/自動儲存提示一致

- 預計修改檔案：
  - `src/pages/Popup.tsx`
  - `src/pages/Sidebar.tsx`
  - `src/pages/Window.tsx`
- 預期結果：
  - 手動儲存被阻擋時必提示。
  - 自動儲存被阻擋時也提示（可避免重複轟炸提示）。
- 驗證指令：
  - `npm run lint`
  - `npm run build`

### 步驟 6：更新設定與狀態顯示文案

- 預計修改檔案：
  - `src/components/Settings/Settings.tsx`
  - `src/components/shared/SyncStorageStatus.tsx`
- 預期結果：
  - 使用者能清楚理解「Sync 滿載時允許僅本機」開關行為。
  - Sync 狀態顯示與阻擋規則一致。
- 驗證指令：
  - `npm run lint`
  - `npm run build`

### 步驟 7：手動驗證關鍵流程

- 預計修改檔案：
  - `docs/plans/2026-03-06-storage-rules-spec.md`（補實測結果）
- 預期結果：
  - 10 個驗收情境皆有「操作步驟 + 預期結果 + 實際結果」。
- 驗證指令：
  - `npm run build`
