# 第一版素材生成清單(v1)

配合[開發順序](README.md)前幾步的**最小可玩集合**。本清單為 PixelLab API 生成腳本的輸入(方式 A,見 [assets.md §6](assets.md));命名對齊資料 id(見 [assets.md §4](assets.md))。

> **不要一次全生** —— 會消耗大量額度。建議先生 1~2 張確認風格(§風格驗證),滿意後再批次跑。

---

## 生成進度(截至 Phase 6)

`✅ 已生`　`🟡 部分`　`⬜ 待做(對應系統未實作)`

| 類別 | 狀態 | 說明 |
|---|---|---|
| 玩家(男+女) | 🟡 | idle + **walk 動畫**(各)已生並接入;attack/dash/hurt/death 待後續 |
| 敵人 ×2 | 🟡 | idle + **move 動畫**已生並接入;attack/death 待後續 |
| Boss ×4 | 🟡 | idle + **move 動畫**(orc/酋長/熊);古龍維持靜態大圖;attack/phase 待後續 |
| 技能效果 sprite | ✅ | **7/7**(fireball + 冰/雷/風/落石/毒/迴旋),已接入戰鬥 |
| 技能卡圖示 | ✅ | **12/12**,抽選畫面使用 |
| 道具圖示 | ✅ | wood/ore/herb/fish/carrot/potion_small 全生 |
| Tileset | 🟡 | 戰場 forest_ground 已用;家園另生 home/ground 但非無縫,仍用森林草地 |
| UI | 🟡 | panel/button/**card_frame** 已生(9-slice);hpbar 畫在 canvas |
| **(清單外,已生)** | ✅ | 家園設施 ×5、工坊、裝備 ×2、選角用 idle |

**已完成**:① sprite 動畫系統(walk/move) ② 完整技能系統(7 主動 + 5 被動 + 12 卡)。
**剩餘(後續)**:attack/hurt/death 動畫、Boss 招式、無縫家園地磚。

---

## 共用風格前綴(STYLE)

每個 prompt 實際送出 = `STYLE + 主體描述`。固定前綴確保風格一致:

```
STYLE = "16-bit pixel art, top-down view, bold black outline,
         limited cohesive palette, no anti-aliasing, transparent background"
```

- 調色盤:固定一組(約 16~32 色),所有素材沿用。
- 動畫:用 PixelLab 動畫功能輸出幀 → 合成水平 strip;靜態用一般生成。
- 尺寸見各表「size」;路徑相對於 `frontend/public/assets/`。

---

## 1. 玩家角色(可選性別:男 / 女)

角色性別可選,**純外觀、不影響數值**(見 [gameplay.md](gameplay.md))。兩套相同動作、相同風格;路徑分 `male` / `female` 子資料夾。

- 男:`a young male adventurer hero, short brown hair, blue tunic, holding a short sword`
- 女:`a young female adventurer heroine, long brown hair in a ponytail, blue tunic, holding a short sword`

| 動作 | 男路徑 / 女路徑 | size | 幀 | 備註 |
|---|---|---|---|---|
| idle | `characters/player/{male,female}/idle.png` | 32×32 | 4 | 待機微動 |
| walk | `characters/player/{male,female}/walk.png` | 32×32 | 6 | 走路循環 |
| attack | `characters/player/{male,female}/attack.png` | 32×32 | 4 | 揮砍(自動攻擊用) |
| dash | `characters/player/{male,female}/dash.png` | 32×32 | 3 | 閃避衝刺 |
| hurt | `characters/player/{male,female}/hurt.png` | 32×32 | 2 | 受擊 |
| death | `characters/player/{male,female}/death.png` | 32×32 | 5 | 倒下 |

> 共 2 套 × 6 動作 = 12 項。風格驗證:男 / 女 idle 皆已生成,同風格一致。

---

## 2. 普通敵人 `enemies/{id}/`

各敵人主體 + 動作 idle/move、attack、death(hurt 用程式閃白代替)。

### `slime`：`a small green slime monster, jelly body, top-down`
| 動作 | 路徑 | size | 幀 |
|---|---|---|---|
| move | `enemies/slime/move.png` | 32×32 | 4 |
| attack | `enemies/slime/attack.png` | 32×32 | 3 |
| death | `enemies/slime/death.png` | 32×32 | 4 |

### `goblin`：`a small goblin warrior holding a wooden club, top-down`
| 動作 | 路徑 | size | 幀 |
|---|---|---|---|
| move | `enemies/goblin/move.png` | 32×32 | 4 |
| attack | `enemies/goblin/attack.png` | 32×32 | 4 |
| death | `enemies/goblin/death.png` | 32×32 | 4 |

---

## 3. 地圖 1 的 Boss(4 隻)`bosses/{id}/`

對應地圖 1：翠綠林地的 L5 / L10 / L15 / L20(見 [gameplay.md](gameplay.md))。小 Boss 64×64;最終 Boss(森林古龍)96×96 且多一個階段轉換動畫。各 Boss 用 L5 `orc_warlord` 當尺度基準(init_image)以維持比例。

### L5 小 Boss — `orc_warlord`：`a large armored orc warlord boss wielding a giant axe, menacing`
| 動作 | 路徑 | size | 幀 | 備註 |
|---|---|---|---|---|
| idle | `bosses/orc_warlord/idle.png` | 64×64 | 4 | |
| move | `bosses/orc_warlord/move.png` | 64×64 | 6 | |
| attack_1 | `bosses/orc_warlord/attack_1.png` | 64×64 | 5 | 橫掃 |
| attack_2 | `bosses/orc_warlord/attack_2.png` | 64×64 | 5 | 重砸 |
| death | `bosses/orc_warlord/death.png` | 64×64 | 6 | |

### L10 小 Boss — `goblin_chieftain`：`a large goblin chieftain boss with bone armor and a spiked club`
| 動作 | 路徑 | size | 幀 | 備註 |
|---|---|---|---|---|
| idle | `bosses/goblin_chieftain/idle.png` | 64×64 | 4 | |
| move | `bosses/goblin_chieftain/move.png` | 64×64 | 6 | |
| attack_1 | `bosses/goblin_chieftain/attack_1.png` | 64×64 | 5 | 揮棍 |
| attack_2 | `bosses/goblin_chieftain/attack_2.png` | 64×64 | 5 | 衝撞 |
| death | `bosses/goblin_chieftain/death.png` | 64×64 | 6 | |

### L15 小 Boss — `dire_bear`：`a huge enraged brown bear boss with battle scars, roaring`
| 動作 | 路徑 | size | 幀 | 備註 |
|---|---|---|---|---|
| idle | `bosses/dire_bear/idle.png` | 64×64 | 4 | |
| move | `bosses/dire_bear/move.png` | 64×64 | 6 | |
| attack_1 | `bosses/dire_bear/attack_1.png` | 64×64 | 5 | 揮爪 |
| attack_2 | `bosses/dire_bear/attack_2.png` | 64×64 | 5 | 撲咬 |
| death | `bosses/dire_bear/death.png` | 64×64 | 6 | |

### L20 大 Boss — `forest_dragon`：`a massive ancient forest dragon boss covered in moss and vines, wings spread`
| 動作 | 路徑 | size | 幀 | 備註 |
|---|---|---|---|---|
| idle | `bosses/forest_dragon/idle.png` | 96×96 | 4 | |
| move | `bosses/forest_dragon/move.png` | 96×96 | 6 | |
| attack_1 | `bosses/forest_dragon/attack_1.png` | 96×96 | 6 | 爪擊 / 咬 |
| attack_2 | `bosses/forest_dragon/attack_2.png` | 96×96 | 6 | 吐息(遠程) |
| phase | `bosses/forest_dragon/phase.png` | 96×96 | 5 | 階段轉換(換招 / 狂暴) |
| death | `bosses/forest_dragon/death.png` | 96×96 | 7 | |

---

## 4. 技能效果 sprite `skills/projectiles/`

對應 7 個主動技能。部分(閃電 / 毒霧)以程式粒子為主,sprite 為輔。

| 技能 id | 路徑 | size | 幀 | 主體描述 |
|---|---|---|---|---|
| fireball | `skills/projectiles/fireball.png` | 16×16 | 4 | `a flaming fireball projectile, orange` |
| ice_shard | `skills/projectiles/ice_shard.png` | 16×16 | 3 | `a sharp ice shard projectile, light blue` |
| chain_lightning | `skills/projectiles/chain_lightning.png` | 16×16 | 3 | `a crackling yellow lightning spark`(主程式畫線) |
| wind_blade | `skills/projectiles/wind_blade.png` | 16×16 | 3 | `a green crescent wind blade` |
| rock_fall | `skills/projectiles/rock_fall.png` | 24×24 | 3 | `a falling brown boulder rock` |
| poison_cloud | `skills/projectiles/poison_cloud.png` | 32×32 | 4 | `a translucent green poison gas cloud`(輔助程式) |
| spin_slash | `skills/projectiles/spin_slash.png` | 32×32 | 4 | `a white circular slash arc effect` |

> 進階省力:可只生一套基礎特效,靠 element 程式換色重用(見 [assets.md §3](assets.md))。

---

## 5. 技能卡圖示 `skills/icons/`（48×48,靜態）

12 個首發技能。主體前綴可加 `a game skill icon of ...`。

| 技能 id | 路徑 | 主體描述 |
|---|---|---|
| fireball | `skills/icons/fireball.png` | `a fireball` |
| ice_shard | `skills/icons/ice_shard.png` | `an ice shard` |
| chain_lightning | `skills/icons/chain_lightning.png` | `a lightning bolt` |
| wind_blade | `skills/icons/wind_blade.png` | `a green wind blade` |
| rock_fall | `skills/icons/rock_fall.png` | `a falling boulder` |
| poison_cloud | `skills/icons/poison_cloud.png` | `a poison gas cloud` |
| spin_slash | `skills/icons/spin_slash.png` | `a spinning sword slash` |
| crit_mastery | `skills/icons/crit_mastery.png` | `a crosshair / critical hit mark` |
| lifesteal | `skills/icons/lifesteal.png` | `a blood drop with a heart` |
| haste | `skills/icons/haste.png` | `winged boots` |
| flame_aura | `skills/icons/flame_aura.png` | `a burning flame shield aura` |
| fortify | `skills/icons/fortify.png` | `a sturdy iron shield` |

---

## 6. 道具 / 素材圖示 `items/`（32×32,靜態）

| item id | 路徑 | 主體描述 |
|---|---|---|
| potion_small | `items/potion_small.png` | `a small red health potion bottle` |
| wood | `items/wood.png` | `a stack of wood logs` |
| ore | `items/ore.png` | `a chunk of iron ore` |
| herb | `items/herb.png` | `a green medicinal herb leaf` |
| fish | `items/fish.png` | `a blue fish` |
| carrot | `items/carrot.png` | `a carrot vegetable` |

---

## 7. Tileset `tiles/`

以 32×32 為單格,輸出含多塊的 sheet。

| 用途 | 路徑 | 內容(主體描述) |
|---|---|---|
| 戰鬥場景(地圖 1 森林) | `tiles/battle/forest.png` | `top-down forest grassland arena tileset: grass, dirt, stone path, bushes, edges` |
| 家園場景 | `tiles/home/farm.png` | `top-down farm home tileset: grass, dirt path, water edge, tilled soil, tree, rock` |

---

## 8. UI `ui/`

| 元件 | 路徑 | 主體描述 |
|---|---|---|
| 血條 | `ui/hpbar.png` | `a pixel art health bar frame with red fill` |
| 按鈕 | `ui/button.png` | `a pixel art stone UI button, normal state` |
| 技能卡框 | `ui/card_frame.png` | `a pixel art ornate card frame border` |
| 面板 | `ui/panel.png` | `a dark semi-transparent pixel art panel background, 9-slice` |

---

## 數量總計

| 類別 | 張數(含動畫) |
|---|---|
| 玩家(男 + 女) | 12 |
| 敵人 ×2 | 6 |
| Boss ×4(地圖 1) | 21 |
| 技能效果 sprite | 7 |
| 技能卡圖示 | 12 |
| 道具圖示 | 6 |
| Tileset | 2 |
| UI | 4 |
| **合計** | **70** 項 |

> 動畫項各含多幀,實際 API 呼叫數視動畫生成方式而定;先做**風格驗證**再批次跑以省額度。

---

## 風格驗證(先跑這兩張)

正式批次前,先生這兩張確認風格 / 調色盤方向:

1. `characters/player/idle.png` —— 定下角色比例與配色基調
2. `tiles/home/farm.png` —— 定下場景色調與地磚風格

滿意後鎖定 STYLE 與調色盤,再跑其餘。
