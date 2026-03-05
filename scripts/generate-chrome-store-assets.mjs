import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const rootDir = process.cwd();
const extensionDir = path.join(rootDir, 'dist');
const outputDir = path.join(rootDir, 'docs', 'chrome-web-store-assets', 'extension-playwright');
const userDataDir = path.join(rootDir, '.tmp', 'playwright-chrome-profile');

const now = Date.now();
const sampleNotes = [
  {
    id: 'note-001',
    title: '專案規劃清單',
    content: '## 本週目標\n\n- 完成功能驗收\n- 補齊文件\n- 安排上線時程',
    tags: ['工作', '規劃'],
    createdAt: now - 86400000 * 4,
    updatedAt: now - 86400000,
    editMode: 'markdown',
    pageContext: {
      url: 'https://example.com/planning',
      pageTitle: '專案規劃頁',
      capturedAt: now - 86400000,
    },
  },
  {
    id: 'note-002',
    title: '閱讀摘錄',
    content: '今天看到一個很好的想法：\n\n「把複雜流程拆成可驗證的小步驟。」',
    tags: ['學習', '摘錄'],
    createdAt: now - 86400000 * 2,
    updatedAt: now - 86400000 / 2,
    editMode: 'plain',
  },
  {
    id: 'note-003',
    title: '旅遊待辦',
    content: '- 訂機票\n- 訂住宿\n- 準備行程地圖',
    tags: ['生活', '旅遊'],
    createdAt: now - 86400000 * 7,
    updatedAt: now - 86400000 * 2,
    editMode: 'markdown',
  },
];

const sampleSettings = {
  defaultEditMode: 'markdown',
  autoSaveInterval: 3000,
  capturePageByDefault: false,
  theme: 'auto',
};

const captureJobs = [
  {
    filename: 'screenshot-01-window-overview-1280x800.jpg',
    pagePath: 'window.html',
    width: 1280,
    height: 800,
    prepare: async () => {},
  },
  {
    filename: 'screenshot-02-window-editor-1280x800.jpg',
    pagePath: 'window.html',
    width: 1280,
    height: 800,
    prepare: async (page) => {
      await page.getByText('專案規劃清單').first().click();
      await page.waitForTimeout(500);
    },
  },
  {
    filename: 'screenshot-03-window-settings-1280x800.jpg',
    pagePath: 'window.html',
    width: 1280,
    height: 800,
    prepare: async (page) => {
      await page.getByTitle('設定').first().click();
      await page.waitForTimeout(600);
    },
  },
  {
    filename: 'screenshot-04-sidebar-1280x800.jpg',
    pagePath: 'sidebar.html',
    width: 1280,
    height: 800,
    prepare: async () => {},
  },
  {
    filename: 'screenshot-05-popup-640x400.jpg',
    pagePath: 'popup.html',
    width: 640,
    height: 400,
    prepare: async () => {},
  },
  {
    filename: 'small-promo-440x280.jpg',
    pagePath: 'window.html',
    width: 440,
    height: 280,
    prepare: async (page) => {
      await page.getByText('專案規劃清單').first().click();
      await page.waitForTimeout(400);
    },
  },
  {
    filename: 'marquee-promo-1400x560.jpg',
    pagePath: 'window.html',
    width: 1400,
    height: 560,
    prepare: async (page) => {
      await page.getByText('專案規劃清單').first().click();
      await page.waitForTimeout(400);
    },
  },
];

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

async function captureImage(context, extensionId, job) {
  const page = await context.newPage();
  await page.setViewportSize({ width: job.width, height: job.height });
  await page.goto(`chrome-extension://${extensionId}/${job.pagePath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await job.prepare(page);
  await page.screenshot({
    path: path.join(outputDir, job.filename),
    type: 'jpeg',
    quality: 92,
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

    for (const job of captureJobs) {
      await captureImage(context, extensionId, job);
      console.log(`已輸出：${job.filename}`);
    }

    console.log(`\n完成，素材位於：${outputDir}`);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
