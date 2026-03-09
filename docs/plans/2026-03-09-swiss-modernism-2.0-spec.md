# 瑞士現代主義 2.0 文件設計規格（Docs Design Spec）

- 版本：`v1.0`
- 更新日期：`2026-03-09`
- 適用範圍：`docs/*.html` 文件站頁面（例如 `index.html`、`user-manual.html`）
- 設計目標：在高資訊密度下維持清晰層級、可掃讀性與一致品牌感

## 1. 設計原則

1. `Grid-first`：先建立網格，再放內容。
2. `Typography as hierarchy`：以字重、字距、字級建立資訊層次，不依賴過度裝飾。
3. `Neutral base + accent`：中性底色搭配單一高彩度 CTA 色，避免色彩競爭。
4. `Hard-edge framing`：以 1px 邊框與幾何切分建立瑞士風格秩序。
5. `Readable density`：高資訊量區塊必須維持可掃描與明確分區。

## 2. Design Tokens（必須遵循）

以下 Token 為目前文件系統標準值，新增頁面必須沿用。

### 2.1 色彩

```css
:root {
  --bg: #fafafa;
  --surface: #ffffff;
  --line: #d4d4d8;
  --text: #09090b;
  --muted: #3f3f46;
  --cta: #ec4899;
  --ink: #18181b;
  --max: 1180px;
}
```

說明：
- `--bg` / `--surface`：建立低對比背景分層。
- `--line`：所有框線、表格分隔、卡片邊界統一色。
- `--cta`：主要行動按鈕唯一高彩度顏色。
- `--ink`：深色底與高權重文字使用。

### 2.2 字體與字重

- 主字體：`Inter, sans-serif`
- 建議字重：`400 / 500 / 600 / 700 / 800`
- 標題字距：負字距（`-0.02em` 到 `-0.03em`）
- Kicker / Label：大寫 + 正字距（`0.04em` 到 `0.08em`）

### 2.3 間距系統

- 外層頁面內距：`1rem`（mobile 可降為 `0.65rem`）
- 區塊間距：`1rem`
- 內容區塊內距：`1.2rem 1.25rem`
- 內文元件間距：`0.55rem` 到 `1rem`

## 3. 版面系統

### 3.1 容器

- 主容器寬度：`width: min(var(--max), 100%)`
- 所有主區塊需有 `.frame` 邊框包覆。

### 3.2 網格

- 基礎網格：12 欄（`repeat(12, minmax(0, 1fr))`）
- 標準欄距：`1rem`
- Hero 推薦切法：
  - 主要文案：`1 / 9`
  - 補充資訊卡：`9 / 13`

### 3.3 RWD 斷點

- `<=1024px`：Hero 改單欄、CTA 改堆疊
- `<=768px`：全面縮小區塊內距
- `<=480px`：卡片類內容改滿欄

## 4. 元件規格

### 4.1 Frame

```css
.frame {
  border: 1px solid var(--line);
  background: var(--surface);
}
```

規則：
- 所有一級區塊（Hero、Section、CTA、Footer）必須有 `frame`。

### 4.2 按鈕

- 基礎按鈕：細邊框、大寫、字距、輕微 hover 位移（`translateY(-1px)`）
- 主按鈕：`--cta` 底色
- 次按鈕：白底 + 深色字

禁止：
- 禁止使用圓角膠囊、重陰影玻璃風、emoji 當主要 icon。

### 4.3 Meta Card / Info Card

- 必須使用 `1px` 邊框
- 上方 Label 使用小字 + 大寫 + 字距
- 內容值使用較高字重（`600`）

### 4.4 表格與規則區塊

- 表格邊界與儲存格統一 `1px solid var(--line)`
- 表頭背景需與內容列產生輕微反差（例如灰階淺底）
- 不可省略欄位名稱與單位

### 4.5 Callout

- 類型限定：`tip / warn / danger`
- 必須有色底 + 細邊框，不可只靠文字顏色辨識

## 5. 內容排版規範

### 5.1 文字層級

- `h1`：頁面唯一主標
- `h2`：章節層級
- `h3/h4`：子段落與操作步驟
- 長段落控制在 `54ch ~ 70ch`

### 5.2 文案語氣

- 使用「指令導向 + 場景導向」敘述
- 優先回答「先做什麼、再做什麼、遇錯怎麼辦」
- 盡量用可執行動詞：`開啟 / 點擊 / 切換 / 匯出 / 檢查`

### 5.3 清單與流程

- 操作流程使用有序清單 `ol`
- 規則與重點使用無序清單 `ul`
- 單項文字避免超過兩行

## 6. 互動與動效

- 預設僅保留必要互動：hover 位移、顏色過渡
- 過渡時長建議：`180ms`
- 必須支援 `prefers-reduced-motion: reduce`

## 7. 可近用性（A11y）

1. 所有互動元素需有可見 focus 樣式（`outline`）。
2. 文字與背景需保持足夠對比。
3. 目錄、區塊、表格需有語意化標記與標題。
4. 不可只用顏色傳達狀態（需加文字或結構提示）。

## 8. 實作對照（現有頁面）

- 基準頁：[docs/index.html](./index.html)
- 手冊頁：[docs/user-manual.html](./user-manual.html)

現況對照重點：
- `index.html`：作為首頁視覺基準、CTA 樣式與 Hero 網格基準。
- `user-manual.html`：同設計語言下的高資訊密度內容頁範例。

## 9. 驗收清單（Design QA Checklist）

發布前必須逐項確認：

1. 是否沿用標準 Token（色彩、字體、最大寬度）？
2. 是否使用 12 欄網格與一致邊框語彙？
3. 主次按鈕是否符合規範（含 hover/focus）？
4. 章節階層是否可快速掃讀（h1/h2/h3）？
5. RWD 於 1024 / 768 / 480 斷點是否維持可讀？
6. `prefers-reduced-motion` 是否有降動效？
7. 重要狀態是否非僅靠顏色表達？
8. 與既有頁面並排比對時，是否仍屬同一視覺家族？

## 10. 變更管理

- 若需新增 Token 或調整關鍵規範，必須同步更新：
  1. 本規格文件
  2. `docs/index.html`
  3. `docs/user-manual.html`
- 建議在 Commit 訊息加註：`docs-design-spec`，便於追蹤。
