# 輕筆記 Extension

一個專為 Google Chrome 設計的輕量級筆記擴充套件，讓你在瀏覽網頁時能夠快速、方便地記錄想法和重要資訊。

## 功能

- **多介面支援**：Popup 彈出視窗、Sidebar 側邊欄、獨立視窗
- **Markdown 編輯**：支援 Markdown 和純文字兩種編輯模式
- **標籤管理**：為筆記加上標籤，方便分類和篩選
- **搜尋功能**：關鍵字搜尋 + 標籤篩選
- **跨裝置同步**：透過 Chrome Sync API 自動同步
- **匯出匯入**：支援 JSON 格式匯出匯入

## 開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置
npm run build
```

## 載入到 Chrome

1. 前往 `chrome://extensions/`
2. 開啟「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇 `dist/` 目錄

## 技術棧

- React 18 + TypeScript
- Vite
- Zustand
- Tailwind CSS
- react-simplemde-editor / react-markdown
- Chrome Extension Manifest V3
