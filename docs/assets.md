# 美術素材設計與流程

定義所有素材的**種類、規格、命名、資料夾、與程式的對接方式**,以及用 PixelLab AI 生成的工作流程。目標:風格統一、尺寸一致、命名對得上資料(`skill.id` / `equipment.id` / `item.id`)。

> **視角:俯視角(top-down)(已確認)**。最適合 boss rush 彈幕閃避,sprite 成本最低(單朝向 + 水平翻轉)。
>
> **目標平台:網頁版 + 手機版**。跨平台尺寸策略見 [§8 解析度與跨平台](#8-解析度與跨平台網頁--手機)。

---

## 1. 風格指南(統一感的關鍵)

AI 生成最大的風險是**每張風格/色調不一致**。所有生成都套用同一套規範:

| 項目 | 規範 |
|---|---|
| 風格關鍵詞 | 固定一句 style prompt(如 `16-bit pixel art, top-down, bold outline, limited palette`)每次都帶 |
| 調色盤 | 固定一組共用 palette(約 16~32 色),避免每張顏色亂飄 |
| 外框 | 統一「有黑邊 / 無黑邊」 |
| 抗鋸齒 | **關閉**(像素藝術不要 anti-alias) |
| 視角 | 俯視角一致 |
| 種子 | 同一系列盡量沿用 seed,維持一致性 |

> 把這套規範存成一個固定 prompt 模板,之後每次生成只換主體描述。

### ✅ 已鎖定的風格參數(v1,風格驗證通過)

正式生成腳本一律沿用:

| 參數 | 值 |
|---|---|
| STYLE 文字 | `16-bit pixel art, limited cohesive palette` |
| `view` | `high top-down` |
| `outline` | `single color black outline` |
| `shading` | `basic shading` |
| `detail` | 角色 / sprite:`low detail`;場景 / tileset:`medium detail` |
| `text_guidance_scale` | 8(變體用負面詞時可到 9) |
| `no_background` | sprite / 角色 `true`;tileset / 場景 `false` |
| 一致性 | 基準角色 + `init_image`,strength ≈ 130(見下) |

### 比例一致性:基準角色 + init_image(已驗證)

各自獨立生成的角色**比例 / 頭身比 / 縮放會不一致**。解法:

1. 先生一個**基準角色**(例:男 idle),確認比例。
2. 其餘變體(另一性別、其他動作幀)用基準圖當 `init_image` 去生,繼承同樣比例與縮放。
3. 參數:`init_image_strength` 約 **130**(太高 ~250 會連長相一起複製;太低則比例跑掉),搭配強化主體描述 + `negative_description` 推開不要的特徵。

> 已驗證:女角以男角為 `init_image`(strength 130)生成,比例與男角一致且明顯為女性。此法套用到整套角色 / 動作以維持一致。

---

## 2. 像素規格

| 類別 | 尺寸(像素) | 備註 |
|---|---|---|
| 環境 tile | 32×32 | 地磚基本單位 |
| 玩家 / 普通敵人 | 32×32 | |
| 小 Boss | 64×64 | |
| 大 Boss | 96×96 或 128×128 | 最終戰魄力 |
| 投射物 sprite | 16×16 ~ 32×32 | 火球、冰錐等 |
| 技能卡圖示 | 48×48 | 抽選畫面用 |
| 裝備 / 道具圖示 | 32×32 或 48×48 | 背包 / 合成用 |
| UI 元件 | 視需求 | 按鈕、邊框、面板 |

- **格式**:PNG,透明背景,無抗鋸齒。
- **動畫**:同一動作輸出成**水平 strip**(每幀等寬),搭配 JSON 標注幀數與 fps。
- 這些尺寸是**原生像素**,以邏輯解析度 480×270 為基準設計;跨平台只縮放畫面、不改素材(見 [§8](#8-解析度與跨平台網頁--手機))。

---

## 3. 素材清單

### 角色 / 敵人(動畫 sprite)

| 對象 | 需要的動畫 |
|---|---|
| 玩家 | idle、walk、attack、dash(閃避)、hurt、death |
| 普通敵人(每種) | idle/move、attack、hurt、death |
| 小 Boss ×3 | idle、move、**多種攻擊動畫**、hurt、death |
| 大 Boss ×1 | 同上 + **階段轉換**動畫 |

### 技能(見 [skills.md](skills.md))

| 項目 | 做法 |
|---|---|
| 投射物 sprite | PixelLab 生成(每元素 / 每技能一張小 sprite) |
| 技能卡圖示 | PixelLab 生成靜態圖(48×48) |
| 命中爆炸 / 光環 / 拖尾 / 閃光 | **程式粒子**(Canvas),非 AI;基礎特效靠 element **換色重用** |

### 裝備 / 道具(靜態圖示)

- 裝備圖示:每件武器 / 防具 / 飾品一張(見 [equipment.md](equipment.md))。
- 道具 / 素材圖示:木材、礦石、草藥、魚、作物、補血藥水…(見 [life-system.md](life-system.md))。
- 第一版**不做**「武器穿在角色身上的外觀」(成本太高),只做圖示。

### 地圖 tileset

| 場景 | 內容 |
|---|---|
| 戰鬥關卡 | 地面、邊界、裝飾物 |
| 家園 / 農場 | 地面、水域(釣魚)、樹 / 礦(採集)、農田格子 |

### UI

按鈕、面板邊框、血條底圖、技能卡框、背包格。

---

## 4. 資料夾結構與命名

放在前端可直接讀取的靜態目錄,**檔名對應資料 id**,讓整合資料驅動:

```
frontend/public/assets/
  characters/
    player/        idle.png walk.png attack.png dash.png hurt.png death.png
  enemies/
    {enemyId}/     idle.png attack.png hurt.png death.png
  bosses/
    {bossId}/      idle.png move.png attack_1.png ... phase.png
  skills/
    projectiles/   {skillId}.png        # e.g. fireball.png
    icons/         {skillId}.png        # e.g. fireball.png(48×48)
  vfx/             explosion_base.png ...  # 共用,程式換色
  equipment/       {equipmentId}.png     # e.g. flame_sword_t1.png
  items/           {itemId}.png          # e.g. potion_small.png, herb.png
  tiles/
    battle/        ...
    home/          ...
  ui/              button.png panel.png hpbar.png card_frame.png
  manifest.json
```

**命名規則**:檔名 = 資料表的 id。`skill.id = "fireball"` → `skills/icons/fireball.png` + `skills/projectiles/fireball.png`。程式靠 id 自動組路徑,新增技能不用改載入程式。

---

## 5. 素材清單檔(manifest.json)

一份 JSON 描述每個 sprite 的檔案與動畫資訊,前端載入器讀它:

```json
{
  "player": {
    "walk":   { "file": "characters/player/walk.png",   "frameW": 32, "frameH": 32, "frames": 6, "fps": 10 },
    "attack": { "file": "characters/player/attack.png",  "frameW": 32, "frameH": 32, "frames": 4, "fps": 12 }
  },
  "skills": {
    "fireball": { "icon": "skills/icons/fireball.png",
                  "projectile": { "file": "skills/projectiles/fireball.png", "frameW": 16, "frameH": 16, "frames": 4, "fps": 12 } }
  }
}
```

---

## 6. PixelLab 工作流程

**已採用方式 A:API 直接整合**。開發時由一支生成腳本呼叫 PixelLab API → 依命名規則存入 `assets/` → 更新 `manifest.json`。

### 金鑰處理(務必遵守)

- API key 存於環境變數 **`PIXELLAB_API_KEY`**,放在**未提交**的 `.env`(`.env` 必須列入 `.gitignore`)。
- **絕不**將 key 寫入任何原始碼、文件或 commit。
- key 若曾外露,到 PixelLab 後台 rotate 一把新的。

### 生成流程

1. 定稿**風格指南**(§1)與**調色盤**。
2. 生成腳本讀 `PIXELLAB_API_KEY` + 一份「素材生成清單」(每張:prompt、尺寸、目標路徑)。
3. 呼叫 API → 取回 PNG → 依**命名規則**(§4)存入 `assets/`。
4. 更新 `manifest.json`(§5)。
5. 先只做**第一版最小集合**(§7),避免一次消耗大量額度。

> 備選(暫不採用):B. 你自己生成丟檔、C. 網頁手動 —— 兩者都靠同一份素材生成清單。

### API 實作備註(已驗證)

- 端點:`POST https://api.pixellab.ai/v1/generate-image-pixflux`,標頭 `Authorization: Bearer <PIXELLAB_API_KEY>`。
- 請求 body 為 **snake_case**:`description`、`image_size:{width,height}`、`view`(`"high top-down"`)、`direction`、`no_background`、`outline`、`shading`、`detail`、`text_guidance_scale`、`seed`…
- 回傳:`{ image: { type:"base64", base64, format }, usage:{...} }`。
- ⚠️ **不要用官方 SDK `@pixellab-code/pixellab` 解析回應**:本帳號是 **generations(訂閱張數)** 方案,回傳 `usage.type:"generations"`,SDK 的 zod 驗證硬性期待 `"usd"` 會拋錯(圖已生成卻接不到)。**直接 fetch REST、自己讀 `image.base64`** 即可。
- 計費單位是 **張數(generations)**,非金額;1 張 pixflux = 1 generation。批次前留意配額。
- 風格驗證已成功(玩家角色 + 家園場景),`view:"high top-down"` 效果正確。

### 通用步驟(不論哪種方式)

1. 定稿**風格指南**(§1)與**調色盤**。
2. 先做**第一版最小集合**(見下),不要一次生 50 個技能的圖。
3. 每張依**命名規則**入庫 → 更新 `manifest.json`。
4. 動畫用 PixelLab 動畫功能輸出幀,合成水平 strip。

---

## 7. 第一版最小素材集合(配合開發順序)

只先做「能跑通垂直切片」需要的:

- 玩家 1 套(idle/walk/attack/dash/hurt/death)
- 普通敵人 1~2 種
- Boss 共 4 隻(5/10/15/20)—— 可後置,先做 1 隻
- 投射物 7 張(對應 7 個主動技能)+ 技能卡圖示 12 張
- 道具圖示:補血藥水 + 幾種素材
- tileset:戰鬥 1 套 + 家園 1 套
- UI:血條、按鈕、技能卡框

> 其餘技能 / 裝備 / 敵人的素材,隨系統擴充再生成即可。

---

## 8. 解析度與跨平台(網頁 + 手機)

目標:**網頁版 + 手機版同一套程式與素材**。像素遊戲的關鍵原則——**一套原生素材,縮放整個畫面**,不為不同裝置做多解析度素材。

### 邏輯解析度

固定 16:9 的內部畫布:**480×270**(像素夠大顆,手機也看得清;×4 = 1920×1080 整數縮放最乾淨)。

| 螢幕 | 縮放策略 |
|---|---|
| 1920×1080 | ×4(完美填滿) |
| 1280×720 | ×2 + letterbox |
| 任意手機比例 | 取「塞得下的最大整數倍」+ letterbox(上下/左右黑邊) |

### 縮放與渲染規則

- **整數倍縮放**:避免像素大小不均(像素藝術忌諱非整數縮放)。
- **letterbox**:塞不滿的邊補黑,保證各裝置看到的戰場一樣大、一樣公平。
- **鄰近取樣**:`image-rendering: pixelated`,放大不糊。
- **離屏渲染**:先畫在 480×270 離屏 canvas(1:1),再整張放大貼到實際畫布;配合 `devicePixelRatio` 在高 DPI 螢幕保持清晰。

### 手機專屬

- **鎖橫向(landscape)**。
- **虛擬搖桿 + 按鈕**疊在畫面上,觸控目標 ≥ 44px。
- 桌機鍵鼠 / 手機觸控共用同一套遊戲邏輯。
- 注意瀏海 / 安全區(safe-area-inset)。

### UI 雙軌策略

| UI | 做法 | 原因 |
|---|---|---|
| 戰鬥 HUD(血條、技能冷卻) | 畫在 canvas,跟著像素縮放 | 維持像素風一致 |
| React 選單(家園、抽選、背包、裝備) | **響應式 DOM**(CSS rem/vw),非像素縮放 | 文字在手機才清楚、版面自動重排 |

→ 圖示(技能卡 48×48、道具 32×32)維持原生尺寸,但承載它們的選單**版面**用 CSS 響應式排,手機自動換行 / 縮排。
