# 輕筆記 Extension

一個專為 Google Chrome 設計的輕量級筆記擴充套件，讓你在瀏覽網頁時能夠快速、方便地記錄想法和重要資訊。

## 🌟 核心特色

- **三種視圖切換**
  - 📝 **Popup 模式**：適合快速紀錄的小視窗。
  - 📖 **側邊欄 (Sidebar) 模式**：可在瀏覽網頁時隨時筆記，支援取得當前網頁標題與網址。
  - 🪟 **獨立視窗模式**：更大的編輯與檢視空間，並支援自訂左側列表/右側編輯器的比例（可拖曳分隔線）。
- **豐富編輯體驗**
  - **自動儲存 (Auto Save)**：編輯既有筆記時，會依設定間隔（預設 3000ms）背景自動儲存。
  - **雙模式編輯器**：支援純文字與 Markdown (使用 EasyMDE) 雙模式。
  - **智慧防誤刪機制**：刪除筆記前提供彈出視窗警告，防止手滑。
- **高效率管理**
  - **標籤系統**：輕鬆為筆記加上標籤，尋找更方便。
  - **智慧搜尋列**：標籤過濾加上關鍵字，與各功能按鈕完美整合在一行，不壓縮編輯空間。
- **強大且安全的同步機制**
  - **Sync 分塊儲存與容量保護**：以 Chunk (區塊分流) 寫入 `chrome.storage.sync`，並套用單筆 7,800 bytes、總量 96KB、最多 50 筆的同步限制，避免超額寫入。
  - **手動匯出/匯入**：支援 JSON 格式檔案層級雙向匯出與備份。

## 🛠️ 開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置
npm run build
```

建置後會產生可載入的擴充功能檔案於 `dist/`。

## 載入到 Chrome

1. 前往 `chrome://extensions/`
2. 開啟「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇 `dist/` 目錄

## 發版與上傳 Chrome Web Store

1. 更新 `public/manifest.json` 內的 `version`（每次上傳都必須遞增）。
2. 重新建置：

```bash
npm run build
```

3. 打包 `dist/` 成 zip（檔名建議帶版本）：

```bash
cd dist
zip -r ../artifacts/chrome-notes-extension-vX.Y.Z.zip .
```

4. 到 Chrome Web Store Developer Dashboard 上傳 `artifacts/chrome-notes-extension-vX.Y.Z.zip`。

## 技術棧

- React 19 + TypeScript
- Vite
- Zustand
- Tailwind CSS
- react-simplemde-editor / react-markdown
- Chrome Extension Manifest V3
