import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const rootDir = process.cwd();
const extensionDir = path.join(rootDir, 'dist');
const outputDir = path.join(rootDir, 'docs', 'chrome-web-store-assets', 'extension-playwright-marketing');
const userDataDir = path.join(rootDir, '.tmp', 'playwright-chrome-profile-marketing');

const now = Date.now();
const sampleNotes = [
  {
    id: 'note-001',
    title: '產品發佈清單',
    content: '## 發佈前檢查\n\n- 完成功能驗證\n- 更新說明文件\n- 建立商店素材',
    tags: ['工作', '發佈'],
    createdAt: now - 86400000 * 5,
    updatedAt: now - 86400000,
    editMode: 'markdown',
    pageContext: {
      url: 'https://example.com/release-plan',
      pageTitle: 'Release Plan',
      capturedAt: now - 86400000,
    },
  },
  {
    id: 'note-002',
    title: '會議重點整理',
    content: '今天確認了兩件事：\n1. 流程要更快\n2. 介面要更直覺',
    tags: ['會議', '整理'],
    createdAt: now - 86400000 * 3,
    updatedAt: now - 86400000 / 2,
    editMode: 'plain',
  },
  {
    id: 'note-003',
    title: '靈感草稿',
    content: '### 新功能想法\n- 標籤分類\n- 快速搜尋\n- 一鍵開啟原網頁',
    tags: ['靈感', '產品'],
    createdAt: now - 86400000 * 2,
    updatedAt: now - 86400000 / 3,
    editMode: 'markdown',
  },
];

const sampleSettings = {
  defaultEditMode: 'markdown',
  autoSaveInterval: 3000,
  capturePageByDefault: false,
  theme: 'auto',
};

const shotJobs = [
  {
    filename: 'screenshot-01-marketing-overview-1280x800.jpg',
    pagePath: 'window.html',
    width: 1280,
    height: 800,
    title: '工作流總覽，一眼掌握',
    subtitle: '以設定與管理視角展示完整功能',
    mode: 'wide',
    prepare: async (page) => {
      await page.getByTitle('設定').first().click();
      await page.waitForTimeout(320);
    },
  },
  {
    filename: 'screenshot-02-marketing-editor-1280x800.jpg',
    pagePath: 'window.html',
    width: 1280,
    height: 800,
    title: '左右分欄，快速編輯',
    subtitle: '保留清單脈絡，同步撰寫內容不跳頁',
    mode: 'wide',
    prepare: async (page) => {
      await page.getByText('產品發佈清單').first().click();
      await page.waitForTimeout(300);
    },
  },
  {
    filename: 'screenshot-03-marketing-tags-1280x800.jpg',
    pagePath: 'window.html',
    width: 1280,
    height: 800,
    title: '標籤篩選，秒速定位',
    subtitle: '讓清單更快找到重點',
    mode: 'wide',
    prepare: async (page) => {
      await page.getByTitle('標籤篩選').first().click();
      await page.waitForTimeout(300);
      await page.getByText('工作').first().click();
      await page.waitForTimeout(260);
      await page.getByText('產品發佈清單').first().click();
      await page.waitForTimeout(260);
    },
  },
  {
    filename: 'screenshot-04-marketing-sidebar-1280x800.jpg',
    pagePath: 'sidebar.html',
    width: 1280,
    height: 800,
    title: 'Side Panel 邊看邊記',
    subtitle: '側欄清單模式，快速瀏覽所有筆記',
    mode: 'wide',
    prepare: async () => {},
  },
  {
    filename: 'screenshot-05-marketing-popup-640x400.jpg',
    pagePath: 'popup.html',
    width: 640,
    height: 400,
    title: '快速筆記，不中斷思路',
    subtitle: 'Popup 版型：開啟即寫、即時整理',
    mode: 'popup-screenshot-pro',
    prepare: async () => {},
  },
  {
    filename: 'small-promo-marketing-440x280.jpg',
    pagePath: 'popup.html',
    width: 440,
    height: 280,
    title: '瀏覽中快速記錄重點',
    subtitle: '開啟即寫、標籤整理、搜尋回查',
    mode: 'small-promo-pro',
    prepare: async () => {},
  },
  {
    filename: 'small-promo-marketing-bright-440x280.jpg',
    pagePath: 'popup.html',
    width: 440,
    height: 280,
    title: '瀏覽時快速做筆記',
    subtitle: '標籤整理、關鍵字搜尋、重點不遺漏',
    mode: 'small-promo-bright',
    prepare: async () => {},
  },
  {
    filename: 'small-promo-marketing-mono-440x280.jpg',
    pagePath: 'popup.html',
    width: 440,
    height: 280,
    title: '聚焦重點，立即記錄',
    subtitle: 'Minimal monochrome style',
    mode: 'small-promo-mono',
    prepare: async () => {},
  },
  {
    filename: 'marquee-promo-marketing-1400x560.jpg',
    pagePath: 'window.html',
    width: 1400,
    height: 560,
    title: '輕筆記：你的瀏覽器第二大腦',
    subtitle: '快速記錄、標籤檢索、分欄編輯，一次完成',
    mode: 'marquee-pro',
    prepare: async () => {},
  },
  {
    filename: 'marquee-promo-marketing-bright-1400x560.jpg',
    pagePath: 'window.html',
    width: 1400,
    height: 560,
    title: '輕筆記：邊瀏覽邊記錄',
    subtitle: '支援側邊欄、彈出與獨立視窗，搜尋與標籤快速整理',
    mode: 'marquee-bright',
    prepare: async () => {},
  },
  {
    filename: 'marquee-promo-marketing-mono-1400x560.jpg',
    pagePath: 'window.html',
    width: 1400,
    height: 560,
    title: '輕筆記：極簡高對比',
    subtitle: '黑白視覺，聚焦內容與速度',
    mode: 'marquee-mono',
    prepare: async () => {},
  },
];

