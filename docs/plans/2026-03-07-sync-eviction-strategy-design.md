# Sync 淘汰策略重構設計（編輯者承擔）

**日期：** 2026-03-07  
**狀態：** 草案（待確認後實作）

## 1. 背景與問題

目前 `saveNote()` 在 `syncUsage < 96KB` 時，會重算整包 `syncList`。當某筆編輯後變大、總量接近上限時，可能把既有已同步筆記擠出 sync。  
結果是：使用者編輯 A，卻看到 B（常是最早建立的筆記）變成 unsynced，體感上像「無關筆記被連坐」。

## 2. 目標

1. 避免「編輯某筆，其他既有 synced 筆記被踢出」。
2. 讓淘汰責任可預期：誰造成超限，誰承擔 local-only。
3. 保留現有 7800B 單筆限制、96KB 總量限制與 `allowLocalSaveWhenSyncFull` 開關語意。
4. 讓 Sync 集合在一般編輯流程中保持穩定，僅在明確觸發時做遞補。

## 3. 非目標

1. 不變更 `Note` 資料模型。
2. 不新增後端服務或外部儲存。
3. 不在本次設計中改動 UI 結構（僅可調整提示文案）。

## 4. 核心策略

### S1. 穩定同步集合（Stable Synced Set）

- 一般儲存時，不重排整包 synced 筆記。
- 既有 synced 筆記預設不移除，除非使用者刪除該筆或該筆本身更新後無法再放入 sync。

### S2. 編輯者承擔（Caller-Pays Eviction）

- 本次儲存目標筆記記為 `N`。
- 若 `N` 寫入 sync 後會超限，則 `N` 改為 local-only（加入 `unsyncedNoteIds`），而不是擠掉其他筆記。

### S3. 遞補只在「釋出空間」場景觸發

- 遞補觸發點限定為：
  - 刪除筆記後
  - 擴充功能啟動時（可選）
  - 手動「立即重試同步」操作（可選）
- 遞補時才從 unsynced 候選中嘗試補入 sync。

## 5. 儲存流程（新規）

## 5.1 `saveNote(N)` 流程

1. 單筆限制檢查：`size(N) > 7800B` 直接阻擋。
2. 若 `syncUsage >= 96KB`：
   - `allowLocalSaveWhenSyncFull = true`：允許 local 寫入，`N` 標記 unsynced。
   - `allowLocalSaveWhenSyncFull = false`：阻擋並回滾此次變更。
3. 若 `syncUsage < 96KB`：
   - 只評估 `N` 能否寫入 sync（替換同 ID 舊版本或新增）。
   - 可寫入：更新 sync 中的 `N`。
   - 不可寫入：
     - 開啟 local-only：保留 local、`N` 標記 unsynced。
     - 關閉 local-only：阻擋並回滾此次變更。
4. 不得因 `N` 失敗而移除其他已同步筆記。

## 5.2 `deleteNote(id)` 流程

1. 先刪 local + sync。
2. 執行遞補程序（從 unsynced 候選中補回可放入的筆記）。

## 6. 遞補策略（Refill）

1. 候選：`unsyncedNoteIds` 對應筆記，且單筆 `<= 7800B`。
2. 排序：使用 `createdAt` 舊到新。
3. 逐筆嘗試加入 sync，能放就加入，直到下一筆會超過 96KB 為止。
4. 不做「為了新筆記而踢掉舊筆記」的交換。

## 7. 50 筆上限策略

建議移除硬編碼 `MAX_SYNC_NOTES = 50`，改由容量規則主導；若仍需保護，可改為接近 Chrome 上限的安全值（例如 512）並僅作防呆。

## 8. 驗收情境（Acceptance Criteria）

1. 編輯 A 後超限，且允許 local-only：A 變 unsynced；其他原先 synced 筆記維持 synced。
2. 編輯 A 後超限，且不允許 local-only：A 變更被阻擋；原資料不變。
3. 刪除 synced 筆記釋出空間後，unsynced 候選可被逐筆補回 sync。
4. 不再出現「編輯某筆，最早建立的無關筆記被踢出 sync」。

## 9. 實作落地（檔案）

- `src/services/storage.ts`
  - 重構 `saveNote()`：改為只處理目標筆記，不重排全量 synced 集合。
  - 重構 `syncToSyncStorage()`：拆分成「單筆嘗試同步」與「遞補同步」兩條路徑。
  - 調整或移除 `MAX_SYNC_NOTES`。
- `src/store/useNotesStore.ts`
  - 保留現有 warning/error 行為，確認 local-only 提示時機一致。
- `docs/plans/2026-03-09-storage-rules.md`
  - 更新規則描述（淘汰責任與遞補觸發點）。

## 10. 風險與對策

1. **風險：** sync 與 local 版本差距增加。  
   **對策：** 持續維護 `unsyncedNoteIds`，在設定頁提供明確提示與「重試同步」入口。

2. **風險：** 遞補排序不符合使用者預期。  
   **對策：** 排序策略集中為單一函式，必要時改成可設定策略。

3. **風險：** 重構時引入行為回歸。  
   **對策：** 以本文件第 8 節情境建立回歸測試（單元 + 手動流程）。
