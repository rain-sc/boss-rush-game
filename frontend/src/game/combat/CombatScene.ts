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
  ENEMY_SPEED,
  ENEMY_HP,
  ENEMY_RADIUS,
  ENEMY_TOUCH_DAMAGE,
  ENEMY_TOUCH_INTERVAL,
  WAVE_COUNT,
} from '../config'
import { getDirection, consumeDodge } from '../input'

type Enemy = { g: Graphics; x: number; y: number; hp: number; touchCd: number }
type Projectile = { g: Graphics; x: number; y: number; vx: number; vy: number; alive: boolean }

export type CombatState = 'playing' | 'win' | 'lose'

/**
 * Phase 2 combat vertical slice: a wave of enemies chase the player; the player
 * auto-fires at the nearest enemy and can dodge (dash + i-frames). Clear the
 * wave to win; reach 0 HP to lose. All visuals are placeholders for now.
 */
export class CombatScene {
  readonly world: Container
  readonly playerMaxHp = PLAYER_MAX_HP
  playerHp = PLAYER_MAX_HP
  attackCd = 0
  state: CombatState = 'playing'

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
    texture: Texture
    getW: () => number
    onEnd?: (s: CombatState) => void
  }) {
    this.world = opts.world
    this.getW = opts.getW
    this.onEnd = opts.onEnd

    const p = new Sprite(opts.texture)
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
    for (const e of this.enemies) e.g.destroy()
    for (const pr of this.projectiles) pr.g.destroy()
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
    // keep the player rendered above the field/enemies
    this.world.addChild(this.player)
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
        const g = new Graphics()
        g.circle(0, 0, FIREBALL_RADIUS).fill('#ff8c1a')
        g.position.set(this.px, this.py)
        this.world.addChild(g)
        this.projectiles.push({
          g,
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
      pr.g.position.set(pr.x, pr.y)
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
        pr.g.destroy()
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
      e.g.position.set(e.x, e.y)
      if (m <= ENEMY_RADIUS + ph && e.touchCd <= 0 && this.dodgeTime <= 0) {
        this.playerHp -= ENEMY_TOUCH_DAMAGE
        e.touchCd = ENEMY_TOUCH_INTERVAL
      }
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) {
        e.g.destroy()
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
      const g = new Graphics()
      g.circle(0, 0, ENEMY_RADIUS).fill('#c0392b')
      g.circle(0, 0, ENEMY_RADIUS).stroke({ color: 0x000000, width: 1, alpha: 0.4 })
      // spawn along the edges so they walk in
      let x: number
      let y: number
      if (Math.random() < 0.5) {
        x = Math.random() * w
        y = Math.random() < 0.5 ? 12 : LOGICAL_H - 12
      } else {
        x = Math.random() < 0.5 ? 12 : w - 12
        y = Math.random() * LOGICAL_H
      }
      g.position.set(x, y)
      this.world.addChild(g)
      this.enemies.push({ g, x, y, hp: ENEMY_HP, touchCd: 0 })
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