const noteTitles = sampleNotes.map((note) => note.title);

function toDataUrl(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function ensureExtensionBuild() {
  try {
    await fs.access(path.join(extensionDir, 'manifest.json'));
  } catch {
    throw new Error('找不到 dist/manifest.json，請先執行 npm run build');
  }
}

async function prepareOutputDirectory() {
  await fs.mkdir(outputDir, { recursive: true });
  const files = await fs.readdir(outputDir);
  await Promise.all(
    files
      .filter((file) => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
      .map((file) => fs.rm(path.join(outputDir, file), { force: true }))
  );
}

async function seedStorage(serviceWorker) {
  await serviceWorker.evaluate(
    async ({ notes, settings }) => {
      await chrome.storage.local.set({ notes });
      await chrome.storage.sync.set({ settings });
    },
    { notes: sampleNotes, settings: sampleSettings }
  );
}

async function waitForNotesVisible(page) {
  await page.waitForFunction(
    (titles) => titles.some((title) => document.body.innerText.includes(title)),
    noteTitles,
    { timeout: 6000 }
  );
}

async function injectMarketingOverlay(page, { title, subtitle, mode }) {
  await page.evaluate(({ titleText, subtitleText, variant }) => {
    const existing = document.getElementById('__marketing_overlay__');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = '__marketing_overlay_style__';
    style.textContent = `
      #__marketing_overlay__ {
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
        font-family: "Avenir Next", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        color: #0f172a;
      }
      #__marketing_overlay__ .bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.85);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
        background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(231,246,255,0.94) 100%);
        backdrop-filter: blur(4px);
      }
      #__marketing_overlay__ .tag {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 700;
        border-radius: 999px;
        background: #0ea5e9;
        color: #ffffff;
        letter-spacing: 0.2px;
      }
      #__marketing_overlay__ .title {
        margin: 0;
        font-size: 24px;
        font-weight: 800;
        line-height: 1.1;
      }
      #__marketing_overlay__ .subtitle {
        margin: 4px 0 0;
        font-size: 14px;
        color: #334155;
        font-weight: 500;
      }
      #__marketing_overlay__.wide {
        top: 14px;
        left: 14px;
        max-width: min(720px, calc(100vw - 28px));
      }
      #__marketing_overlay__.compact {
        top: 10px;
        left: 10px;
        max-width: min(360px, calc(100vw - 20px));
      }
      #__marketing_overlay__.compact .bar {
        padding: 8px 10px;
        gap: 8px;
      }
      #__marketing_overlay__.compact .title {
        font-size: 16px;
      }
      #__marketing_overlay__.compact .subtitle {
        margin-top: 2px;
        font-size: 11px;
      }
      #__marketing_overlay__.compact .tag {
        padding: 3px 7px;
        font-size: 10px;
      }
    `;

    const oldStyle = document.getElementById('__marketing_overlay_style__');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = '__marketing_overlay__';
    container.className = variant;
    container.innerHTML = `
      <div class="bar">
        <span class="tag">輕筆記</span>
        <div>
          <h1 class="title">${titleText}</h1>
          <p class="subtitle">${subtitleText}</p>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }, { titleText: title, subtitleText: subtitle, variant: mode });
}

function buildProfessionalSmallPromoHtml({ title, subtitle, popupShot, iconShot }) {
  return `
  <!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 440px;
        height: 280px;
        overflow: hidden;
        font-family: "Avenir Next", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        background: radial-gradient(550px 260px at -15% -30%, #4dd3ff 0%, #0b4ea2 52%, #071f4d 100%);
      }
      .canvas {
        width: 100%;
        height: 100%;
        position: relative;
        padding: 18px 18px 16px;
      }
      .glow {
        position: absolute;
        border-radius: 999px;
        opacity: 0.28;
        filter: blur(3px);
        pointer-events: none;
      }
      .glow.top {
        width: 180px;
        height: 180px;
        top: -80px;
        right: -35px;
        background: #38bdf8;
      }
      .glow.bottom {
        width: 220px;
        height: 220px;
        left: -100px;
        bottom: -120px;
        background: #22d3ee;
      }
      .brand {
        position: relative;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 10px 5px 6px;
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(8px);
        color: #f8fafc;
        font-size: 12px;
        font-weight: 700;
      }
      .brand img {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        display: block;
      }
      .title {
        position: relative;
        z-index: 2;
        margin: 12px 0 0;
        color: #ffffff;
        font-size: 36px;
        line-height: 1.04;
        font-weight: 850;
        letter-spacing: 0.2px;
      }
      .subtitle {
        position: relative;
        z-index: 2;
        margin: 8px 0 0;
        color: rgba(226, 232, 240, 0.95);
        font-size: 14px;
        line-height: 1.28;
        max-width: 200px;
        font-weight: 560;
      }
      .chip-row {
        position: relative;
        z-index: 2;
        margin-top: 10px;
        display: flex;
        gap: 7px;
      }
      .chip {
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background: rgba(255, 255, 255, 0.1);
        color: #dbeafe;
        font-size: 11px;
        font-weight: 620;
      }
      .device {
        position: absolute;
        right: 16px;
        bottom: 15px;
        width: 230px;
        height: 146px;
        z-index: 2;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.42);
        background: rgba(15, 23, 42, 0.22);
        backdrop-filter: blur(6px);
        box-shadow: 0 18px 34px rgba(2, 8, 23, 0.35);
        padding: 6px;
      }
      .device .screen {
        width: 100%;
        height: 100%;
        border-radius: 10px;
        overflow: hidden;
        background: #f8fafc;
      }
      .device img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .shine {
        position: absolute;
        inset: 0;
        border-radius: 14px;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 55%);
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="glow top"></div>
      <div class="glow bottom"></div>

      <div class="brand">
        <img src="${iconShot}" alt="logo" />
        <span>瀏覽器擴充功能</span>
      </div>

      <h1 class="title">輕筆記</h1>
      <p class="subtitle">${title}<br/>${subtitle}</p>

      <div class="chip-row">
        <span class="chip">快速搜尋</span>
        <span class="chip">標籤管理</span>
      </div>

      <div class="device">
        <div class="screen">
          <img src="${popupShot}" alt="popup preview" />
        </div>
        <div class="shine"></div>
      </div>
    </div>
  </body>
  </html>
  `;
}

function buildBrightSmallPromoHtml({ title, subtitle, popupShot, iconShot }) {
  return `
  <!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 440px;
        height: 280px;
        overflow: hidden;
        font-family: "Avenir Next", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        background:
          radial-gradient(380px 220px at 90% 10%, rgba(56, 189, 248, 0.24), transparent 60%),
          linear-gradient(130deg, #f8fbff 0%, #edf4ff 50%, #e6f6ff 100%);
        color: #0f172a;
      }
      .canvas {
        width: 100%;
        height: 100%;
        position: relative;
        padding: 16px 16px 14px;
      }
      .brand {
        position: relative;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 10px 5px 6px;
        border: 1px solid rgba(14, 116, 144, 0.2);
        border-radius: 999px;
        background: #ffffff;
        color: #0369a1;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 8px 20px rgba(14, 116, 144, 0.12);
      }
      .brand img { width: 20px; height: 20px; border-radius: 6px; display: block; }
      .title {
        position: relative;
        z-index: 2;
        margin: 12px 0 0;
        color: #0f172a;
        font-size: 34px;
        line-height: 1.04;
        font-weight: 850;
      }
      .subtitle {
        position: relative;
        z-index: 2;
        margin: 8px 0 0;
        color: #334155;
        font-size: 14px;
        line-height: 1.28;
        max-width: 200px;
        font-weight: 560;
      }
      .chip-row {
        position: relative;
        z-index: 2;
        margin-top: 10px;
        display: flex;
        gap: 7px;
      }
      .chip {
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid rgba(59, 130, 246, 0.28);
        background: #ffffff;
        color: #1d4ed8;
        font-size: 11px;
        font-weight: 620;
      }
      .device {
        position: absolute;
        right: 14px;
        bottom: 14px;
        width: 230px;
        height: 146px;
        z-index: 2;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: rgba(255, 255, 255, 0.84);
        box-shadow: 0 16px 28px rgba(15, 23, 42, 0.16);
        padding: 6px;
      }
      .device .screen {
        width: 100%;
        height: 100%;
        border-radius: 10px;
        overflow: hidden;
        background: #f8fafc;
      }
      .device img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .shine {
        position: absolute;
        inset: 0;
        border-radius: 14px;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 55%);
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="brand">
        <img src="${iconShot}" alt="logo" />
        <span>Chrome Extension</span>
      </div>
      <h1 class="title">輕筆記</h1>
      <p class="subtitle">${title}<br/>${subtitle}</p>
      <div class="chip-row">
        <span class="chip">快速搜尋</span>
        <span class="chip">標籤管理</span>
      </div>
      <div class="device">
        <div class="screen">
          <img src="${popupShot}" alt="popup preview" />
        </div>
        <div class="shine"></div>
      </div>
    </div>
  </body>
  </html>
  `;
}

function buildMonoSmallPromoHtml({ title, subtitle, popupShot, iconShot }) {
  return `
  <!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 440px;
        height: 280px;
        overflow: hidden;
        font-family: "Avenir Next", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        color: #ffffff;
      }
      .canvas {
        width: 100%;
        height: 100%;
        position: relative;
        padding: 16px;
      }
      .brand {
        position: relative;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 10px 5px 6px;
        border: 1px solid rgba(255, 255, 255, 0.45);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
      }
      .brand img { width: 20px; height: 20px; border-radius: 6px; display: block; filter: grayscale(1) contrast(1.2); }
      .title {
        position: relative;
        z-index: 2;
        margin: 12px 0 0;
        color: #ffffff;
        font-size: 34px;
        line-height: 1.04;
        font-weight: 860;
      }
      .subtitle {
        position: relative;
        z-index: 2;
        margin: 8px 0 0;
        color: #d4d4d4;
        font-size: 14px;
        line-height: 1.28;
        max-width: 200px;
        font-weight: 560;
      }
      .chip-row {
        position: relative;
        z-index: 2;
        margin-top: 10px;
        display: flex;
        gap: 7px;
      }
      .chip {
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.42);
        background: rgba(255, 255, 255, 0.08);
        color: #f5f5f5;
        font-size: 11px;
        font-weight: 620;
      }
      .device {
        position: absolute;
        right: 14px;
        bottom: 14px;
        width: 230px;
        height: 146px;
        z-index: 2;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.35);
        background: rgba(255, 255, 255, 0.06);
        box-shadow: 0 16px 28px rgba(0, 0, 0, 0.42);
        padding: 6px;
      }
      .device .screen {
        width: 100%;
        height: 100%;
        border-radius: 10px;
        overflow: hidden;
        background: #ffffff;
      }
      .device img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        filter: grayscale(1) contrast(1.15);
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="brand">
        <img src="${iconShot}" alt="logo" />
        <span>Chrome Extension</span>
      </div>
      <h1 class="title">輕筆記</h1>
      <p class="subtitle">${title}<br/>${subtitle}</p>
      <div class="chip-row">
        <span class="chip">快速搜尋</span>
        <span class="chip">標籤管理</span>
      </div>
      <div class="device">
        <div class="screen">
          <img src="${popupShot}" alt="popup preview" />
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

function buildProfessionalMarqueePromoHtml({
  title,
  subtitle,
  windowShot,
  popupShot,
  iconShot,
}) {
  return `
  <!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1400px;
        height: 560px;
        overflow: hidden;
        font-family: "Avenir Next", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        background:
          radial-gradient(640px 320px at 85% -10%, rgba(56, 189, 248, 0.25), transparent 62%),
          radial-gradient(420px 260px at -12% 110%, rgba(45, 212, 191, 0.2), transparent 58%),
          linear-gradient(125deg, #0b1736 0%, #102b63 52%, #0a204e 100%);
      }
      .canvas {
        width: 100%;
        height: 100%;
        position: relative;
        padding: 28px 30px;
        display: grid;
        grid-template-columns: 0.9fr 1.1fr;
        gap: 22px;
      }
      .left {
        position: relative;
        z-index: 2;
        padding: 12px 4px 12px 2px;
        color: #f8fafc;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px 8px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.28);
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(8px);
      }
      .brand img {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        display: block;
      }
      .brand span {
        font-size: 14px;
        font-weight: 700;
        color: #e2e8f0;
        letter-spacing: 0.2px;
      }
      .title {
        margin: 18px 0 0;
        font-size: 66px;
        line-height: 0.98;
        font-weight: 860;
        letter-spacing: 0.4px;
        color: #ffffff;
        text-wrap: balance;
      }
      .subtitle {
        margin: 16px 0 0;
        font-size: 26px;
        line-height: 1.24;
        color: #dbeafe;
        max-width: 560px;
        font-weight: 560;
      }
      .chips {
        margin-top: 22px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .chip {
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.28);
        background: rgba(255, 255, 255, 0.1);
        color: #e0f2fe;
        font-size: 14px;
        font-weight: 650;
      }
      .right {
        position: relative;
        z-index: 2;
      }
      .device-main {
        position: absolute;
        right: 0;
        top: 8px;
        width: 840px;
        height: 516px;
        padding: 11px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.28);
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(8px);
        box-shadow: 0 24px 42px rgba(2, 8, 23, 0.36);
      }
      .device-main .screen,
      .device-sub .screen {
        width: 100%;
        height: 100%;
        border-radius: 13px;
        overflow: hidden;
        background: #e2e8f0;
      }
      .device-main img,
      .device-sub img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .device-sub {
        position: absolute;
        left: 8px;
        bottom: 14px;
        width: 300px;
        height: 188px;
        padding: 8px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(15, 23, 42, 0.22);
        backdrop-filter: blur(7px);
        box-shadow: 0 18px 34px rgba(2, 8, 23, 0.34);
      }
      .shine {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 56%);
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <section class="left">
        <div class="brand">
          <img src="${iconShot}" alt="logo" />
          <span>Chrome Extension</span>
        </div>
        <h1 class="title">${title}</h1>
        <p class="subtitle">${subtitle}</p>
        <div class="chips">
          <span class="chip">快速搜尋</span>
          <span class="chip">標籤管理</span>
          <span class="chip">Markdown 編輯</span>
        </div>
      </section>

      <section class="right">
        <div class="device-main">
          <div class="screen">
            <img src="${windowShot}" alt="window preview" />
          </div>
          <div class="shine"></div>
        </div>

        <div class="device-sub">
          <div class="screen">
            <img src="${popupShot}" alt="popup preview" />
          </div>
          <div class="shine"></div>
        </div>
      </section>
    </div>
  </body>
  </html>
  `;
}

function buildBrightMarqueePromoHtml({
  title,
  subtitle,
  windowShot,
  popupShot,
  iconShot,
}) {
  return `
  <!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1400px;
        height: 560px;
        overflow: hidden;
        font-family: "Avenir Next", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        background:
          radial-gradient(620px 280px at 92% 0%, rgba(14, 165, 233, 0.15), transparent 62%),
          radial-gradient(460px 240px at 0% 100%, rgba(99, 102, 241, 0.12), transparent 58%),
          linear-gradient(130deg, #f8fbff 0%, #eef5ff 54%, #e8f2ff 100%);
        color: #0f172a;
      }
      .canvas {
        width: 100%;
        height: 100%;
        position: relative;
        padding: 26px 30px;
        display: grid;
        grid-template-columns: 0.92fr 1.08fr;
        gap: 22px;
      }
      .left {
        position: relative;
        z-index: 2;
        padding: 14px 4px 12px 2px;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px 8px 8px;
        border-radius: 999px;
        border: 1px solid rgba(59, 130, 246, 0.24);
        background: #ffffff;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
      }
      .brand img {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        display: block;
      }
      .brand span {
        font-size: 14px;
        font-weight: 700;
        color: #0369a1;
      }
      .title {
        margin: 18px 0 0;
        font-size: 54px;
        line-height: 1.06;
        font-weight: 860;
        letter-spacing: 0.15px;
        color: #0f172a;
        max-width: 560px;
        overflow-wrap: anywhere;
      }
      .subtitle {
        margin: 14px 0 0;
        font-size: 21px;
        line-height: 1.3;
        color: #334155;
        max-width: 540px;
        font-weight: 560;
        overflow-wrap: anywhere;
      }
      .chips {
        margin-top: 22px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .chip {
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(59, 130, 246, 0.25);
        background: #ffffff;
        color: #1d4ed8;
        font-size: 14px;
        font-weight: 650;
      }
      .right {
        position: relative;
        z-index: 2;
      }
      .device-main {
        position: absolute;
        right: 0;
        top: 8px;
        width: 808px;
        height: 516px;
        padding: 11px;
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: rgba(255, 255, 255, 0.86);
        box-shadow: 0 22px 38px rgba(15, 23, 42, 0.16);
      }
      .device-main .screen,
      .device-sub .screen {
        width: 100%;
        height: 100%;
        border-radius: 13px;
        overflow: hidden;
        background: #e2e8f0;
      }
      .device-main img,
      .device-sub img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .device-sub {
        position: absolute;
        left: 8px;
        bottom: 14px;
        width: 300px;
        height: 188px;
        padding: 8px;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 16px 30px rgba(15, 23, 42, 0.14);
      }
      .shine {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 56%);
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <section class="left">
        <div class="brand">
          <img src="${iconShot}" alt="logo" />
          <span>Chrome Extension</span>
        </div>
        <h1 class="title">${title}</h1>
        <p class="subtitle">${subtitle}</p>
        <div class="chips">
          <span class="chip">快速搜尋</span>
          <span class="chip">標籤管理</span>
          <span class="chip">格式編輯</span>
        </div>
      </section>

      <section class="right">
        <div class="device-main">
          <div class="screen">
            <img src="${windowShot}" alt="window preview" />
          </div>
          <div class="shine"></div>
        </div>
        <div class="device-sub">
          <div class="screen">
            <img src="${popupShot}" alt="popup preview" />
          </div>
          <div class="shine"></div>
        </div>
      </section>
    </div>
  </body>
  </html>
  `;
}

function buildMonoMarqueePromoHtml({
  title,
  subtitle,
  windowShot,
  popupShot,
  iconShot,
}) {
  return `
  <!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1400px;
        height: 560px;
        overflow: hidden;
        font-family: "Avenir Next", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        background: linear-gradient(135deg, #000000 0%, #151515 100%);
        color: #ffffff;
      }
      .canvas {
        width: 100%;
        height: 100%;
        position: relative;
        padding: 26px 30px;
        display: grid;
        grid-template-columns: 0.88fr 1.12fr;
        gap: 22px;
      }
      .left {
        position: relative;
        z-index: 2;
        padding: 14px 4px 12px 2px;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px 8px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.48);
        background: rgba(255, 255, 255, 0.07);
      }
      .brand img {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        display: block;
        filter: grayscale(1) contrast(1.2);
      }
      .brand span {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
      }
      .title {
        margin: 18px 0 0;
        font-size: 56px;
        line-height: 1;
        font-weight: 860;
        letter-spacing: 0.3px;
        color: #ffffff;
      }
      .subtitle {
        margin: 16px 0 0;
        font-size: 24px;
        line-height: 1.24;
        color: #e5e5e5;
        max-width: 560px;
        font-weight: 560;
      }
      .chips {
        margin-top: 22px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .chip {
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.08);
        color: #f5f5f5;
        font-size: 14px;
        font-weight: 650;
      }
      .right {
        position: relative;
        z-index: 2;
      }
      .device-main {
        position: absolute;
        right: 0;
        top: 8px;
        width: 840px;
        height: 516px;
        padding: 11px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.42);
        background: rgba(255, 255, 255, 0.07);
        box-shadow: 0 22px 38px rgba(0, 0, 0, 0.36);
      }
      .device-main .screen,
      .device-sub .screen {
        width: 100%;
        height: 100%;
        border-radius: 13px;
        overflow: hidden;
        background: #ffffff;
      }
      .device-main img,
      .device-sub img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        filter: grayscale(1) contrast(1.18);
      }
      .device-sub {
        position: absolute;
        left: 8px;
        bottom: 14px;
        width: 300px;
        height: 188px;
        padding: 8px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.45);
        background: rgba(255, 255, 255, 0.09);
        box-shadow: 0 16px 30px rgba(0, 0, 0, 0.35);
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <section class="left">
        <div class="brand">
          <img src="${iconShot}" alt="logo" />
          <span>Chrome Extension</span>
        </div>
        <h1 class="title">${title}</h1>
        <p class="subtitle">${subtitle}</p>
        <div class="chips">
          <span class="chip">快速搜尋</span>
          <span class="chip">標籤管理</span>
          <span class="chip">Markdown 編輯</span>
        </div>
      </section>

      <section class="right">
        <div class="device-main">
          <div class="screen">
            <img src="${windowShot}" alt="window preview" />
          </div>
        </div>
        <div class="device-sub">
          <div class="screen">
            <img src="${popupShot}" alt="popup preview" />
          </div>
        </div>
      </section>
    </div>
  </body>
  </html>
  `;
}

function buildPopupScreenshotHeroHtml({ title, subtitle, popupShot, iconShot }) {
  return `
  <!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 640px;
        height: 400px;
        overflow: hidden;
        font-family: "Avenir Next", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
        background:
          radial-gradient(440px 240px at 86% -10%, rgba(56, 189, 248, 0.28), transparent 62%),
          radial-gradient(300px 220px at -10% 95%, rgba(20, 184, 166, 0.2), transparent 60%),
          linear-gradient(125deg, #eef6ff 0%, #e7f0ff 48%, #daeafe 100%);
        color: #0f172a;
      }
      .canvas {
        width: 100%;
        height: 100%;
        position: relative;
        display: grid;
        grid-template-columns: 0.88fr 1.12fr;
        padding: 18px;
        gap: 14px;
      }
      .copy {
        position: relative;
        z-index: 2;
        padding: 4px 0;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 11px 6px 7px;
        border-radius: 999px;
        border: 1px solid rgba(59, 130, 246, 0.26);
        background: rgba(255, 255, 255, 0.86);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
      }
      .brand img {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        display: block;
      }
      .brand span {
        font-size: 12px;
        font-weight: 700;
        color: #0369a1;
      }
      .title {
        margin: 14px 0 0;
        font-size: 40px;
        line-height: 1.02;
        font-weight: 860;
        color: #0f172a;
      }
      .subtitle {
        margin: 10px 0 0;
        font-size: 16px;
        line-height: 1.3;
        color: #334155;
        font-weight: 560;
        max-width: 250px;
      }
      .chips {
        margin-top: 14px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .chip {
        padding: 5px 9px;
        border-radius: 999px;
        border: 1px solid rgba(59, 130, 246, 0.28);
        background: rgba(255, 255, 255, 0.88);
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 620;
      }
      .device {
        position: relative;
        z-index: 2;
        height: 100%;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 16px 30px rgba(15, 23, 42, 0.14);
        padding: 8px;
      }
      .screen {
        width: 100%;
        height: 100%;
        border-radius: 10px;
        overflow: hidden;
        background: #f8fafc;
      }
      .screen img {
        width: 100%;
        height: 100%;
        object-fit: fill;
        display: block;
      }
      .shine {
        position: absolute;
        inset: 0;
        border-radius: 16px;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 56%);
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <section class="copy">
        <div class="brand">
          <img src="${iconShot}" alt="logo" />
          <span>Chrome Extension</span>
        </div>
        <h1 class="title">輕筆記</h1>
        <p class="subtitle">${title}<br/>${subtitle}</p>
        <div class="chips">
          <span class="chip">快速搜尋</span>
          <span class="chip">標籤管理</span>
          <span class="chip">即開即寫</span>
        </div>
      </section>
      <section class="device">
        <div class="screen">
          <img src="${popupShot}" alt="popup preview" />
        </div>
        <div class="shine"></div>
      </section>
    </div>
  </body>
  </html>
  `;
}

async function captureProfessionalSmallPromo(context, extensionId, job) {
  const sourcePage = await context.newPage();
  await sourcePage.setViewportSize({ width: 640, height: 400 });
  await sourcePage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'networkidle' });
  await waitForNotesVisible(sourcePage);
  await sourcePage.waitForTimeout(180);
  const popupBuffer = await sourcePage.screenshot({ type: 'jpeg', quality: 100 });
  await sourcePage.close();

  const iconBuffer = await fs.readFile(path.join(extensionDir, 'icons', 'icon128.png'));
  const popupShot = toDataUrl(popupBuffer, 'image/jpeg');
  const iconShot = toDataUrl(iconBuffer, 'image/png');

  const renderPage = await context.newPage();
  await renderPage.setViewportSize({ width: job.width, height: job.height });
  let html = buildProfessionalSmallPromoHtml({
    title: job.title,
    subtitle: job.subtitle,
    popupShot,
    iconShot,
  });
  if (job.mode === 'small-promo-bright') {
    html = buildBrightSmallPromoHtml({
      title: job.title,
      subtitle: job.subtitle,
      popupShot,
      iconShot,
    });
  } else if (job.mode === 'small-promo-mono') {
    html = buildMonoSmallPromoHtml({
      title: job.title,
      subtitle: job.subtitle,
      popupShot,
      iconShot,
    });
  }
  await renderPage.setContent(
    html,
    { waitUntil: 'domcontentloaded' }
  );
  await renderPage.waitForTimeout(100);
  await renderPage.screenshot({
    path: path.join(outputDir, job.filename),
    type: 'jpeg',
    quality: 100,
  });
  await renderPage.close();
}

