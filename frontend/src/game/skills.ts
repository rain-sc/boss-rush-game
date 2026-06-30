// Data-driven skill system. Active skills auto-cast on their own cooldown;
// passives modify the player. A run accumulates a build (skillId -> level).

export type ActiveDef = {
  id: string
  name: string
  category: 'ACTIVE'
  cast: 'projectile' | 'aoe_target' | 'aoe_self'
  cooldown: number
  baseDamage: number
  perLevel: number
  speed?: number
  pierce?: number
  radius?: number
}
export type PassiveDef = {
  id: string
  name: string
  category: 'PASSIVE'
  desc: string
}
export type SkillDef = ActiveDef | PassiveDef

export const SKILLS: Record<string, SkillDef> = {
  fireball: { id: 'fireball', name: '火球', category: 'ACTIVE', cast: 'projectile', cooldown: 0.9, baseDamage: 12, perLevel: 6, speed: 170, pierce: 1 },
  ice_shard: { id: 'ice_shard', name: '冰錐', category: 'ACTIVE', cast: 'projectile', cooldown: 0.8, baseDamage: 9, perLevel: 5, speed: 200, pierce: 2 },
  chain_lightning: { id: 'chain_lightning', name: '連鎖閃電', category: 'ACTIVE', cast: 'projectile', cooldown: 1.1, baseDamage: 14, perLevel: 7, speed: 260, pierce: 1 },
  wind_blade: { id: 'wind_blade', name: '風刃', category: 'ACTIVE', cast: 'projectile', cooldown: 0.7, baseDamage: 8, perLevel: 4, speed: 240, pierce: 3 },
  rock_fall: { id: 'rock_fall', name: '落石', category: 'ACTIVE', cast: 'aoe_target', cooldown: 1.6, baseDamage: 20, perLevel: 10, radius: 28 },
  poison_cloud: { id: 'poison_cloud', name: '毒霧', category: 'ACTIVE', cast: 'aoe_target', cooldown: 1.8, baseDamage: 14, perLevel: 7, radius: 32 },
  spin_slash: { id: 'spin_slash', name: '迴旋斬', category: 'ACTIVE', cast: 'aoe_self', cooldown: 1.2, baseDamage: 16, perLevel: 8, radius: 36 },
  crit_mastery: { id: 'crit_mastery', name: '暴擊精通', category: 'PASSIVE', desc: '暴擊率 +15%/級(暴擊 2 倍)' },
  lifesteal: { id: 'lifesteal', name: '嗜血', category: 'PASSIVE', desc: '命中回 1 血/級' },
  haste: { id: 'haste', name: '疾風步', category: 'PASSIVE', desc: '移速 +10%、冷卻 -8%/級' },
  flame_aura: { id: 'flame_aura', name: '烈焰護體', category: 'PASSIVE', desc: '灼燒附近敵人/級' },
  fortify: { id: 'fortify', name: '堅甲', category: 'PASSIVE', desc: '最大生命 +20/級' },
}

export type SkillBuild = Record<string, number>
export const MAX_SKILL_LEVEL = 5

/** Every run starts with one active skill so the player can always attack. */
export const starterBuild = (): SkillBuild => ({ fireball: 1 })

export type DraftCard = { id: string; name: string; icon: string; level: number; isNew: boolean; desc: string }

function cardDesc(def: SkillDef, level: number): string {
  if (def.category === 'ACTIVE') {
    return `傷害 ${def.baseDamage + def.perLevel * (level - 1)}`
  }
  return def.desc
}

/** Three random distinct, non-maxed skills for the between-level draft. */
export function draftThree(build: SkillBuild): DraftCard[] {
  const pool = Object.keys(SKILLS).filter((id) => (build[id] ?? 0) < MAX_SKILL_LEVEL)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 3).map((id) => {
    const level = (build[id] ?? 0) + 1
    return { id, name: SKILLS[id].name, icon: `/assets/skills/icons/${id}.png`, level, isNew: !build[id], desc: cardDesc(SKILLS[id], level) }
  })
}
