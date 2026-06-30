// Accumulated run build: each pick increments one upgrade. Simple Phase 3 model
// (the data-driven 50-skill system in docs/skills.md comes later).

export type Build = {
  dmg: number // fireball damage
  cdr: number // cooldown reduction
  multishot: number // extra projectiles
  speed: number // move speed
  hp: number // max HP
}

export const emptyBuild = (): Build => ({ dmg: 0, cdr: 0, multishot: 0, speed: 0, hp: 0 })

export type SkillCard = { id: keyof Build; name: string; desc: string }

export const SKILL_POOL: SkillCard[] = [
  { id: 'dmg', name: '烈焰強化', desc: '火球傷害 +6' },
  { id: 'cdr', name: '急速冷卻', desc: '火球冷卻 -15%' },
  { id: 'multishot', name: '多重射擊', desc: '火球 +1 發' },
  { id: 'speed', name: '疾風之靴', desc: '移動速度 +12%' },
  { id: 'hp', name: '強健體魄', desc: '最大生命 +20' },
]

/** Three random distinct cards for the between-level draft. */
export function draftThree(): SkillCard[] {
  const a = [...SKILL_POOL]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, 3)
}