async function captureProfessionalMarqueePromo(context, extensionId, job) {
  const windowPage = await context.newPage();
  await windowPage.setViewportSize({ width: 1400, height: 560 });
  await windowPage.goto(`chrome-extension://${extensionId}/window.html`, { waitUntil: 'networkidle' });
  await waitForNotesVisible(windowPage);
  await windowPage.getByText('產品發佈清單').first().click();
  await windowPage.waitForTimeout(220);
  const windowBuffer = await windowPage.screenshot({ type: 'jpeg', quality: 100 });
  await windowPage.close();

  const popupPage = await context.newPage();
  await popupPage.setViewportSize({ width: 640, height: 400 });
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'networkidle' });
  await waitForNotesVisible(popupPage);
  await popupPage.waitForTimeout(180);
  const popupBuffer = await popupPage.screenshot({ type: 'jpeg', quality: 100 });
  await popupPage.close();

  const iconBuffer = await fs.readFile(path.join(extensionDir, 'icons', 'icon128.png'));
  const windowShot = toDataUrl(windowBuffer, 'image/jpeg');
  const popupShot = toDataUrl(popupBuffer, 'image/jpeg');
  const iconShot = toDataUrl(iconBuffer, 'image/png');

  const renderPage = await context.newPage();
  await renderPage.setViewportSize({ width: job.width, height: job.height });
  let html = buildProfessionalMarqueePromoHtml({
    title: job.title,
    subtitle: job.subtitle,
    windowShot,
    popupShot,
    iconShot,
  });
  if (job.mode === 'marquee-bright') {
    html = buildBrightMarqueePromoHtml({
      title: job.title,
      subtitle: job.subtitle,
      windowShot,
      popupShot,
      iconShot,
    });
  } else if (job.mode === 'marquee-mono') {
    html = buildMonoMarqueePromoHtml({
      title: job.title,
      subtitle: job.subtitle,
      windowShot,
      popupShot,
      iconShot,
    });
  }
  await renderPage.setContent(
    html,
    { waitUntil: 'domcontentloaded' }
  );
  await renderPage.waitForTimeout(120);
  await renderPage.screenshot({
    path: path.join(outputDir, job.filename),
    type: 'jpeg',
    quality: 100,
  });
  await renderPage.close();
}

