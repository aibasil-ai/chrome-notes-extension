import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'

async function waitForExtensionServiceWorker(context) {
  const existingServiceWorker = context.serviceWorkers()[0]
  if (existingServiceWorker) {
    return existingServiceWorker
  }

  try {
    return await context.waitForEvent('serviceworker', { timeout: 5000 })
  } catch (error) {
    throw new Error(
      '擴充功能的 Manifest V3 service worker 未成功啟動。這通常代表 background 腳本沒有被正確載入，例如缺少 background.type = "module"。',
      { cause: error }
    )
  }
}

export async function createExtensionContext(options = {}) {
  const extensionPath = path.resolve(options.extensionPath ?? 'dist')
  const manifestPath = path.join(extensionPath, 'manifest.json')

  await fs.access(manifestPath)

  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chrome-notes-extension-e2e-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })

  const serviceWorker = await waitForExtensionServiceWorker(context)
  const extensionId = new URL(serviceWorker.url()).host

  assert.ok(extensionId, '無法從 service worker 取得 extension ID')

  return {
    context,
    extensionId,
    serviceWorker,
    async close() {
      await context.close()
      await fs.rm(userDataDir, { recursive: true, force: true })
    },
  }
}
