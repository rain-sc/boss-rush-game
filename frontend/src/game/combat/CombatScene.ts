import { AnimatedSprite, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js'
import {
  LOGICAL_H,
  PLAYER_SPEED,
  PLAYER_SIZE,
  PLAYER_MAX_HP,
  PLAYER_HIT_RADIUS,
  DODGE_SPEED,
  DODGE_TIME,
  DODGE_CD,
  FIREBALL_RADIUS,
  FIREBALL_SIZE,
  ENEMY_SPEED,
  ENEMY_RADIUS,
  ENEMY_SIZE,
  ENEMY_TOUCH_DAMAGE,
  ENEMY_TOUCH_INTERVAL,
  LEVEL_HEAL_FRACTION,
} from '../config'
import { getDirection, consumeDodge } from '../input'
import { SKILLS, starterBuild, type SkillBuild, type ActiveDef } from '../skills'
import { type LevelConfig } from '../levels'
import { playSfx } from '../sound'

type Enemy = {
  spr: AnimatedSprite
  bar: Graphics
  x: number
  y: number
  hp: number
  maxHp: number
  touchCd: number
  radius: number
  speed: number
  touchDmg: number
  size: number
  isBoss: boolean
  shootEvery: number // 0 = doesn't shoot
  atkCd: number
  flash: number
  pattern: string // boss attack pattern id
  castCount: number
}
type EnemyShot = { g: Graphics; x: number; y: number; vx: number; vy: number; dmg: number; alive: boolean }
type Projectile = {
  spr: Sprite
  x: number
  y: number
  vx: number
  vy: number
  dmg: number
  alive: boolean
  hitsLeft: number
  hit: Set<Enemy>
}
type Effect = { spr: Sprite; ttl: number; life: number }
type Particle = { g: Graphics; x: number; y: number; vx: number; vy: number; ttl: number; life: number }
type DmgText = { t: Text; x: number; y: number; ttl: number; life: number }

export type CombatState = 'playing' | 'cleared' | 'died'
export type CombatTextures = {
  playerWalk: Texture[]
  enemies: Texture[][] // per enemy type: move-cycle frames
  skillProjectiles: Record<string, Texture> // skillId -> projectile/effect sprite
  bosses: Record<number, Texture[]> // boss level -> move frames
}

/**
 * Combat for one level. The accumulated skill build drives auto-cast active
 * skills and passive modifiers. Clearing all enemies => onCleared; HP 0 => onDied.
 */
export class CombatScene {
  readonly world: Container
  playerHp = PLAYER_MAX_HP
  state: CombatState = 'playing'

  private tex: CombatTextures
  private getW: () => number
  private player: AnimatedSprite
  private px = 0
  private py = 0
  private dodgeTime = 0
  private dodgeCd = 0
  private lastDir = { x: 0, y: 1 }
  private enemies: Enemy[] = []
  private projectiles: Projectile[] = []
  private enemyShots: EnemyShot[] = []
  private effects: Effect[] = []
  private particles: Particle[] = []
  private dmgTexts: DmgText[] = []
  private playerFlash = 0
  private shake = 0
  private build: SkillBuild = starterBuild()
  private skillCd: Record<string, number> = {}
  private equipAttack = 0
  private equipMaxHp = 0
  private critChance = 0
  private lifestealAmt = 0
  private onCleared?: () => void
  private onDied?: () => void

  constructor(opts: {
    world: Container
    textures: CombatTextures
    getW: () => number
    onCleared?: () => void
    onDied?: () => void
  }) {
    this.world = opts.world
    this.tex = opts.textures
    this.getW = opts.getW
    this.onCleared = opts.onCleared
    this.onDied = opts.onDied

    const p = new AnimatedSprite(opts.textures.playerWalk)
    p.anchor.set(0.5)
    p.setSize(PLAYER_SIZE, PLAYER_SIZE)
    p.animationSpeed = 0.15
    p.gotoAndStop(0)
    this.player = p
    this.world.addChild(p)
  }

  get playerMaxHp(): number {
    return PLAYER_MAX_HP + (this.build.fortify ?? 0) * 20 + this.equipMaxHp
  }

  get enemyCount(): number {
    return this.enemies.length
  }

  /** HP of the boss on a boss level (null if no boss present). */
  get bossHp(): number | null {
    const b = this.enemies.find((e) => e.isBoss)
    return b ? b.hp : null
  }
  get bossMaxHp(): number {
    const b = this.enemies.find((e) => e.isBoss)
    return b ? b.maxHp : 1
  }

  setEquip(attack: number, maxHp: number): void {
    this.equipAttack = attack
    this.equipMaxHp = maxHp
  }

  healPlayer(amount: number): void {
    if (this.state !== 'playing') return
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + amount)
    playSfx('potion')
  }

  /** Set up a level: apply build, heal (full on fresh run else a fraction), spawn. */
  startLevel(config: LevelConfig, build: SkillBuild, fullHeal: boolean): void {
    this.build = build
    this.clearEntities()
    this.state = 'playing'
    this.skillCd = {}
    this.dodgeTime = 0
    this.dodgeCd = 0
    this.playerHp = fullHeal
      ? this.playerMaxHp
      : Math.min(this.playerMaxHp, this.playerHp + this.playerMaxHp * LEVEL_HEAL_FRACTION)

    const w = this.getW()
    this.px = w / 2
    this.py = LOGICAL_H / 2
    this.player.position.set(this.px, this.py)
    this.player.alpha = 1

    this.spawnLevel(config, w)
    this.world.addChild(this.player) // keep player above enemies
  }

  update(dt: number): void {
    if (this.state !== 'playing') return
    const w = this.getW()

    // passive modifiers from the build
    this.critChance = 0.15 * (this.build.crit_mastery ?? 0)
    this.lifestealAmt = this.build.lifesteal ?? 0
    const haste = this.build.haste ?? 0
    const cdrMult = Math.pow(0.92, haste)

    // movement
    const dir = getDirection()
    if (dir.x !== 0 || dir.y !== 0) this.lastDir = dir
    if (consumeDodge() && this.dodgeCd <= 0) {
      this.dodgeTime = DODGE_TIME
      this.dodgeCd = DODGE_CD
    }
    if (this.dodgeCd > 0) this.dodgeCd -= dt
    let speed = PLAYER_SPEED * (1 + 0.1 * haste)
    let mv = dir
    if (this.dodgeTime > 0) {
      this.dodgeTime -= dt
      speed = DODGE_SPEED
      mv = this.lastDir
    }
    this.px += mv.x * speed * dt
    this.py += mv.y * speed * dt
    const ph = PLAYER_HIT_RADIUS
    this.px = Math.max(ph, Math.min(w - ph, this.px))
    this.py = Math.max(ph, Math.min(LOGICAL_H - ph, this.py))
    this.player.position.set(this.px, this.py)
    this.player.alpha = this.dodgeTime > 0 ? 0.45 : 1
    if (this.playerFlash > 0) {
      this.playerFlash -= dt
      this.player.tint = 0xff6666
    } else {
      this.player.tint = 0xffffff
    }
    const moving = dir.x !== 0 || dir.y !== 0 || this.dodgeTime > 0
    if (moving) {
      if (!this.player.playing) this.player.play()
    } else if (this.player.playing) {
      this.player.gotoAndStop(0)
    }

    // auto-cast active skills
    for (const id of Object.keys(this.build)) {
      const def = SKILLS[id]
      if (!def || def.category !== 'ACTIVE') continue
      this.skillCd[id] = (this.skillCd[id] ?? 0) - dt
      if (this.skillCd[id] <= 0) {
        this.castActive(def, this.build[id])
        this.skillCd[id] = Math.max(0.2, def.cooldown * cdrMult)
      }
    }

    // passive: flame aura (continuous damage to nearby enemies)
    const flame = this.build.flame_aura ?? 0
    if (flame > 0) {
      const r = 26 + flame * 4
      for (const e of this.enemies) {
        const dx = e.x - this.px
        const dy = e.y - this.py
        if (dx * dx + dy * dy <= (r + e.radius) * (r + e.radius)) e.hp -= flame * 8 * dt
      }
    }

    this.updateProjectiles(dt, w)
    this.updateEffects(dt)
    this.updateParticles(dt)
    this.updateDmgTexts(dt)
    this.updateEnemies(dt, ph)
    this.updateEnemyShots(dt, w, ph)

    if (this.shake > 0) {
      this.shake -= dt
      this.world.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5)
    } else if (this.world.x !== 0 || this.world.y !== 0) {
      this.world.position.set(0, 0)
    }

    if (this.playerHp <= 0) {
      this.playerHp = 0
      this.state = 'died'
      playSfx('lose')
      this.onDied?.()
    } else if (this.enemies.length === 0) {
      this.state = 'cleared'
      playSfx('clear')
      this.onCleared?.()
    }
  }

  private castActive(def: ActiveDef, level: number): void {
    const dmg = def.baseDamage + def.perLevel * (level - 1) + this.equipAttack
    if (def.cast === 'projectile') {
      const target = this.nearestEnemy()
      if (!target) return
      const ang = Math.atan2(target.y - this.py, target.x - this.px)
      const sp = def.speed ?? 180
      const spr = new Sprite(this.tex.skillProjectiles[def.id])
      spr.anchor.set(0.5)
      spr.setSize(FIREBALL_SIZE, FIREBALL_SIZE)
      spr.rotation = ang
      spr.position.set(this.px, this.py)
      this.world.addChild(spr)
      this.projectiles.push({
        spr,
        x: this.px,
        y: this.py,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        dmg,
        alive: true,
        hitsLeft: def.pierce ?? 1,
        hit: new Set(),
      })
      playSfx('shoot')
    } else if (def.cast === 'aoe_target') {
      const target = this.nearestEnemy()
      if (!target) return
      this.aoeDamage(target.x, target.y, def.radius ?? 24, dmg)
      this.spawnEffect(def.id, target.x, target.y, (def.radius ?? 24) * 2)
    } else {
      // aoe_self
      this.aoeDamage(this.px, this.py, def.radius ?? 30, dmg)
      this.spawnEffect(def.id, this.px, this.py, (def.radius ?? 30) * 2)
      playSfx('shoot')
    }
  }

  private aoeDamage(cx: number, cy: number, radius: number, dmg: number): void {
    for (const e of this.enemies) {
      const dx = e.x - cx
      const dy = e.y - cy
      const r = radius + e.radius
      if (dx * dx + dy * dy <= r * r) this.applyDamage(e, dmg)
    }
  }

  private applyDamage(e: Enemy, dmg: number): void {
    const crit = Math.random() < this.critChance
    const d = crit ? dmg * 2 : dmg
    e.hp -= d
    e.flash = 0.08
    this.spawnDmgText(e.x, e.y - e.size / 2, Math.round(d), crit)
    if (this.lifestealAmt > 0) this.playerHp = Math.min(this.playerMaxHp, this.playerHp + this.lifestealAmt)
    playSfx('hit')
  }

  private spawnDmgText(x: number, y: number, amount: number, crit: boolean): void {
    const t = new Text({
      text: crit ? `${amount}!` : `${amount}`,
      style: {
        fill: crit ? 0xffd23f : 0xffffff,
        fontSize: crit ? 15 : 11,
        fontFamily: 'Zpix, sans-serif',
        stroke: { color: 0x000000, width: 3 },
      },
    })
    t.anchor.set(0.5)
    t.position.set(x, y)
    this.world.addChild(t)
    this.dmgTexts.push({ t, x, y, ttl: 0.6, life: 0.6 })
  }

  private spawnPoof(x: number, y: number, big: boolean): void {
    const n = big ? 14 : 6
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 30 + Math.random() * 50
      const g = new Graphics()
      g.circle(0, 0, big ? 3 : 2).fill('#ffffff')
      g.position.set(x, y)
      this.world.addChild(g)
      this.particles.push({ g, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl: 0.35, life: 0.35 })
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.ttl -= dt
      p.g.position.set(p.x, p.y)
      p.g.alpha = Math.max(0, p.ttl / p.life)
    }
    this.particles = this.particles.filter((p) => {
      if (p.ttl <= 0) {
        p.g.destroy()
        return false
      }
      return true
    })
  }

  private updateDmgTexts(dt: number): void {
    for (const d of this.dmgTexts) {
      d.y -= 20 * dt
      d.ttl -= dt
      d.t.position.set(d.x, d.y)
      d.t.alpha = Math.max(0, d.ttl / d.life)
    }
    this.dmgTexts = this.dmgTexts.filter((d) => {
      if (d.ttl <= 0) {
        d.t.destroy()
        return false
      }
      return true
    })
  }

  private fireEnemyShot(e: Enemy): void {
    const enraged = e.hp < e.maxHp * 0.5
    const toPlayer = Math.atan2(this.py - e.y, this.px - e.x)
    e.castCount += 1

    const fan = (offsets: number[], speed: number) => {
      for (const o of offsets) this.spawnEnemyBullet(e, toPlayer + o, speed)
    }
    const ring = (n: number, speed: number) => {
      for (let i = 0; i < n; i++) this.spawnEnemyBullet(e, (i / n) * Math.PI * 2, speed)
    }

    switch (e.pattern) {
      case 'aimed': // goblin chieftain: rapid aimed shots
        this.spawnEnemyBullet(e, toPlayer, 160)
        if (enraged) fan([-0.12, 0.12], 160)
        break
      case 'radial': // dire bear: ring burst
        ring(enraged ? 12 : 8, 100)
        break
      case 'mixed': // dragon: alternate ring / fan
        if (e.castCount % 2 === 0) ring(enraged ? 14 : 10, 110)
        else fan(enraged ? [-0.3, -0.1, 0.1, 0.3] : [-0.2, 0, 0.2], 130)
        break
      case 'spread': // orc warlord: aimed fan
      default:
        fan(enraged ? [-0.3, -0.1, 0.1, 0.3] : [-0.2, 0, 0.2], 115)
    }
  }

  private spawnEnemyBullet(e: Enemy, ang: number, speed: number): void {
    const g = new Graphics()
    g.circle(0, 0, 4).fill('#d63031')
    g.circle(0, 0, 4).stroke({ color: 0x000000, width: 1, alpha: 0.4 })
    g.position.set(e.x, e.y)
    this.world.addChild(g)
    this.enemyShots.push({ g, x: e.x, y: e.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg: 10, alive: true })
  }

  private updateEnemyShots(dt: number, w: number, ph: number): void {
    for (const s of this.enemyShots) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.g.position.set(s.x, s.y)
      if (s.x < -12 || s.x > w + 12 || s.y < -12 || s.y > LOGICAL_H + 12) {
        s.alive = false
        continue
      }
      const dx = this.px - s.x
      const dy = this.py - s.y
      if (dx * dx + dy * dy <= (ph + 4) * (ph + 4)) {
        s.alive = false
        if (this.dodgeTime <= 0) {
          this.playerHp -= s.dmg
          this.playerFlash = 0.12
          this.shake = 0.12
          playSfx('hurt')
        }
      }
    }
    this.enemyShots = this.enemyShots.filter((s) => {
      if (!s.alive) {
        s.g.destroy()
        return false
      }
      return true
    })
  }

  private spawnEffect(skillId: string, x: number, y: number, size: number): void {
    const tex = this.tex.skillProjectiles[skillId]
    if (!tex) return
    const spr = new Sprite(tex)
    spr.anchor.set(0.5)
    spr.setSize(size, size)
    spr.position.set(x, y)
    this.world.addChild(spr)
    this.effects.push({ spr, ttl: 0.25, life: 0.25 })
  }

  private updateProjectiles(dt: number, w: number): void {
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt
      pr.y += pr.vy * dt
      pr.spr.position.set(pr.x, pr.y)
      if (pr.x < -12 || pr.x > w + 12 || pr.y < -12 || pr.y > LOGICAL_H + 12) {
        pr.alive = false
        continue
      }
      for (const e of this.enemies) {
        if (pr.hit.has(e)) continue
        const dx = e.x - pr.x
        const dy = e.y - pr.y
        const r = e.radius + FIREBALL_RADIUS
        if (dx * dx + dy * dy <= r * r) {
          this.applyDamage(e, pr.dmg)
          pr.hit.add(e)
          pr.hitsLeft -= 1
          if (pr.hitsLeft <= 0) {
            pr.alive = false
            break
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => {
      if (!pr.alive) {
        pr.spr.destroy()
        return false
      }
      return true
    })
  }

  private updateEffects(dt: number): void {
    for (const fx of this.effects) {
      fx.ttl -= dt
      fx.spr.alpha = Math.max(0, fx.ttl / fx.life)
    }
    this.effects = this.effects.filter((fx) => {
      if (fx.ttl <= 0) {
        fx.spr.destroy()
        return false
      }
      return true
    })
  }

  private updateEnemies(dt: number, ph: number): void {
    for (const e of this.enemies) {
      if (e.touchCd > 0) e.touchCd -= dt
      const dx = this.px - e.x
      const dy = this.py - e.y
      const m = Math.hypot(dx, dy) || 1
      e.x += (dx / m) * e.speed * dt
      e.y += (dy / m) * e.speed * dt
      e.spr.position.set(e.x, e.y)
      this.drawEnemyBar(e)

      // hurt flash
      if (e.flash > 0) {
        e.flash -= dt
        e.spr.tint = 0xff6666
      } else {
        e.spr.tint = 0xffffff
      }

      // boss ranged attack (faster when enraged below 50% HP)
      if (e.isBoss && e.shootEvery > 0) {
        e.atkCd -= dt
        if (e.atkCd <= 0) {
          this.fireEnemyShot(e)
          e.atkCd = e.shootEvery * (e.hp < e.maxHp * 0.5 ? 0.6 : 1)
        }
      }

      if (m <= e.radius + ph && e.touchCd <= 0 && this.dodgeTime <= 0) {
        this.playerHp -= e.touchDmg
        e.touchCd = ENEMY_TOUCH_INTERVAL
        this.playerFlash = 0.12
        this.shake = 0.12
        playSfx('hurt')
      }
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) {
        this.spawnPoof(e.x, e.y, e.isBoss)
        if (e.isBoss) this.shake = 0.3
        e.spr.destroy()
        e.bar.destroy()
        return false
      }
      return true
    })
  }

  private clearEntities(): void {
    for (const e of this.enemies) {
      e.spr.destroy()
      e.bar.destroy()
    }
    for (const pr of this.projectiles) pr.spr.destroy()
    for (const s of this.enemyShots) s.g.destroy()
    for (const fx of this.effects) fx.spr.destroy()
    for (const p of this.particles) p.g.destroy()
    for (const d of this.dmgTexts) d.t.destroy()
    this.enemies = []
    this.projectiles = []
    this.enemyShots = []
    this.effects = []
    this.particles = []
    this.dmgTexts = []
    this.playerFlash = 0
    this.shake = 0
    this.player.tint = 0xffffff
    this.world.position.set(0, 0)
  }

  private spawnLevel(config: LevelConfig, w: number): void {
    if (config.isBoss) {
      const frames = this.tex.bosses[config.level] ?? this.tex.enemies[0]
      const size = config.level >= 20 ? 88 : 64
      const bp: Record<number, { pattern: string; every: number }> = {
        5: { pattern: 'spread', every: 1.5 },
        10: { pattern: 'aimed', every: 0.7 },
        15: { pattern: 'radial', every: 2.0 },
        20: { pattern: 'mixed', every: 1.1 },
      }
      const pc = bp[config.level] ?? { pattern: 'spread', every: 1.5 }
      this.addEnemy(frames, w / 2, size / 2 + 14, config.enemyHp, size, size * 0.4, ENEMY_SPEED * 0.55, ENEMY_TOUCH_DAMAGE * 2, true, pc.every, pc.pattern)
      return
    }
    for (let i = 0; i < config.enemyCount; i++) {
      const frames = this.tex.enemies[i % this.tex.enemies.length]
      let x: number
      let y: number
      if (Math.random() < 0.5) {
        x = Math.random() * w
        y = Math.random() < 0.5 ? 12 : LOGICAL_H - 12
      } else {
        x = Math.random() < 0.5 ? 12 : w - 12
        y = Math.random() * LOGICAL_H
      }
      this.addEnemy(frames, x, y, config.enemyHp, ENEMY_SIZE, ENEMY_RADIUS, ENEMY_SPEED, ENEMY_TOUCH_DAMAGE)
    }
  }

  private addEnemy(
    frames: Texture[],
    x: number,
    y: number,
    hp: number,
    size: number,
    radius: number,
    speed: number,
    touchDmg: number,
    isBoss = false,
    shootEvery = 0,
    pattern = '',
  ): void {
    const spr = new AnimatedSprite(frames)
    spr.anchor.set(0.5)
    spr.setSize(size, size)
    spr.position.set(x, y)
    spr.animationSpeed = 0.12
    if (frames.length > 1) spr.play()
    this.world.addChild(spr)
    const bar = new Graphics()
    this.world.addChild(bar)
    const e: Enemy = {
      spr, bar, x, y, hp, maxHp: hp, touchCd: 0, radius, speed, touchDmg, size,
      isBoss, shootEvery, atkCd: shootEvery, flash: 0, pattern, castCount: 0,
    }
    this.drawEnemyBar(e)
    this.enemies.push(e)
  }

  private drawEnemyBar(e: Enemy): void {
    const bw = Math.max(18, e.size * 0.85)
    const bh = 3
    e.bar.clear()
    e.bar.position.set(e.x, e.y - e.size / 2 - 5)
    if (e.hp < e.maxHp && e.hp > 0) {
      e.bar.rect(-bw / 2, 0, bw, bh).fill({ color: 0x000000, alpha: 0.6 })
      const frac = Math.max(0, e.hp / e.maxHp)
      e.bar.rect(-bw / 2 + 0.5, 0.5, (bw - 1) * frac, bh - 1).fill(0x7ed321)
    }
  }

  private nearestEnemy(): Enemy | null {
    let best: Enemy | null = null
    let bestD = Infinity
    for (const e of this.enemies) {
      const dx = e.x - this.px
      const dy = e.y - this.py
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = e
      }
    }
    return best
  }
}
