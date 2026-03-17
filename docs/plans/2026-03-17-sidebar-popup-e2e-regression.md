# Sidebar 切回 Popup 模式 E2E 回歸測試 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增一個 Playwright E2E 回歸測試，驗證 Sidebar 中的「切換 Popup 模式」按鈕會透過背景 service worker 將 `openPanelOnActionClick` 切回 `false`。

**Architecture:** 沿用既有的 Playwright extension helper 載入 `dist/` 擴充功能，從 Manifest V3 service worker 取得 extension ID 與背景執行環境。測試先建立「目前為側邊欄模式」的前置狀態，再開啟 `sidebar.html` 點擊「切換 Popup 模式」，接受提示對話框，最後由 service worker 讀取 `chrome.sidePanel.getPanelBehavior()` 驗證狀態已切回 Popup 模式。

**Tech Stack:** Playwright 1.58、Chromium persistent context、Chrome Extension Manifest V3、Node.js test runner

---

### Task 1: 確認可驗證訊號

**Files:**
- Inspect: `src/pages/Sidebar.tsx`
- Inspect: `src/background/service-worker.ts`
- Inspect: `tests/e2e/helpers/extension-context.mjs`

**Step 1: 確認 Sidebar 按鈕與背景訊息流程**

Run: `rg -n "切換 Popup 模式|switchToPopup|getPanelBehavior|setPanelBehavior" src tests node_modules/@types/chrome/index.d.ts`
Expected: 可定位 Sidebar 按鈕、背景訊息 `switchToPopup`，以及 `chrome.sidePanel.getPanelBehavior()` 作為可驗證狀態。

### Task 2: 先寫失敗測試

**Files:**
- Create: `tests/e2e/sidebar-popup.spec.mjs`

**Step 1: 撰寫單一行為測試**

Run: `node --test --test-reporter=spec tests/e2e/sidebar-popup.spec.mjs`
Expected: 在 helper 尚未回傳 `serviceWorker` 前失敗，形成 Red。

### Task 3: 補齊測試支援

**Files:**
- Modify: `tests/e2e/helpers/extension-context.mjs`
- Modify: `package.json`

**Step 1: 回傳 service worker 並新增 npm script**

Run: `npm run test:e2e:sidebar-popup`
Expected: 會先 build，再啟動 Chromium 執行 Sidebar → Popup 模式切換測試。

### Task 4: 驗證回歸情境

**Files:**
- Verify: `tests/e2e/sidebar-popup.spec.mjs`
- Verify: `tests/e2e/helpers/extension-context.mjs`

**Step 1: 驗證側邊欄模式前置狀態可建立**

Run: `npm run test:e2e:sidebar-popup`
Expected: 背景狀態先被設成 `openPanelOnActionClick = true`。

**Step 2: 驗證 Sidebar 可切回 Popup 模式**

Run: `npm run test:e2e:sidebar-popup`
Expected: 點擊 `sidebar.html` 的「切換 Popup 模式」後，提示框內容正確，且背景狀態變成 `openPanelOnActionClick = false`。
