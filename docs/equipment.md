# 裝備系統設計

裝備是**永久養成層**:靠[生活系統](life-system.md)打造 / 強化,跨整個遊戲保留;與單局的[技能 build](skills.md) 互補。

---

## 裝備 slot(起步 3 格)

| Slot | 主要影響 |
|---|---|
| `WEAPON` 武器 | 攻擊 |
| `ARMOR` 防具 | 生命 / 防禦 |
| `ACCESSORY` 飾品 | 特殊效果(暴擊、冷卻、元素加成) |

> 之後要擴成「頭 / 身 / 手 / 腳 / 戒指 ×2」再加 slot 即可,系統不變。

---

## 稀有度

普通 → 精良 → 稀有 → 史詩 → 傳說。稀有度越高:基礎數值越高、**隨機詞綴條數越多**。

---

## 裝備資料結構

注意分兩層:**目錄**(設計上的「炎之劍」)與 **玩家實例**(玩家身上那把,有自己的強化等級與 roll 出的詞綴)。

### 目錄(`equipment` 表)

```json
{
  "id": "flame_sword_t1",
  "name": "炎之劍",
  "slot": "WEAPON",
  "rarity": "RARE",
  "element": "FIRE",
  "baseStats": { "attack": 25, "critRate": 0.05 },
  "affixPool": [ "FIRE_DMG_PCT", "ATTACK_FLAT", "CRIT_DMG" ],
  "maxEnhance": 10
}
```

### 玩家實例(`player_equipment` 表)

```json
{
  "instanceId": "uuid-...",
  "equipmentId": "flame_sword_t1",
  "enhanceLevel": 4,
  "rolledAffixes": [ { "type": "FIRE_DMG_PCT", "value": 0.12 } ]
}
```

---

## 與其他系統的連動(亮點)

- **裝備 element ↔ 技能 element**:穿火屬武器 → 火系技能傷害 +X%,鼓勵配 build。
- **強化系統**:用生活系統材料把裝備 `+1 → +10`,給材料長期消耗去處。
- **套裝加成(後期)**:同系列穿 2 件 / 4 件觸發額外效果。

## 取得來源

| 來源 | 說明 |
|---|---|
| **通關掉落(機率)— 主要** | 擊敗地圖 Boss(5/10/15/20)各 roll 一次掉落,最終 Boss 最好;地圖難度越高 loot table 越好。重刷舊地圖即為刷裝。詳見 [gameplay.md 裝備掉落](gameplay.md) |
| 生活系統合成 — 次要 | 合成少數特定裝備;主要提供**強化材料**(把掉落裝備 +1~+10)。見 [life-system.md](life-system.md) |

### 掉落模型

- 每張地圖一份 **loot table**(`map.loot_table`),含各稀有度的機率權重。
- Boss 擊敗時 roll:先決定**是否掉落** → 再 roll **稀有度** → 再從該稀有度池抽**裝備** → roll **詞綴**(稀有度越高詞綴越多)。
- 由**後端執行 roll**(防作弊),產出寫入 `player_equipment` 實例。

---

## 屬性如何在戰鬥中生效

進關卡前,**後端**把 `player_loadout` 三件裝備的
`baseStats + rolledAffixes + 強化加成`
彙整成一份「角色總屬性」傳給前端;戰鬥迴圈直接吃這份數值。

> 裝備數值計算放後端 —— 邏輯集中、防作弊;前端只負責表現。