async function capturePopupScreenshotPromo(context, extensionId, job) {
  const popupPage = await context.newPage();
  await popupPage.setViewportSize({ width: 320, height: 400 });
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'networkidle' });
  await waitForNotesVisible(popupPage);
  await popupPage.waitForTimeout(180);
  const popupBuffer = await popupPage.screenshot({ type: 'jpeg', quality: 100 });
  await popupPage.close();

  const iconBuffer = await fs.readFile(path.join(extensionDir, 'icons', 'icon128.png'));
  const popupShot = toDataUrl(popupBuffer, 'image/jpeg');
  const iconShot = toDataUrl(iconBuffer, 'image/png');

  const renderPage = await context.newPage();
  await renderPage.setViewportSize({ width: job.width, height: job.height });
  await renderPage.setContent(
    buildPopupScreenshotHeroHtml({
      title: job.title,
      subtitle: job.subtitle,
      popupShot,
      iconShot,
    }),
    { waitUntil: 'domcontentloaded' }
  );
  await renderPage.waitForTimeout(120);
  await renderPage.screenshot({
    path: path.join(outputDir, job.filename),
    type: 'jpeg',
    quality: 100,
  });
  await renderPage.close();
}

async function captureJob(context, extensionId, job) {
  if (job.mode === 'popup-screenshot-pro') {
    await capturePopupScreenshotPromo(context, extensionId, job);
    return;
  }
  if (job.mode.startsWith('small-promo-')) {
    await captureProfessionalSmallPromo(context, extensionId, job);
    return;
  }
  if (job.mode.startsWith('marquee-')) {
    await captureProfessionalMarqueePromo(context, extensionId, job);
    return;
  }

  const page = await context.newPage();
  await page.setViewportSize({ width: job.width, height: job.height });
  await page.goto(`chrome-extension://${extensionId}/${job.pagePath}`, { waitUntil: 'networkidle' });
  await waitForNotesVisible(page);
  await job.prepare(page);
  if (!job.skipPostVisibilityCheck) {
    await waitForNotesVisible(page);
  }
  await injectMarketingOverlay(page, { title: job.title, subtitle: job.subtitle, mode: job.mode });
  await page.waitForTimeout(180);

  await page.screenshot({
    path: path.join(outputDir, job.filename),
    type: 'jpeg',
    quality: 100,
  });

  await page.close();
}

async function main() {
  await ensureExtensionBuild();
  await prepareOutputDirectory();
  await fs.rm(userDataDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(userDataDir), { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
    ],
  });

  try {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }

    const extensionId = new URL(serviceWorker.url()).host;
    await seedStorage(serviceWorker);

    for (const job of shotJobs) {
      await captureJob(context, extensionId, job);
      console.log(`已輸出：${job.filename}`);
    }

    console.log(`\n完成，行銷版素材位於：${outputDir}`);
  } finally {
    await context.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
