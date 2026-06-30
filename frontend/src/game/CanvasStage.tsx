import { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js'
import { LOGICAL_W, LOGICAL_H, PLAYER_SPEED, PLAYER_SIZE } from './config'
import { initKeyboard, getDirection } from './input'

/**
 * Pixi.js stage that renders the world at a fixed logical resolution
 * (LOGICAL_W x LOGICAL_H) and scales it up by an integer factor with
 * letterboxing + nearest-neighbour sampling for crisp pixel art.
 * Phase 1: a walkable top-down player on a grid field.
 */
export default function CanvasStage() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let app: Application | null = null
    let destroyed = false
    let onResize: (() => void) | null = null
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

      // Play field + grid so movement is clearly visible.
      const field = new Graphics()
      field.rect(0, 0, LOGICAL_W, LOGICAL_H).fill('#2e7d32')
      for (let x = 0; x <= LOGICAL_W; x += 16) field.moveTo(x, 0).lineTo(x, LOGICAL_H)
      for (let y = 0; y <= LOGICAL_H; y += 16) field.moveTo(0, y).lineTo(LOGICAL_W, y)
      field.stroke({ color: 0x000000, alpha: 0.08, width: 1 })
      world.addChild(field)

      // Player (placeholder idle sprite).
      const texture = await Assets.load('/assets/characters/player/male/idle.png')
      texture.source.scaleMode = 'nearest'
      const player = new Sprite(texture)
      player.anchor.set(0.5)
      player.setSize(PLAYER_SIZE, PLAYER_SIZE)
      player.position.set(LOGICAL_W / 2, LOGICAL_H / 2)
      world.addChild(player)

      // Integer-scale + center (letterbox) the world to fit the screen.
      const layout = () => {
        const scale = Math.max(
          1,
          Math.floor(Math.min(pixi.screen.width / LOGICAL_W, pixi.screen.height / LOGICAL_H)),
        )
        world.scale.set(scale)
        world.position.set(
          Math.floor((pixi.screen.width - LOGICAL_W * scale) / 2),
          Math.floor((pixi.screen.height - LOGICAL_H * scale) / 2),
        )
      }
      layout()
      onResize = layout
      window.addEventListener('resize', layout)

      const half = PLAYER_SIZE / 2
      pixi.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000
        const dir = getDirection()
        player.x += dir.x * PLAYER_SPEED * dt
        player.y += dir.y * PLAYER_SPEED * dt
        player.x = Math.max(half, Math.min(LOGICAL_W - half, player.x))
        player.y = Math.max(half, Math.min(LOGICAL_H - half, player.y))
      })
    })()

    return () => {
      destroyed = true
      detachKeys()
      if (onResize) window.removeEventListener('resize', onResize)
      app?.destroy(true, { children: true })
    }
  }, [])

  return <div ref={hostRef} />
}
