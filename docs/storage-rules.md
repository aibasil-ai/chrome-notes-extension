# 筆記儲存規則

## 📦 儲存架構：雙軌混合儲存

本專案採用 **`chrome.storage.local`（本機）+ `chrome.storage.sync`（同步）** 的混合儲存策略。

- **Local**：主要資料來源，所有筆記都會存在這裡
- **Sync**：跨裝置同步用，受 Chrome 配額限制

---

## 🗂️ 筆記資料結構

定義於 `src/types/note.ts`：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | `string` | UUID，唯一識別碼 |
| `title` | `string` | 標題 |
| `content` | `string` | 內容 |
| `tags` | `string[]` | 標籤列表 |
| `createdAt` | `number` | 建立時間（ms timestamp） |
| `updatedAt` | `number` | 最後更新時間（ms timestamp） |
| `editMode` | `'plain' \| 'markdown'` | 編輯模式 |
| `pageContext?` | `object` | 選填的網頁關聯資訊（URL、頁面標題、擷取時間） |

---

## 💾 儲存規則詳解

### 核心策略：編輯者承擔（Caller-Pays Eviction）

1. **穩定同步集合**：一般儲存時不重排整包 synced 筆記。既有 synced 筆記預設不移除，除非使用者刪除該筆或該筆本身更新後無法再放入 sync。
2. **編輯者承擔淘汰**：儲存目標筆記 N 時，若 N 寫入 sync 後會超限，則 N 改為 local-only，而不是擠掉其他筆記。
3. **遞補只在釋出空間時觸發**：僅在刪除筆記後（或擴充功能啟動時）才從 unsynced 候選中嘗試補入 sync。

### 2. 寫入（`saveNote`）— 核心邏輯

寫入流程：

1. **單筆限制檢查**：`size(N) > 7,800B` 直接阻擋。
2. **Sync 96KB 滿載檢查**（`bytesInUse >= 96KB`）：
   - 寬鬆模式：允許 local 寫入，N 標記 unsynced。
   - 嚴格模式：阻擋並回滾此次變更。
3. **Sync 未滿時**（`bytesInUse < 96KB`）：
   - 先寫入 local。
   - 只評估 N 能否寫入 sync（替換同 ID 舊版本或新增）。
   - 可寫入：更新 sync 中的 N。
   - 不可寫入（寬鬆模式）：保留 local、N 標記 unsynced。
   - 不可寫入（嚴格模式）：回滾 local 並阻擋。
4. **不得因 N 失敗而移除其他已同步筆記。**

> 💡 **單筆超大容量處理（7,800 bytes 限制）**：Chrome Sync Storage 單一 item 限制為 8,192 bytes。為了避免超出限制，系統在儲存時會直接阻擋超過 7,800 bytes 的筆記。

---

根據設定 `allowLocalSaveWhenSyncFull`（設定介面稱作「同步容量滿載時允許僅儲存本機」）有兩種行為：

#### 🔴 設定關閉（預設）— 嚴格模式

**目標：維持絕對的同步一致性。當 N 無法寫入 sync 時，阻擋整個儲存操作。**

| 情況 | 行為 |
|------|------|
| N 寫入 sync 後會超限 | ❌ **回滾 local 變更並拋錯** |
| Sync 已達 96KB 上限 | ❌ **直接阻擋，拋錯** |

#### 🟡 設定開啟 — 寬鬆模式

**目標：以成功儲存資料為最優先。N 無法同步時仍保留 local 寫入。**

| 情況 | 行為 |
|------|------|
| N 寫入 sync 後會超限 | ✅ **僅存 Local，標記為「未同步」** |
| Sync 已達 96KB 上限 | ✅ **僅存 Local，標記為「未同步」** |

### 3. Sync Storage 的分 Chunk 規則

為克服 Chrome sync storage **單一 key 最大 8,192 bytes** 的限制，筆記同步時採用 **chunk 陣列方式打包儲存**：

```
每個 chunk key: notes_chunk_0, notes_chunk_1, notes_chunk_2 ...
chunk 大小上限: 7,800 bytes（保留 ~392 bytes 給 key 名稱和 JSON 陣列結構）
notes_chunk_count: 記錄目前 chunk 總數
```

**同步寫入方式：**

- `trySyncSingleNote`：儲存時只嘗試將目標筆記寫入/替換至 sync，不重排其他筆記。
- `writeChunksToSync`：將 sync 清單分 chunk 寫入，並清除多餘的舊 chunk。

### 4. 刪除（`deleteNote`）

- 從 local + sync 中刪除該筆。
- **觸發遞補程序（refill）**：從 unsynced 候選中逐筆嘗試補回 sync。

### 5. 遞補策略（Refill）

遞補在以下時機觸發：

- **刪除筆記後**：`deleteNote()` 刪除後自動執行
- **擴充功能啟動時**：`loadNotes()` 載入筆記後自動執行

規則：

1. **候選**：`unsyncedNoteIds` 對應筆記，且單筆 ≤ 7,800B。
2. **排序**：`createdAt` 由舊到新；若相同則以 `id` 字典序排序。
3. **逐筆嘗試**加入 sync，能放就加入，直到下一筆會超過 96KB 為止。
4. **不做交換**：不會為了新筆記而踢掉舊筆記。

### 6. 未同步狀態追蹤（`unsyncedNoteIds`）

- 每次儲存後，比對 local 與 sync 的 `updatedAt` 時間戳來判斷哪些筆記「尚未同步或版本較舊」
- 結果儲存在 `chrome.storage.local` 的 `unsyncedNoteIds` 欄位

### 7. 設定檔（`settings`）

- **只存在 `chrome.storage.sync`**，不放 local
- 預設值：自動儲存間隔 3000ms、純文字模式、不擷取頁面資訊、顯示容量圖示

### 8. 匯入（`importNotes`）

- 只匯入 ID 不重複的筆記，已存在的筆記會被跳過
- 匯入後重新載入所有筆記並更新 sync 使用量
- ⚠️ **匯入容量防護**：匯入時逐筆呼叫寫入邏輯，若系統處於「**嚴格模式**」且容量不足，會拋錯中斷。建議匯入前先切換為「寬鬆模式」。

---

## 📊 儲存限制總結

| 項目 | 限制 |
|------|------|
| Sync 總容量上限 | **96 KB**（Chrome 給 102.4 KB，預留 ~6 KB 給開銷使用） |
| 最大可同步筆數 | **512 筆**（僅作防呆，實際由容量規則主導） |
| 單筆最大同步容量 | **7,800 bytes**（超過此大小直接阻擋儲存） |
| Local 儲存限制 | 瀏覽器本身無嚴格單一檔案限制，但超過 7,800 bytes 的筆記無法上傳至 Sync。 |

---

## 📁 相關程式碼

| 檔案 | 職責 |
|------|------|
| `src/services/storage.ts` | 儲存邏輯核心（`StorageService`） |
| `src/store/useNotesStore.ts` | Zustand 狀態管理，呼叫 `storageService` |
| `src/types/note.ts` | 型別定義與預設設定 |
