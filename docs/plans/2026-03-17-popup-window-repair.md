# Popup / 獨立視窗無法開啟 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修正背景 service worker 無法啟動，讓 Popup 模式切換與獨立視窗重新可用。

**Architecture:** 先確認背景腳本是否因 ES module 輸出與 manifest 宣告不一致而失效，再以最小修復補上 manifest 設定。由於此專案目前沒有正式測試框架，使用 Node 驗證腳本做最小可重現的 Red/Green 保護。

**Tech Stack:** Chrome Extension Manifest V3、TypeScript、Vite、React、Node.js

---

### Task 1: 確認根因

**Files:**
- Inspect: `public/manifest.json`
- Inspect: `src/background/service-worker.ts`
- Inspect: `vite.config.ts`

**Step 1: 檢查背景腳本是否為模組輸出**

Run: `npm run build`

Expected: `dist/background.js` 產生且含有 ES module `import`。

**Step 2: 檢查 manifest 是否宣告 module service worker**

Run: `node -e "const m=require('./public/manifest.json'); console.log(m.background)"`

Expected: 目前缺少 `type: 'module'`，可作為根因證據。

### Task 2: 建立失敗驗證

**Files:**
- Create: `scripts/check-background-manifest.mjs`
- Modify: `package.json`

**Step 1: 撰寫最小驗證腳本**

Run: `node scripts/check-background-manifest.mjs`

Expected: 在修復前失敗，指出背景腳本使用 module 輸出但 manifest 未宣告 `background.type = 'module'`。

### Task 3: 實作最小修復

**Files:**
- Modify: `public/manifest.json`

**Step 1: 補上背景 service worker 類型宣告**

Run: `node scripts/check-background-manifest.mjs`

Expected: 驗證腳本通過，確認 manifest 與背景腳本輸出一致。

### Task 4: 建置驗證

**Files:**
- Verify: `dist/background.js`
- Verify: `dist/popup.html`
- Verify: `dist/window.html`

**Step 1: 重新建置擴充套件**

Run: `npm run build`

Expected: 建置成功，產出 `dist/background.js`、`dist/popup.html`、`dist/window.html`。

**Step 2: 再次執行背景驗證腳本**

Run: `node scripts/check-background-manifest.mjs`

Expected: 驗證通過，可合理推定背景 service worker 能正確載入，Popup 切換與獨立視窗訊息流程恢復。
