import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const manifestPath = path.resolve('public/manifest.json')
const backgroundSourcePath = path.resolve('src/background/service-worker.ts')

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const backgroundSource = fs.readFileSync(backgroundSourcePath, 'utf8')

const usesModuleSyntax = /^\s*import\s/m.test(backgroundSource)

assert.ok(manifest.background, 'manifest 缺少 background 設定')

if (usesModuleSyntax) {
  assert.equal(
    manifest.background.type,
    'module',
    '背景腳本已使用 ES module import，但 public/manifest.json 未設定 background.type = "module"。這會讓 service worker 無法載入，進而導致 Popup 切換與獨立視窗訊息失效。'
  )
}

console.log('背景腳本與 manifest 設定一致。')
