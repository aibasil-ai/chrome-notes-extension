import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createExtensionContext } from './helpers/extension-context.mjs'

test('popup 可載入且能開啟獨立視窗', async (t) => {
  const extensionPath = path.resolve(process.env.EXTENSION_DIR ?? 'dist')
  const manifestPath = path.join(extensionPath, 'manifest.json')

  assert.ok(fs.existsSync(manifestPath), `找不到 ${manifestPath}，請先執行建置`)

  const { context, extensionId, close } = await createExtensionContext({ extensionPath })
  t.after(close)

  const popupPage = await context.newPage()
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)

  await popupPage.getByText('輕筆記').waitFor()
  await popupPage.getByText('+ 新增筆記').waitFor()

  const windowPagePromise = context.waitForEvent('page')
  await popupPage.getByTitle('開啟獨立視窗模式').click()

  const windowPage = await windowPagePromise
  await windowPage.waitForLoadState('domcontentloaded')
  await windowPage.waitForURL(`chrome-extension://${extensionId}/window.html`)
  await windowPage.getByText('輕筆記').waitFor()
  await windowPage.getByText('+ 新增筆記').waitFor()
})
