import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import {
  LOGICAL_H,
  PLAYER_SPEED,
  PLAYER_SIZE,
  PLAYER_MAX_HP,
  PLAYER_HIT_RADIUS,
  DODGE_SPEED,
  DODGE_TIME,
  DODGE_CD,
  FIREBALL_CD,
  FIREBALL_SPEED,
  FIREBALL_DAMAGE,
  FIREBALL_RADIUS,
  FIREBALL_SIZE,
  ENEMY_SPEED,
  ENEMY_RADIUS,
  ENEMY_SIZE,
  ENEMY_TOUCH_DAMAGE,
  ENEMY_TOUCH_INTERVAL,
} from '../config'
import { getDirection, consumeDodge } from '../input'
import { emptyBuild, type Build } from '../build'
import { type LevelConfig } from '../levels'

type Enemy = {
  spr: Sprite
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
}
type Projectile = { spr: Sprite; x: number; y: number; vx: number; vy: number; dmg: number; alive: boolean }

export type CombatState = 'playing' | 'cleared' | 'died'
export type CombatTextures = { player: Texture; enemies: Texture[]; fireball: Texture; boss: Texture }

/**
 * Phase 3 combat: runs one level at a time. The accumulated build modifies the
 * player's stats. Clearing all enemies => onCleared; HP 0 => onDied.
 */
export class CombatScene {
  readonly world: Container
  playerHp = PLAYER_MAX_HP
  attackCd = 0
  state: CombatState = 'playing'

  private tex: CombatTextures
  private getW: () => number
  private player: Sprite
  private px = 0
  private py = 0
  private dodgeTime = 0
  private dodgeCd = 0
  private lastDir = { x: 0, y: 1 }
  private enemies: Enemy[] = []
  private projectiles: Projectile[] = []
  private build: Build = emptyBuild()
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

    const p = new Sprite(opts.textures.player)
    p.anchor.set(0.5)
    p.setSize(PLAYER_SIZE, PLAYER_SIZE)
    this.player = p
    this.world.addChild(p)
  }

  get playerMaxHp(): number {
    return PLAYER_MAX_HP + this.build.hp * 20
  }

  get enemyCount(): number {
    return this.enemies.length
  }

  /** Set up a level: apply the build, full-heal, spawn the wave or boss. */
  startLevel(config: LevelConfig, build: Build): void {
    this.build = build
    this.clearEntities()
    this.state = 'playing'
    this.attackCd = 0
    this.dodgeTime = 0
    this.dodgeCd = 0
    this.playerHp = this.playerMaxHp

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
    const dir = getDirection()
    if (dir.x !== 0 || dir.y !== 0) this.lastDir = dir

    if (consumeDodge() && this.dodgeCd <= 0) {
      this.dodgeTime = DODGE_TIME
      this.dodgeCd = DODGE_CD
    }
    if (this.dodgeCd > 0) this.dodgeCd -= dt

    let speed = PLAYER_SPEED * (1 + this.build.speed * 0.12)
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

    // auto-attack (with build modifiers)
    this.attackCd -= dt
    if (this.attackCd <= 0) {
      const target = this.nearestEnemy()
      if (target) {
        this.attackCd = Math.max(0.2, FIREBALL_CD * Math.pow(0.85, this.build.cdr))
        const base = Math.atan2(target.y - this.py, target.x - this.px)
        const shots = 1 + this.build.multishot
        const dmg = FIREBALL_DAMAGE + this.build.dmg * 6
        for (let i = 0; i < shots; i++) {
          const ang = base + (i - (shots - 1) / 2) * 0.18
          const spr = new Sprite(this.tex.fireball)
          spr.anchor.set(0.5)
          spr.setSize(FIREBALL_SIZE, FIREBALL_SIZE)
          spr.position.set(this.px, this.py)
          this.world.addChild(spr)
          this.projectiles.push({
            spr,
            x: this.px,
            y: this.py,
            vx: Math.cos(ang) * FIREBALL_SPEED,
            vy: Math.sin(ang) * FIREBALL_SPEED,
            dmg,
            alive: true,
          })
        }
      }
    }

    // projectiles
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt
      pr.y += pr.vy * dt
      pr.spr.position.set(pr.x, pr.y)
      if (pr.x < -10 || pr.x > w + 10 || pr.y < -10 || pr.y > LOGICAL_H + 10) {
        pr.alive = false
        continue
      }
      for (const e of this.enemies) {
        const dx = e.x - pr.x
        const dy = e.y - pr.y
        const r = e.radius + FIREBALL_RADIUS
        if (dx * dx + dy * dy <= r * r) {
          e.hp -= pr.dmg
          pr.alive = false
          break
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

    // enemies
    for (const e of this.enemies) {
      if (e.touchCd > 0) e.touchCd -= dt
      const dx = this.px - e.x
      const dy = this.py - e.y
      const m = Math.hypot(dx, dy) || 1
      e.x += (dx / m) * e.speed * dt
      e.y += (dy / m) * e.speed * dt
      e.spr.position.set(e.x, e.y)
      this.drawEnemyBar(e)
      if (m <= e.radius + ph && e.touchCd <= 0 && this.dodgeTime <= 0) {
        this.playerHp -= e.touchDmg
        e.touchCd = ENEMY_TOUCH_INTERVAL
      }
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) {
        e.spr.destroy()
        e.bar.destroy()
        return false
      }
      return true
    })

    if (this.playerHp <= 0) {
      this.playerHp = 0
      this.state = 'died'
      this.onDied?.()
    } else if (this.enemies.length === 0) {
      this.state = 'cleared'
      this.onCleared?.()
    }
  }

  private clearEntities(): void {
    for (const e of this.enemies) {
      e.spr.destroy()
      e.bar.destroy()
    }
    for (const pr of this.projectiles) pr.spr.destroy()
    this.enemies = []
    this.projectiles = []
  }

  private spawnLevel(config: LevelConfig, w: number): void {
    if (config.isBoss) {
      this.addEnemy(this.tex.boss, w / 2, 44, config.enemyHp, 64, 26, ENEMY_SPEED * 0.55, ENEMY_TOUCH_DAMAGE * 2)
      return
    }
    for (let i = 0; i < config.enemyCount; i++) {
      const texture = this.tex.enemies[i % this.tex.enemies.length]
      let x: number
      let y: number
      if (Math.random() < 0.5) {
        x = Math.random() * w
        y = Math.random() < 0.5 ? 12 : LOGICAL_H - 12
      } else {
        x = Math.random() < 0.5 ? 12 : w - 12
        y = Math.random() * LOGICAL_H
      }
      this.addEnemy(texture, x, y, config.enemyHp, ENEMY_SIZE, ENEMY_RADIUS, ENEMY_SPEED, ENEMY_TOUCH_DAMAGE)
    }
  }

  private addEnemy(
    texture: Texture,
    x: number,
    y: number,
    hp: number,
    size: number,
    radius: number,
    speed: number,
    touchDmg: number,
  ): void {
    const spr = new Sprite(texture)
    spr.anchor.set(0.5)
    spr.setSize(size, size)
    spr.position.set(x, y)
    this.world.addChild(spr)
    const bar = new Graphics()
    this.world.addChild(bar)
    const e: Enemy = { spr, bar, x, y, hp, maxHp: hp, touchCd: 0, radius, speed, touchDmg, size }
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
