import { useEffect, useRef } from 'react'
import { AnimatedSprite, Application, Assets, Container, Sprite, Text } from 'pixi.js'
import { LOGICAL_W, LOGICAL_H, PLAYER_SPEED, PLAYER_SIZE, PLAYER_HIT_RADIUS } from './config'
import { initKeyboard, getDirection, consumeInteract } from './input'
import { playerBasePath } from './player'
import { loadFrames, WALK_FRAMES } from './anims'

// Facilities are drawn INTO the illustrated map; these are invisible interaction
// hotspots positioned by fraction (u,v) so they track the stretched map.
type Facility = { id: string; label: string; u: number; v: number; gather: boolean; range?: number }

const FACILITIES: Facility[] = [
  { id: 'tree', label: '採集樹(木)', u: 0.15, v: 0.22, gather: true, range: 60 },
  { id: 'house', label: '工坊(合成/裝備)', u: 0.48, v: 0.15, gather: false },
  { id: 'rock', label: '礦點(礦)', u: 0.74, v: 0.2, gather: true, range: 52 },
  { id: 'farm', label: '農田', u: 0.14, v: 0.62, gather: false, range: 72 },
  { id: 'pond', label: '池塘(魚)', u: 0.66, v: 0.58, gather: true, range: 52 },
  { id: 'portal', label: '傳送門 ▶ 出發', u: 0.47, v: 0.78, gather: false },
]

// Impassable areas as fractions of the field.
const COLLIDERS = [
  { u0: 0.68, v0: 0.44, u1: 0.99, v1: 0.86 }, // pond water
  { u0: 0.6, v0: 0.0, u1: 1.0, v1: 0.1 }, // top-right rocky cliff
  { u0: 0.0, v0: 0.9, u1: 1.0, v1: 1.0 }, // bottom stone border
]

const INTERACT_RANGE = 42
const GATHER_CD_MS = 3000

/**
 * Walkable home base over a single illustrated map image (facilities drawn in).
 * Invisible hotspots drive proximity prompts + interaction; labels name them.
 */
export default function HubStage(props: { onAction: (id: string) => void; onNear: (label: string | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    let app: Application | null = null
    let destroyed = false
    let detachLayout: (() => void) | null = null
    const detachKeys = initKeyboard()
    const cooldowns: Record<string, number> = {}

    ;(async () => {
      const pixi = new Application()
      await pixi.init({ background: '#000000', resizeTo: window, antialias: false })
      if (destroyed) {
        pixi.destroy(true)
        return
      }
      app = pixi
      hostRef.current?.appendChild(pixi.canvas)

      const world = new Container()
      pixi.stage.addChild(world)
      const bounds = { w: LOGICAL_W }

      const [sceneTex, playerWalk] = await Promise.all([
        Assets.load('/assets/tiles/home/scene.png'),
        loadFrames(playerBasePath(), 'walk', WALK_FRAMES),
      ])
      sceneTex.source.scaleMode = 'nearest'

      const ground = new Sprite(sceneTex)
      ground.position.set(0, 0)
      ground.width = LOGICAL_W
      ground.height = LOGICAL_H
      world.addChild(ground)

      const player = new AnimatedSprite(playerWalk)
      player.anchor.set(0.5)
      player.setSize(PLAYER_SIZE, PLAYER_SIZE)
      player.animationSpeed = 0.15
      player.gotoAndStop(0)
      player.position.set(LOGICAL_W / 2, LOGICAL_H / 2)
      world.addChild(player)

      // Persistent facility name labels (counter-scaled to stay crisp & fixed-size).
      const labels = FACILITIES.map((f) => {
        const t = new Text({
          text: f.label,
          style: { fill: 0xffffff, fontSize: 14, fontFamily: 'Zpix, sans-serif', stroke: { color: 0x000000, width: 4 } },
        })
        t.anchor.set(0.5)
        world.addChild(t)
        return t
      })

      const layout = () => {
        const scale = pixi.screen.height / LOGICAL_H
        world.scale.set(scale)
        world.position.set(0, 0)
        bounds.w = Math.ceil(pixi.screen.width / scale)
        ground.width = bounds.w
        labels.forEach((t, i) => {
          const f = FACILITIES[i]
          t.scale.set(1 / scale)
          t.position.set(f.u * bounds.w, f.v * LOGICAL_H - 22)
        })
      }
      layout()
      const onOrient = () => window.setTimeout(layout, 200)
      window.addEventListener('resize', layout)
      window.addEventListener('orientationchange', onOrient)
      detachLayout = () => {
        window.removeEventListener('resize', layout)
        window.removeEventListener('orientationchange', onOrient)
      }

      let lastNear: string | null = null
      const half = PLAYER_HIT_RADIUS

      const blocked = (px: number, py: number): boolean => {
        for (const c of COLLIDERS) {
          if (
            px > c.u0 * bounds.w - half &&
            px < c.u1 * bounds.w + half &&
            py > c.v0 * LOGICAL_H - half &&
            py < c.v1 * LOGICAL_H + half
          ) {
            return true
          }
        }
        return false
      }

      pixi.ticker.add((ticker) => {
        const dt = Math.min(ticker.deltaMS / 1000, 0.05)
        const dir = getDirection()
        // axis-separated movement so the player slides along walls
        const nx = player.x + dir.x * PLAYER_SPEED * dt
        if (!blocked(nx, player.y)) player.x = nx
        const ny = player.y + dir.y * PLAYER_SPEED * dt
        if (!blocked(player.x, ny)) player.y = ny
        player.x = Math.max(half, Math.min(bounds.w - half, player.x))
        player.y = Math.max(half, Math.min(LOGICAL_H - half, player.y))
        const moving = dir.x !== 0 || dir.y !== 0
        if (moving) {
          if (!player.playing) player.play()
        } else if (player.playing) {
          player.gotoAndStop(0)
        }

        // nearest facility hotspot in range (each may have its own range)
        let near: Facility | null = null
        let bestD = Infinity
        for (const f of FACILITIES) {
          const dx = f.u * bounds.w - player.x
          const dy = f.v * LOGICAL_H - player.y
          const d = dx * dx + dy * dy
          const r = f.range ?? INTERACT_RANGE
          if (d <= r * r && d < bestD) {
            bestD = d
            near = f
          }
        }

        const now = performance.now()
        if ((near?.id ?? null) !== lastNear) {
          lastNear = near?.id ?? null
          let prompt: string | null = null
          if (near) {
            const onCd = near.gather && (cooldowns[near.id] ?? 0) > now
            prompt = onCd ? `${near.label}(冷卻中)` : `${near.label} — 按 E / 互動`
          }
          propsRef.current.onNear(prompt)
        }

        if (consumeInteract() && near) {
          if (near.gather && (cooldowns[near.id] ?? 0) > now) return
          if (near.gather) cooldowns[near.id] = now + GATHER_CD_MS
          propsRef.current.onAction(near.id)
        }
      })
    })()

    return () => {
      destroyed = true
      detachKeys()
      detachLayout?.()
      app?.destroy(true, { children: true })
    }
  }, [])

  return <div ref={hostRef} />
}
