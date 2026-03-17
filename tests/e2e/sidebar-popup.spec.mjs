import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createExtensionContext } from './helpers/extension-context.mjs'

async function getPanelBehavior(serviceWorker) {
  return await serviceWorker.evaluate(async () => {
    return await chrome.sidePanel.getPanelBehavior()
  })
}

async function waitForPanelBehavior(serviceWorker, expectedOpenPanelOnActionClick, timeout = 5000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeout) {
    const behavior = await getPanelBehavior(serviceWorker)
    if (behavior.openPanelOnActionClick === expectedOpenPanelOnActionClick) {
      return behavior
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`等待 openPanelOnActionClick = ${expectedOpenPanelOnActionClick} 超時`)
}

test('sidebar 可切回 Popup 模式', async (t) => {
  const extensionPath = path.resolve(process.env.EXTENSION_DIR ?? 'dist')
  const manifestPath = path.join(extensionPath, 'manifest.json')

  assert.ok(fs.existsSync(manifestPath), `找不到 ${manifestPath}，請先執行建置`)

  const { context, extensionId, serviceWorker, close } = await createExtensionContext({ extensionPath })
  t.after(close)

  await serviceWorker.evaluate(async () => {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  })

  const beforeSwitch = await getPanelBehavior(serviceWorker)
  assert.equal(beforeSwitch.openPanelOnActionClick, true)

  const sidebarPage = await context.newPage()
  await sidebarPage.goto(`chrome-extension://${extensionId}/sidebar.html`)

  assert.equal(await sidebarPage.title(), '輕筆記 - Sidebar')
  await sidebarPage.getByText('+ 新增筆記').waitFor()

  let dialogMessage = null
  const dialogHandled = new Promise((resolve) => {
    sidebarPage.once('dialog', async (dialog) => {
      dialogMessage = dialog.message()
      await dialog.accept()
      resolve()
    })
  })

  await sidebarPage.getByTitle('切換 Popup 模式').click({ force: true, noWaitAfter: true })
  await dialogHandled

  assert.equal(dialogMessage, '已切換！下次點擊擴充功能圖示將開啟 Popup 視窗')

  const afterSwitch = await waitForPanelBehavior(serviceWorker, false)
  assert.equal(afterSwitch.openPanelOnActionClick, false)
  assert.equal(sidebarPage.isClosed(), true)
})
