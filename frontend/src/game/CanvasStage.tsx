import { useEffect, useRef, useState } from 'react'
import { Application, Assets, Container, Graphics, Text } from 'pixi.js'
import { LOGICAL_W, LOGICAL_H } from './config'
import { initKeyboard } from './input'
import { CombatScene, type CombatState } from './combat/CombatScene'

/**
 * Pixi.js stage. Anchored to a fixed logical height with the width filling the
 * viewport (no side bars). Hosts the Phase 2 combat scene + a screen-space HUD,
 * and shows a win/lose overlay with a restart button.
 */
export default function CanvasStage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CombatScene | null>(null)
  const [result, setResult] = useState<CombatState | null>(null)

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

      // World (scaled, dynamic-width fill).
      const world = new Container()
      pixi.stage.addChild(world)

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

      const layout = () => {
        const scale = pixi.screen.height / LOGICAL_H
        world.scale.set(scale)
        world.position.set(0, 0)
        bounds.w = Math.ceil(pixi.screen.width / scale)
        drawField(bounds.w)
      }
      layout()
      const onOrient = () => window.setTimeout(layout, 200)
      window.addEventListener('resize', layout)
      window.addEventListener('orientationchange', onOrient)
      detachLayout = () => {
        window.removeEventListener('resize', layout)
        window.removeEventListener('orientationchange', onOrient)
      }

      // Player sprite texture (placeholder idle).
      const texture = await Assets.load('/assets/characters/player/male/idle.png')
      texture.source.scaleMode = 'nearest'

      const scene = new CombatScene({
        world,
        texture,
        getW: () => bounds.w,
        onEnd: (s) => setResult(s),
      })
      sceneRef.current = scene

      // Screen-space HUD.
      const hud = new Container()
      pixi.stage.addChild(hud)
      const hpBg = new Graphics()
      const hpFill = new Graphics()
      const info = new Text({
        text: '',
        style: { fill: 0xffffff, fontSize: 13, fontFamily: 'sans-serif' },
      })
      hud.addChild(hpBg, hpFill, info)

      const drawHud = () => {
        const x = 12
        const y = 12
        const w = 180
        const h = 16
        hpBg.clear()
        hpBg.roundRect(x, y, w, h, 3).fill({ color: 0x000000, alpha: 0.5 })
        const frac = Math.max(0, scene.playerHp / scene.playerMaxHp)
        hpFill.clear()
        if (frac > 0) hpFill.roundRect(x + 2, y + 2, (w - 4) * frac, h - 4, 2).fill(0xe74c3c)
        info.position.set(x, y + h + 4)
        info.text = `HP ${Math.ceil(scene.playerHp)}/${scene.playerMaxHp}    敵人剩餘 ${scene.enemyCount}`
      }

      pixi.ticker.add((ticker) => {
        const dt = Math.min(ticker.deltaMS / 1000, 0.05)
        scene.update(dt)
        drawHud()
      })
    })()

    return () => {
      destroyed = true
      detachKeys()
      detachLayout?.()
      sceneRef.current = null
      app?.destroy(true, { children: true })
    }
  }, [])

  const restart = () => {
    sceneRef.current?.reset()
    setResult(null)
  }

  return (
    <div ref={hostRef}>
      {result && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
          }}
        >
          <div style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h2 style={{ color: result === 'win' ? '#2ecc71' : '#e74c3c', fontSize: 40, margin: 0 }}>
              {result === 'win' ? '過關!' : '你死了'}
            </h2>
            <button
              onClick={restart}
              style={{
                marginTop: 16,
                padding: '10px 22px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              再玩一次
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
