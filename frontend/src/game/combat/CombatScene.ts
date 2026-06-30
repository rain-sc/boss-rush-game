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
  ENEMY_HP,
  ENEMY_RADIUS,
  ENEMY_SIZE,
  ENEMY_TOUCH_DAMAGE,
  ENEMY_TOUCH_INTERVAL,
  WAVE_COUNT,
} from '../config'
import { getDirection, consumeDodge } from '../input'

type Enemy = { spr: Sprite; bar: Graphics; x: number; y: number; hp: number; maxHp: number; touchCd: number }
type Projectile = { spr: Sprite; x: number; y: number; vx: number; vy: number; alive: boolean }

export type CombatState = 'playing' | 'win' | 'lose'

export type CombatTextures = {
  player: Texture
  enemies: Texture[]
  fireball: Texture
}

/**
 * Phase 2 combat vertical slice: a wave of enemies chase the player; the player
 * auto-fires at the nearest enemy and can dodge (dash + i-frames). Clear the
 * wave to win; reach 0 HP to lose.
 */
export class CombatScene {
  readonly world: Container
  readonly playerMaxHp = PLAYER_MAX_HP
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
  private onEnd?: (s: CombatState) => void

  constructor(opts: {
    world: Container
    textures: CombatTextures
    getW: () => number
    onEnd?: (s: CombatState) => void
  }) {
    this.world = opts.world
    this.tex = opts.textures
    this.getW = opts.getW
    this.onEnd = opts.onEnd

    const p = new Sprite(opts.textures.player)
    p.anchor.set(0.5)
    p.setSize(PLAYER_SIZE, PLAYER_SIZE)
    this.player = p
    this.world.addChild(p)

    this.reset()
  }

  get enemyCount(): number {
    return this.enemies.length
  }

  reset(): void {
    for (const e of this.enemies) {
      e.spr.destroy()
      e.bar.destroy()
    }
    for (const pr of this.projectiles) pr.spr.destroy()
    this.enemies = []
    this.projectiles = []
    this.playerHp = this.playerMaxHp
    this.attackCd = 0
    this.dodgeTime = 0
    this.dodgeCd = 0
    this.state = 'playing'

    const w = this.getW()
    this.px = w / 2
    this.py = LOGICAL_H / 2
    this.player.position.set(this.px, this.py)
    this.player.alpha = 1
    this.spawnWave(w)
    this.world.addChild(this.player) // keep player above enemies
  }

  update(dt: number): void {
    if (this.state !== 'playing') return
    const w = this.getW()
    const dir = getDirection()
    if (dir.x !== 0 || dir.y !== 0) this.lastDir = dir

    // dodge
    if (consumeDodge() && this.dodgeCd <= 0) {
      this.dodgeTime = DODGE_TIME
      this.dodgeCd = DODGE_CD
    }
    if (this.dodgeCd > 0) this.dodgeCd -= dt
    let speed = PLAYER_SPEED
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

    // auto-attack: fireball at nearest enemy
    this.attackCd -= dt
    if (this.attackCd <= 0) {
      const target = this.nearestEnemy()
      if (target) {
        this.attackCd = FIREBALL_CD
        const dx = target.x - this.px
        const dy = target.y - this.py
        const m = Math.hypot(dx, dy) || 1
        const spr = new Sprite(this.tex.fireball)
        spr.anchor.set(0.5)
        spr.setSize(FIREBALL_SIZE, FIREBALL_SIZE)
        spr.position.set(this.px, this.py)
        this.world.addChild(spr)
        this.projectiles.push({
          spr,
          x: this.px,
          y: this.py,
          vx: (dx / m) * FIREBALL_SPEED,
          vy: (dy / m) * FIREBALL_SPEED,
          alive: true,
        })
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
        const r = ENEMY_RADIUS + FIREBALL_RADIUS
        if (dx * dx + dy * dy <= r * r) {
          e.hp -= FIREBALL_DAMAGE
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

    // enemies chase + contact damage
    for (const e of this.enemies) {
      if (e.touchCd > 0) e.touchCd -= dt
      const dx = this.px - e.x
      const dy = this.py - e.y
      const m = Math.hypot(dx, dy) || 1
      e.x += (dx / m) * ENEMY_SPEED * dt
      e.y += (dy / m) * ENEMY_SPEED * dt
      e.spr.position.set(e.x, e.y)
      this.drawEnemyBar(e)
      if (m <= ENEMY_RADIUS + ph && e.touchCd <= 0 && this.dodgeTime <= 0) {
        this.playerHp -= ENEMY_TOUCH_DAMAGE
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

    // win / lose
    if (this.playerHp <= 0) {
      this.playerHp = 0
      this.end('lose')
    } else if (this.enemies.length === 0) {
      this.end('win')
    }
  }

  private end(s: CombatState): void {
    this.state = s
    this.onEnd?.(s)
  }

  private spawnWave(w: number): void {
    for (let i = 0; i < WAVE_COUNT; i++) {
      const texture = this.tex.enemies[i % this.tex.enemies.length]
      const spr = new Sprite(texture)
      spr.anchor.set(0.5)
      spr.setSize(ENEMY_SIZE, ENEMY_SIZE)
      let x: number
      let y: number
      if (Math.random() < 0.5) {
        x = Math.random() * w
        y = Math.random() < 0.5 ? 12 : LOGICAL_H - 12
      } else {
        x = Math.random() < 0.5 ? 12 : w - 12
        y = Math.random() * LOGICAL_H
      }
      spr.position.set(x, y)
      this.world.addChild(spr)
      const bar = new Graphics()
      this.world.addChild(bar)
      const e: Enemy = { spr, bar, x, y, hp: ENEMY_HP, maxHp: ENEMY_HP, touchCd: 0 }
      this.drawEnemyBar(e)
      this.enemies.push(e)
    }
  }

  /** Small HP bar above an enemy; only visible once it has taken damage. */
  private drawEnemyBar(e: Enemy): void {
    const bw = 22
    const bh = 3
    e.bar.clear()
    e.bar.position.set(e.x, e.y - ENEMY_SIZE / 2 - 5)
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
