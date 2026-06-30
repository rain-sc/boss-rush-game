# 架構與資料庫設計

## 系統架構

```
┌─────────────── React 前端 ───────────────┐
│  Canvas 場景層 (Pixi.js 遊戲迴圈)         │
│   ├ 家園 hub:可走動,設施互動            │
│   └ 戰鬥:即時移動 / 閃避;技能自動施放    │
│      (兩者共用移動 + 渲染核心)           │
│  React DOM 疊層 (UI / 面板,Framer Motion)│
│   ├ 設施面板:耕種 / 釣魚 / 採集 / 合成     │
│   ├ 技能起手與抽選、裝備 / 背包 / 強化      │
│   └ 主選單 / 結算 / 進度                    │
└──────────────────┬───────────────────────┘
                   │ REST (JSON) — 存檔 / 讀取 / 屬性計算 / 驗證
┌──────────────────┴── Spring Boot 後端 ────┐
│  Controller → Service → Repository (JPA)   │
└──────────────────┬───────────────────────┘
                   │
              PostgreSQL
```

### 職責劃分

| 層 | 負責 |
|---|---|
| Canvas 場景 | 家園 hub(可走動)與戰鬥(前端主導 client-authoritative),共用移動 + 渲染核心;**Pixi.js** 渲染(sprite 動畫 / 彈幕 / 粒子,`tint` 換色) |
| React DOM | 設施面板、抽選、背包、裝備、主選單、結算等 UI 疊層;**Framer Motion** 過場 / 卡片動畫 |
| Spring Boot | 存檔讀取、裝備屬性彙整、合成 / 生活邏輯、合理性檢查 |
| Postgres | 持久化;技能 / 裝備設定用 `jsonb` |

> UI 細節見 [ui.md](ui.md)。

> **戰鬥權威性**:即時動作逐幀模擬在前端;後端在每關結束收結果並做基本合理性檢查(傷害 / 時間是否離譜)。第一版不做嚴格反作弊。

---

## 資料庫表設計(草稿)

### 帳號與進度

| 表 | 欄位重點 |
|---|---|
| `player` | `id, name, character_gender(MALE/FEMALE), created_at`（性別純外觀） |
| `run_progress` | `player_id, map_id, current_level, hp, equipped_skills(jsonb), draft_seed, status` —— 目前單局狀態 |

### 技能(見 [skills.md](skills.md))

| 表 | 欄位重點 |
|---|---|
| `skill` | `id, name, category, element, max_level, trigger, cooldown_ms, effects(jsonb)` —— **目錄** |
| `player_skill` | `player_id, skill_id, level` —— 玩家當前 build |

> 技能 build 為單局性:可存在 `run_progress.equipped_skills` 或單局範圍的 `player_skill`,新局重置。

### 關卡

| 表 | 欄位重點 |
|---|---|
| `map` | `id, name, theme, order, tileset, difficulty_modifier, loot_table(jsonb)` —— 10 張地圖 + 掉落表 |
| `stage` | `map_id, level(1~20), type(NORMAL/MINI_BOSS/BOSS), enemy_config(jsonb)` —— 每張地圖各 20 關 |
| `player_progress` | `player_id, highest_cleared_map` —— 可挑戰 1~(highest+1);可重刷 1~highest |

### 裝備(見 [equipment.md](equipment.md))

| 表 | 欄位重點 |
|---|---|
| `equipment` | `id, name, slot, rarity, element, base_stats(jsonb), affix_pool(jsonb), max_enhance` —— **目錄** |
| `player_equipment` | `instance_id, player_id, equipment_id, enhance_level, rolled_affixes(jsonb)` —— 玩家**實例** |
| `player_loadout` | `player_id, weapon_instance, armor_instance, accessory_instance` —— 目前裝備 |

### 生活與道具(見 [life-system.md](life-system.md))

| 表 | 欄位重點 |
|---|---|
| `item` | `id, name, type(MATERIAL/HEAL/...), props(jsonb)` —— 道具 / 素材目錄 |
| `inventory` | `player_id, item_id, qty` —— 背包 |
| `recipe` | `id, output(jsonb), inputs(jsonb)` —— 合成配方(道具 + 裝備共用) |
| `farm_plot` | `player_id, plot_index, crop_item_id, planted_at, ready_at` —— 農場格子 |
| `life_activity` | `player_id, activity_type, cooldown_until` —— 採集 / 釣魚冷卻 |

---

## 關鍵 API(初步)

| 方法 | 路徑 | 用途 |
|---|---|---|
| `GET` | `/api/player` | 玩家資料 / 進度 |
| `GET` | `/api/maps` | 地圖列表 + 解鎖 / 通關狀態 |
| `POST` | `/api/run/start` | 開始新一局(帶 `mapId`,須已解鎖) |
| `POST` | `/api/run/level/{n}/clear` | 回報過關結果 → 給抽選選項;Boss 關回傳**裝備掉落** |
| `POST` | `/api/run/draft` | 提交技能抽選結果 |
| `GET` | `/api/loadout/stats` | 取得裝備彙整後的角色總屬性(進戰鬥前) |
| `POST` | `/api/craft` | 合成(道具 / 裝備) |
| `POST` | `/api/equipment/{id}/enhance` | 裝備強化 |
| `POST` | `/api/farm/plant` · `/api/farm/harvest` | 耕種 |
| `POST` | `/api/life/gather` · `/api/life/fish` | 採集 / 釣魚 |

> 第一版可先做最小集合(player / run / loadout stats),其餘隨開發順序逐步補上。

---

## 美術素材整合

- **PixelLab AI**:角色 sprite、裝備 / 道具 / 技能卡圖示、地圖 tileset、UI 素材。
- **程式特效**:命中爆炸、光環、拖尾、閃光、震屏等動態 VFX 用 Canvas 粒子;基礎特效靠 element 換色重用。
- 整合方式:**PixelLab API 直接整合**;key 存環境變數 `PIXELLAB_API_KEY`(未提交的 `.env`),詳見 [assets.md §6](assets.md)。
