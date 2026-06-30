import { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, Sprite, Text, TilingSprite } from 'pixi.js'
import { LOGICAL_W, LOGICAL_H, PLAYER_SPEED, PLAYER_SIZE, PLAYER_HIT_RADIUS } from './config'
import { initKeyboard, getDirection, consumeInteract } from './input'

type Facility = { id: string; label: string; x: number; y: number; color: number; gather: boolean }

const FACILITIES: Facility[] = [
  { id: 'tree', label: '採集樹(木)', x: 120, y: 60, color: 0x1b5e20, gather: true },
  { id: 'rock', label: '礦點(礦)', x: 380, y: 64, color: 0x9e9e9e, gather: true },
  { id: 'farm', label: '農田', x: 90, y: 180, color: 0x8d6e63, gather: false },
  { id: 'pond', label: '池塘(魚)', x: 400, y: 200, color: 0x4aa3df, gather: true },
  { id: 'portal', label: '傳送門 ▶ 出發', x: 240, y: 235, color: 0x9b59b6, gather: false },
]

const INTERACT_RANGE = 30
const GATHER_CD_MS = 3000

/**
 * Walkable home base. The player roams; standing near a facility shows a prompt;
 * interacting (E / button) triggers onAction. Gather/fish nodes have a cooldown.
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

      const [groundTex, playerTex] = await Promise.all([
        Assets.load('/assets/tiles/battle/forest_ground.png'),
        Assets.load('/assets/characters/player/male/idle.png'),
      ])
      for (const t of [groundTex, playerTex]) t.source.scaleMode = 'nearest'

      const ground = new TilingSprite({ texture: groundTex, width: LOGICAL_W, height: LOGICAL_H })
      world.addChild(ground)

      // Facility markers (placeholder rectangles + labels).
      const markers: Record<string, Graphics> = {}
      for (const f of FACILITIES) {
        const g = new Graphics()
        g.roundRect(-16, -16, 32, 32, 5).fill(f.color)
        g.roundRect(-16, -16, 32, 32, 5).stroke({ color: 0x000000, width: 1, alpha: 0.5 })
        g.position.set(f.x, f.y)
        world.addChild(g)
        markers[f.id] = g
        const label = new Text({
          text: f.label,
          style: { fill: 0xffffff, fontSize: 9, fontFamily: 'sans-serif', stroke: { color: 0x000000, width: 3 } },
        })
        label.anchor.set(0.5)
        label.position.set(f.x, f.y - 24)
        world.addChild(label)
      }

      const player = new Sprite(playerTex)
      player.anchor.set(0.5)
      player.setSize(PLAYER_SIZE, PLAYER_SIZE)
      player.position.set(LOGICAL_W / 2, LOGICAL_H / 2)
      world.addChild(player)

      const layout = () => {
        const scale = pixi.screen.height / LOGICAL_H
        world.scale.set(scale)
        world.position.set(0, 0)
        bounds.w = Math.ceil(pixi.screen.width / scale)
        ground.width = bounds.w
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

      pixi.ticker.add((ticker) => {
        const dt = Math.min(ticker.deltaMS / 1000, 0.05)
        const dir = getDirection()
        player.x += dir.x * PLAYER_SPEED * dt
        player.y += dir.y * PLAYER_SPEED * dt
        player.x = Math.max(half, Math.min(bounds.w - half, player.x))
        player.y = Math.max(half, Math.min(LOGICAL_H - half, player.y))

        // nearest facility in range
        let near: Facility | null = null
        let bestD = INTERACT_RANGE * INTERACT_RANGE
        for (const f of FACILITIES) {
          const dx = f.x - player.x
          const dy = f.y - player.y
          const d = dx * dx + dy * dy
          if (d <= bestD) {
            bestD = d
            near = f
          }
        }

        // cooldown dimming
        const now = performance.now()
        for (const f of FACILITIES) {
          markers[f.id].alpha = f.gather && (cooldowns[f.id] ?? 0) > now ? 0.4 : 1
        }

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
