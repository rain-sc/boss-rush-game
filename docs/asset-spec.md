# 素材規格書(drop-in 指南)

遊戲**目前實際載入**的每個檔案都列在下方:照**路徑、尺寸、格式**做好,丟進 `frontend/public/assets/` 對應位置即可,**不需改程式**。

## 製作分工
- 🗺️ **地圖 / 地面 / 背景 → 外部 AI 製作**(見 [§9](#9-地面--背景--外部製作)):PixelLab 做不好無縫地磚與背景。
- 🎨 **其餘全部 → PixelLab(由我生成)**:角色、敵人、Boss、技能、道具、裝備、家園設施、UI。

下面各節仍列出完整規格供參考;標 🗺️ 的是你要外部找的,其餘我負責。

## 通用規則
- 格式:**PNG**。
- 角色 / 敵人 / 物件 / 圖示 / UI 框 → **透明背景**;地面 → **不透明**。
- 像素風;遊戲用**鄰近取樣(nearest)**放大,所以做**原生小尺寸**即可(下表尺寸)。
- **動畫**:同一動作每幀**尺寸相同**,檔名 `動作_索引.png`,索引從 **0** 起(例:`walk_0.png`…`walk_3.png`)。
- 檔名固定(程式依檔名載入),請勿改名;要新增內容再跟我說。

---

## 1. 玩家角色(男 / 女各一套)
路徑:`characters/player/male/`、`characters/player/female/`

| 檔案 | 尺寸 | 幀 | 用途 |
|---|---|---|---|
| `idle.png` | 64×64 | 1 | 選角預覽、靜止姿勢 |
| `walk_0.png … walk_3.png` | 64×64 | 4 | 移動動畫(走路循環) |

## 2. 普通敵人(史萊姆、哥布林)
路徑:`enemies/slime/`、`enemies/goblin/`

| 檔案 | 尺寸 | 幀 | 用途 |
|---|---|---|---|
| `move_0.png … move_3.png` | 64×64 | 4 | 移動動畫(常駐播放) |

## 3. Boss(地圖 1)
路徑:`bosses/<id>/`,id = `orc_warlord`、`goblin_chieftain`、`dire_bear`、`forest_dragon`

| 檔案 | 尺寸 | 幀 | 用途 |
|---|---|---|---|
| `move_0.png … move_3.png` | 64×64 | 4 | 前 3 隻 Boss 的移動動畫 |
| `idle.png`(僅 `forest_dragon`) | 96×96 | 1 | 最終 Boss(目前靜態) |

> 之後想加攻擊 / 死亡動畫,格式同上(`attack_0..n`、`death_0..n`),跟我說要幾幀我接。

## 4. 技能投射物 / 效果
路徑:`skills/projectiles/`,尺寸 **32×32**,透明背景

`fireball` `ice_shard` `chain_lightning` `wind_blade` `rock_fall` `poison_cloud` `spin_slash`(各一張 `.png`)

## 5. 技能卡圖示(12 張)
路徑:`skills/icons/`,尺寸 **48×48**,透明背景

`fireball` `ice_shard` `chain_lightning` `wind_blade` `rock_fall` `poison_cloud` `spin_slash` `crit_mastery` `lifesteal` `haste` `flame_aura` `fortify`

## 6. 道具圖示
路徑:`items/`,尺寸 **32×32**,透明背景

`wood` `ore` `herb` `fish` `carrot` `potion_small`

## 7. 裝備圖示
路徑:`equipment/`,尺寸 **32×32**,透明背景

`iron_sword` `leather_armor`

## 8. 家園設施(已畫進地圖,無獨立 sprite)
> **目前採用**:設施(樹林/工坊/礦坑/農田/魚池/傳送門)直接畫在完整地圖(§9)裡;程式用**隱形互動點 + 名稱標籤**對準位置。無獨立設施 sprite、無設施動畫。`hub/*` 那批舊圖已停用。

## 9. 地面 / 背景 (🗺️ 外部製作)
| 檔案 | 尺寸 | 背景 | 用途 |
|---|---|---|---|
| `tiles/home/scene.png` | 約 240×135(16:9) | 不透明 | 家園背景圖(整張拉伸填滿,建議中央開闊、邊緣裝飾) |
| `tiles/battle/forest_ground.png` | 64×64 | 不透明 | 地圖 1 戰場地面(**平鋪**,盡量無縫) |
| `tiles/battle/cave.png` | 64×64 | 不透明 | 地圖 2 戰場地面(平鋪,盡量無縫) |

## 10. UI 框(9-slice)
路徑:`ui/`,透明背景,**方形有邊框、中間留空**

| 檔案 | 尺寸 | 邊框厚度(給切片用) | 用途 |
|---|---|---|---|
| `panel.png` | 48×48 | 約 14px | 面板外框(背包 / 工坊 / 農田 / 選圖) |
| `button.png` | 48×48 | 約 9px(中間填滿) | 木質按鈕 |
| `card_frame.png` | 48×48 | 約 12px(中間填滿) | 技能抽選卡框 |

> 9-slice 切片值我已設定;若你的框邊厚度不同,把圖給我,我調 CSS 切片對齊。

### 🗺️ 家園完整地圖(`tiles/home/scene.png`)——含設施

**目前採用「一整張含設施的完整地圖」**(ChatGPT,同源最一致);程式在對應位置放隱形互動點。整張拉伸鋪滿(16:9)。設施放這些相對位置(互動點對準這裡,不同再跟我說我調):

| 設施 | 位置(相對) |
|---|---|
| 採集樹林 | 左上 ~ (15%, 22%) |
| 工坊 / 小屋 | 中上 ~ (48%, 15%) |
| 礦坑 | 右上 ~ (74%, 20%) |
| 農田 | 左 ~ (14%, 62%) |
| 魚池 | 右 ~ (83%, 60%)（互動點在岸邊 ~66%) |
| 傳送門(法陣) | 中下 ~ (47%, 78%) |
| 玩家出生 | 正中央,保持開闊 |

給 ChatGPT 的 prompt:
```
A top-down (overhead) 16-bit pixel-art farm homestead map, Stardew Valley
vibe, bright cohesive palette, wide 16:9. Layout: top-left orchard/trees;
top-center a cozy log cabin workshop with a forge; top-right a mine entrance
in rocky cliffs with ore; left tilled farm crop rows; right a round fish pond;
bottom-center a glowing blue magic teleport rune circle; center open grass with
dirt paths connecting everything. No characters, no text, no UI.
```
存 PNG 覆蓋 `tiles/home/scene.png`;位置有出入我調互動點。

> 缺點:設施畫死在圖裡 → **沒有逐幀動畫**(這是你選的「一致優先」)。日後想要動畫需改回「乾淨背景 + 獨立 sprite」。

---

### 🗺️ 戰場地面(10 張,`tiles/battle/map1.png … map10.png`)

每張獨立 16:9 整圖,程式拉伸鋪滿。俯視角、**中央開闊留給戰鬥**、裝飾放邊角、**無角色/敵人/文字**。缺圖自動退回預設。

通用開頭:`top-down 16-bit pixel-art battle arena ground, wide 16:9, <主題>, open flat center, <裝飾> around the edges, no characters no enemies no text`

| # | 檔名 | 主題 / 裝飾 |
|---|---|---|
| 1 翠綠林地 | map1.png | lush green forest clearing;mossy rocks, bushes, stumps, flowers |
| 2 幽暗洞窟 | map2.png | dark rocky cavern floor;stone walls, stalagmites, glowing blue crystals |
| 3 灼熱沙漠 | map3.png | cracked sandy desert;sandstone rocks, dunes, dead cacti, bones |
| 4 迷霧沼澤 | map4.png | murky swamp ground;dead trees, vines, bubbling toxic pools |
| 5 凜冬雪原 | map5.png | snowy tundra with ice;snow drifts, frozen rocks, icicles |
| 6 古代遺跡 | map6.png | cracked stone-tile floor;broken pillars, statues, ruined walls |
| 7 熔岩火山 | map7.png | volcanic rock with lava cracks;obsidian rocks, lava pools |
| 8 雷鳴高塔 | map8.png | rune-marked tower-top floor;pillars, lightning rods, stormy sky |
| 9 腐朽墓園 | map9.png | dead grass with bones;tombstones, iron fences, dead trees, fog |
| 10 虛空深淵 | map10.png | cosmic void with purple runes;floating rocks, demonic crystals |

---

## 分工小結
- **我(PixelLab + 程式)**:§1–§8 + §10 全部素材由 PixelLab 生成;程式、玩法、版面、整合、尺寸 / 縮放 / 切片微調。
- **你(外部 AI)**:只需 §9 的**地面 / 背景**(`tiles/battle/*.png`、`tiles/home/scene.png`,及日後新地圖地面)。做好丟進對應路徑覆蓋即可,我再調整縮放/平鋪對齊。
