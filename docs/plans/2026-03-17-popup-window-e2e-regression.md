# Popup / 獨立視窗 E2E 回歸測試 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增一個 Playwright 驅動的 E2E 回歸測試，覆蓋 popup 頁面可開啟、且從 popup 點擊後能成功開啟獨立視窗。

**Architecture:** 使用 Playwright 官方建議的 `chromium.launchPersistentContext()` 載入 `dist/` 目錄中的 Manifest V3 擴充功能，從 service worker URL 取得 extension ID，再直接打開 `chrome-extension://<id>/popup.html` 驗證 popup UI，接著點擊 popup 內的「開啟獨立視窗模式」按鈕並確認 `window.html` 分頁被建立。測試使用 Node 內建 test runner 搭配 `playwright` 套件，避免額外引入新的測試框架依賴。

**Tech Stack:** Playwright 1.58、Chromium persistent context、Node.js test runner、Chrome Extension Manifest V3

---

### Task 1: 建立測試設計

**Files:**
- Create: `docs/plans/2026-03-17-popup-window-e2e-regression.md`
- Inspect: `src/pages/Popup.tsx`
- Inspect: `src/pages/Window.tsx`
- Inspect: `public/manifest.json`

**Step 1: 確認穩定 selector 與測試路徑**

Run: `rg -n "輕筆記|開啟獨立視窗模式|新增筆記" src/pages/Popup.tsx src/pages/Window.tsx`
Expected: 可使用頁面標題文字與按鈕 `title` 作為穩定 locator。

### Task 2: 先寫失敗測試

**Files:**
- Create: `tests/e2e/popup-window.spec.mjs`

**Step 1: 撰寫 E2E 測試**

Run: `node --test tests/e2e/popup-window.spec.mjs`
Expected: 在尚未補齊輔助腳本前，測試因缺少建置前置或 npm script 而無法完整走通，形成第一個 Red。

### Task 3: 補齊執行腳本

**Files:**
- Modify: `package.json`
- Create: `tests/e2e/helpers/extension-context.mjs`

**Step 1: 加入 extension 載入 helper 與 npm script**

Run: `npm run test:e2e:popup-window`
Expected: 會先 build，再啟動 Chromium 載入 `dist/` 擴充功能並執行測試。

### Task 4: 驗證回歸情境

**Files:**
- Verify: `tests/e2e/popup-window.spec.mjs`
- Verify: `tests/e2e/helpers/extension-context.mjs`

**Step 1: 驗證 popup 可載入**

Run: `npm run test:e2e:popup-window`
Expected: 能開啟 `popup.html`，看到「輕筆記」與「新增筆記」。

**Step 2: 驗證獨立視窗可建立**

Run: `npm run test:e2e:popup-window`
Expected: 點擊 popup 的「開啟獨立視窗模式」後，能偵測到 `window.html` 頁面並看到「輕筆記」。
