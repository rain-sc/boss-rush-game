import { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js'
import { LOGICAL_W, LOGICAL_H, PLAYER_SPEED, PLAYER_SIZE } from './config'
import { initKeyboard, getDirection } from './input'

/**
 * Pixi.js stage. Anchored to a fixed logical height (LOGICAL_H) with the width
 * filling the viewport (no side bars); nearest-neighbour sampling keeps pixels
 * crisp. Phase 1: a walkable top-down player on a grid field.
 */
export default function CanvasStage() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let app: Application | null = null
    let destroyed = false
    let detachLayout: (() => void) | null = null
    const detachKeys = initKeyboard()

    ;(async () => {
      const pixi = new Application()
      await pixi.init({ background: '#000000', resizeTo: window, antialias: false })
      if (destroyed) {
        pixi.destroy(true)
        return
      }
      app = pixi
      hostRef.current?.appendChild(pixi.canvas)

      // World container: everything inside is in logical coordinates.
      const world = new Container()
      pixi.stage.addChild(world)

      const half = PLAYER_SIZE / 2
      // Play field + grid. Width is dynamic so the scene fills the screen
      // (anchored to a fixed logical height; no side letterbox bars).
      const bounds = { w: LOGICAL_W }
      const field = new Graphics()
      world.addChild(field)
      const drawField = (w: number) => {
        field.clear()
        field.rect(0, 0, w, LOGICAL_H).fill('#2e7d32')
        for (let x = 0; x <= w; x += 16) field.moveTo(x, 0).lineTo(x, LOGICAL_H)
        for (let y = 0; y <= LOGICAL_H; y += 16) field.moveTo(0, y).lineTo(w, y)
        field.stroke({ color: 0x000000, alpha: 0.08, width: 1 })
      }

      // Player (placeholder idle sprite).
      const texture = await Assets.load('/assets/characters/player/male/idle.png')
      texture.source.scaleMode = 'nearest'
      const player = new Sprite(texture)
      player.anchor.set(0.5)
      player.setSize(PLAYER_SIZE, PLAYER_SIZE)
      player.position.set(LOGICAL_W / 2, LOGICAL_H / 2)
      world.addChild(player)

      // Anchor to the logical height and let the width fill the viewport, so the
      // scene fills the screen with no side black bars. Pixels stay square.
      const layout = () => {
        const scale = pixi.screen.height / LOGICAL_H
        world.scale.set(scale)
        world.position.set(0, 0)
        bounds.w = Math.ceil(pixi.screen.width / scale)
        drawField(bounds.w)
        player.x = Math.min(player.x, bounds.w - half)
      }
      layout()
      // Re-layout on resize and on orientation change. Orientation needs a
      // deferred call because innerWidth/Height settle a tick after the event.
      const onOrient = () => window.setTimeout(layout, 200)
      window.addEventListener('resize', layout)
      window.addEventListener('orientationchange', onOrient)
      detachLayout = () => {
        window.removeEventListener('resize', layout)
        window.removeEventListener('orientationchange', onOrient)
      }

      pixi.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000
        const dir = getDirection()
        player.x += dir.x * PLAYER_SPEED * dt
        player.y += dir.y * PLAYER_SPEED * dt
        player.x = Math.max(half, Math.min(bounds.w - half, player.x))
        player.y = Math.max(half, Math.min(LOGICAL_H - half, player.y))
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
